import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fetchGraduatedTokens, fetchTokenMetadata, convertPumpFunTokenToDbFormat } from "@/lib/pumpfun-api"

/**
 * Sync all graduated/migrated tokens from PumpFun
 * This endpoint can be called periodically (via cron job or manually)
 */
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log("Starting sync of graduated tokens...")
    
    // Get the most recent migration date from our database
    // Only import tokens that migrated AFTER the last one we have
    const lastMigrated = await prisma.token.findFirst({
      where: {
        migrated: true,
        isPumpFun: true,
      },
      orderBy: {
        migrationDate: "desc",
      },
      select: {
        migrationDate: true,
      },
    })
    
    // Fetch all graduated tokens from PumpFun
    const graduatedTokens = await fetchGraduatedTokens()

    console.log(`Found ${graduatedTokens.length} graduated tokens`)

    if (graduatedTokens.length === 0) {
      return NextResponse.json({
        message: "No graduated tokens found",
        imported: 0,
        updated: 0,
      })
    }

    // Sort by migration time descending to get newest first
    // Note: For graduated tokens, we need the actual migration time, not creation time
    const sortedTokens = [...graduatedTokens].sort((a, b) => {
      // Try to get migration time, fallback to creation time
      const timeA = (a as any).migrationTime || (a as any).graduatedAt || a.creationTime || (a as any).createdAt || 0
      const timeB = (b as any).migrationTime || (b as any).graduatedAt || b.creationTime || (b as any).createdAt || 0
      return timeB - timeA // Descending order (newest first)
    })

    // Filter to ONLY tokens that migrated AFTER our last one
    // NO old tokens - only import if we have a last migration date to compare against
    let tokensToProcess: typeof sortedTokens = []
    
    if (lastMigrated?.migrationDate) {
      const lastDate = lastMigrated.migrationDate.getTime() / 1000
      // Use a small buffer (10 seconds) to account for timing differences and API delays
      const bufferTime = 10
      tokensToProcess = sortedTokens.filter((token) => {
        // Try multiple fields - check for migration time, graduated time, or creation time
        const tokenTime = (token as any).migrationTime || (token as any).graduatedAt || token.creationTime || (token as any).createdAt || 0
        // Only import tokens that migrated AFTER our last one (with small buffer)
        const isNewer = tokenTime > (lastDate - bufferTime)
        if (!isNewer && sortedTokens.indexOf(token) < 3) {
          // Log first few skipped tokens for debugging
          console.log(`Skipping token - migration time ${new Date(tokenTime * 1000).toISOString()} is not after ${new Date((lastDate - bufferTime) * 1000).toISOString()}`)
        }
        return isNewer
      })
      console.log(`Filtered to ${tokensToProcess.length} new tokens (after ${new Date((lastDate - bufferTime) * 1000).toISOString()})`)
      console.log(`Last migrated token in DB: ${new Date(lastDate * 1000).toISOString()}`)
      if (sortedTokens.length > 0) {
        const firstTokenTime = (sortedTokens[0] as any).migrationTime || (sortedTokens[0] as any).graduatedAt || sortedTokens[0].creationTime || (sortedTokens[0] as any).createdAt || 0
        console.log(`Newest token from API: ${new Date(firstTokenTime * 1000).toISOString()}`)
      }
    } else {
      // If no previous migrations, only import tokens that migrated VERY recently (last 1 minute)
      // This prevents importing old historical tokens while allowing truly new ones to be imported
      const oneMinuteAgo = Math.floor((Date.now() - 1 * 60 * 1000) / 1000) // 1 minute ago in seconds
      
      tokensToProcess = sortedTokens.filter((token) => {
        const tokenTime = (token as any).migrationTime || (token as any).graduatedAt || token.creationTime || (token as any).createdAt || 0
        // Only import tokens that migrated in the last 1 minute
        return tokenTime > oneMinuteAgo
      })
      
      if (tokensToProcess.length === 0) {
        console.log("No previous migrations found and no tokens migrated in the last 1 minute")
        return NextResponse.json({
          message: "No previous migrations found. Only tokens migrated in the last 1 minute will be imported. This prevents importing old historical tokens.",
          imported: 0,
          updated: 0,
          errors: 0,
          total: graduatedTokens.length,
          processed: 0,
        })
      }
      
      // Limit to 1 most recent token when establishing baseline (manual sync allows more)
      tokensToProcess = tokensToProcess.slice(0, 1)
      const firstTokenTime = (tokensToProcess[0] as any).migrationTime || (tokensToProcess[0] as any).graduatedAt || tokensToProcess[0].creationTime || (tokensToProcess[0] as any).createdAt || 0
      console.log(`No previous migrations found - importing 1 most recent token (migrated in last 1 minute) to establish baseline. Migration time: ${new Date(firstTokenTime * 1000).toISOString()}`)
    }
    
    // Limit to 20 max per sync
    tokensToProcess = tokensToProcess.slice(0, 20)

    let imported = 0
    let updated = 0
    let errors = 0
    const errorDetails: string[] = []
    
    for (const token of tokensToProcess) {
      try {
        // Handle different response formats from PumpFun API
        // The API returns 'coinMint' not 'mint'
        const mint = token.mint || (token as any).coinMint || (token as any).address || (token as any).mintAddress
        
        if (!mint) {
          console.warn("Token missing mint address:", JSON.stringify(token, null, 2))
          errorDetails.push(`Missing mint address for token: ${JSON.stringify(token).substring(0, 100)}`)
          errors++
          continue
        }
        
        // Log which token we're processing
        console.log(`Processing token: ${mint.substring(0, 8)}... (full: ${mint})`)
        
        // CRITICAL: Verify the mint address looks like a PumpFun token
        // PumpFun tokens typically have "pump" in the address or specific patterns
        // But don't be too strict - if it's in the graduated list, it should be valid
        const isPumpFunAddress = 
          mint.toLowerCase().includes('pump') || // Has "pump" in address
          mint.length === 44 // Standard Solana address length
        
        if (!isPumpFunAddress) {
          console.log(`Warning: ${mint.substring(0, 8)}... - address doesn't match PumpFun pattern, but continuing since it's in graduated list`)
          // Don't skip - if it's in the graduated list, it should be valid
          // Just log a warning
        }

        // Try to get name and symbol from the token object directly
        // The graduated tokens endpoint might not have name/symbol, so we'll fetch metadata
        const tokenName = token.name || (token as any).name || ""
        const tokenSymbol = token.symbol || (token as any).symbol || ""
        
        // If we don't have name/symbol, we MUST fetch metadata
        const needsMetadata = !tokenName || !tokenSymbol

        // CRITICAL: Verify this token actually migrated from PumpFun
        // First check: token must have creationTime from PumpFun
        if (!token.creationTime || token.creationTime <= 0) {
          console.log(`Skipping ${mint.substring(0, 8)}... - token missing creationTime from PumpFun`)
          continue
        }
        
        // Second check: Try to fetch metadata from PumpFun API
        // If the token doesn't exist on PumpFun, it never migrated from there
        let metadata = null
        try {
          metadata = await fetchTokenMetadata(mint)
          if (!metadata) {
            console.log(`Skipping ${mint.substring(0, 8)}... - token not found in PumpFun API (may have launched directly on Jupiter)`)
            if (needsMetadata) {
              errorDetails.push(`Token ${mint} not found in PumpFun API - may not have migrated`)
              errors++
            }
            continue
          }
          
          // Third check: Verify the token actually exists and has valid PumpFun data
          const metadataMint = metadata.mint || (metadata as any).mint || (metadata as any).coinMint
          if (metadataMint && metadataMint !== mint) {
            console.log(`Skipping ${mint.substring(0, 8)}... - metadata mint mismatch`)
            continue
          }
          
          // Fourth check: Verify token has completion status from PumpFun bonding curve
          const hasCompletionStatus = 
            (token as any).complete === true || 
            (token as any).curveComplete === true ||
            (metadata as any).complete === true ||
            (metadata as any).curveComplete === true
          
          // If no completion status, check if it's a very recent token
          const tokenAge = Date.now() / 1000 - token.creationTime
          const isRecent = tokenAge < 3600 // Less than 1 hour old
          
          // For tokens without completion status, be more lenient
          // If it's in the graduated list and has metadata from PumpFun, it's likely valid
          if (!hasCompletionStatus) {
            // Only skip if it's old AND doesn't have "pump" in address
            if (!isRecent && !mint.toLowerCase().includes('pump')) {
              console.log(`Skipping ${mint.substring(0, 8)}... - token has no completion status, is not recent (age: ${Math.floor(tokenAge / 3600)}h), and no "pump" in address - may not have migrated from PumpFun`)
              continue
            }
            // If it has "pump" in address OR is recent, allow it
            console.log(`Allowing ${mint.substring(0, 8)}... - no completion status but ${isRecent ? 'recent' : 'has "pump" in address'}`)
          }
        } catch (err) {
          console.warn(`Error fetching metadata for ${mint}:`, err)
          // If we can't fetch metadata and we need it, skip
          if (needsMetadata) {
            errorDetails.push(`Token ${mint} metadata fetch error - may not have migrated`)
            errors++
            continue
          }
          // If we don't need metadata, still skip to be safe
          console.log(`Skipping ${mint.substring(0, 8)}... - error fetching metadata from PumpFun`)
          continue
        }
        
        // Use metadata if available (it has more complete data), otherwise use token data
        const sourceData = metadata || token
        const tokenData = convertPumpFunTokenToDbFormat(sourceData, "PumpSwap")
        
        // Make sure we use the correct mint address
        tokenData.contractAddress = mint
        
        // Ensure chain is set (required field)
        if (!tokenData.chain) {
          tokenData.chain = "Solana"
        }
        
        // Validate required fields with detailed checks
        const validationErrors: string[] = []
        if (!tokenData.name || typeof tokenData.name !== 'string' || tokenData.name.trim() === '') {
          validationErrors.push("name (empty or invalid)")
        }
        if (!tokenData.symbol || typeof tokenData.symbol !== 'string' || tokenData.symbol.trim() === '') {
          validationErrors.push("symbol (empty or invalid)")
        }
        if (!tokenData.contractAddress || typeof tokenData.contractAddress !== 'string' || tokenData.contractAddress.trim() === '') {
          validationErrors.push("contractAddress (empty or invalid)")
        }
        if (!tokenData.slug || typeof tokenData.slug !== 'string' || tokenData.slug.trim() === '') {
          validationErrors.push("slug (empty or invalid)")
        }
        if (!tokenData.chain || typeof tokenData.chain !== 'string' || tokenData.chain.trim() === '') {
          validationErrors.push("chain (empty or invalid)")
        }
        
        if (validationErrors.length > 0) {
          errorDetails.push(`Token ${mint} validation failed: ${validationErrors.join(", ")}`)
          errors++
          continue
        }
        
        // Clean up the data - ensure no undefined values that Prisma doesn't like
        const cleanTokenData = {
          name: tokenData.name.trim(),
          symbol: tokenData.symbol.trim(),
          slug: tokenData.slug.trim(),
          contractAddress: tokenData.contractAddress.trim(),
          chain: tokenData.chain.trim(),
          description: tokenData.description || null,
          lore: null,
          originStory: null,
          logoUrl: tokenData.logoUrl || null,
          twitterUrl: tokenData.twitterUrl || null,
          telegramUrl: tokenData.telegramUrl || null,
          websiteUrl: tokenData.websiteUrl || null,
          isPumpFun: true,
          migrated: true,
          migrationDate: tokenData.migrationDate || new Date(),
          migrationDex: tokenData.migrationDex || "PumpSwap",
          published: true, // Auto-publish migrated tokens
        }

        // Check if token already exists by contract address
        const existing = await prisma.token.findFirst({
          where: {
            contractAddress: cleanTokenData.contractAddress,
            chain: cleanTokenData.chain,
          },
        })

        if (existing) {
          // Skip if already exists - prevent duplicates
          console.log(`Skipping ${cleanTokenData.contractAddress} - already exists in database (preventing duplicate)`)
          continue
        }
        
        // Token doesn't exist, create it
        {
          // Check if slug already exists (might be a different token with same name)
          const slugExists = await prisma.token.findUnique({
            where: { slug: cleanTokenData.slug },
          })
          
          if (slugExists) {
            // Generate unique slug by appending mint suffix
            cleanTokenData.slug = `${cleanTokenData.slug}-${mint.substring(0, 8)}`
          }
          
          // Create new token
          try {
            // Log the data we're trying to create for debugging
            console.log(`Creating token:`, {
              name: cleanTokenData.name,
              symbol: cleanTokenData.symbol,
              slug: cleanTokenData.slug,
              contractAddress: cleanTokenData.contractAddress,
              chain: cleanTokenData.chain,
            })
            
            await prisma.token.create({
              data: cleanTokenData,
            })
            imported++
            console.log(`✓ Imported token: ${cleanTokenData.name} (${cleanTokenData.symbol})`)
          } catch (createError: any) {
            // Log full error for debugging
            console.error(`✗ Error creating token ${mint}:`, {
              error: createError.message,
              code: createError.code,
              meta: createError.meta,
              attemptedData: cleanTokenData,
            })
            
            // Handle unique constraint errors
            if (createError.code === 'P2002') {
              // Check if it's a duplicate contract address
              if (createError.meta?.target?.includes('contractAddress')) {
                console.log(`Token ${mint} already exists (duplicate contract address) - skipping`)
                continue
              }
              // Slug still conflicts, try with full mint
              cleanTokenData.slug = `token-${mint.substring(0, 16)}`
              try {
                await prisma.token.create({
                  data: cleanTokenData,
                })
                imported++
                console.log(`✓ Imported token with unique slug: ${cleanTokenData.name} (${cleanTokenData.symbol})`)
              } catch (retryError: any) {
                // If still fails due to duplicate contract, skip it
                if (retryError.code === 'P2002' && retryError.meta?.target?.includes('contractAddress')) {
                  console.log(`Token ${mint} already exists - skipping duplicate`)
                  continue
                }
                errorDetails.push(`Failed to create ${cleanTokenData.name}: ${retryError.message}`)
                errors++
              }
            } else {
              // Other validation errors - show full error message
              const errorMsg = createError.message || 'Unknown error'
              errorDetails.push(`Failed to create ${cleanTokenData.name}: ${errorMsg}`)
              errors++
            }
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`Error processing token:`, error)
        errorDetails.push(`${errorMsg.substring(0, 100)}`)
        errors++
      }
    }

    return NextResponse.json({
      message: "Sync completed",
      imported,
      updated,
      errors,
      total: graduatedTokens.length,
      processed: tokensToProcess.length,
      errorDetails: errorDetails.slice(0, 5), // Return first 5 errors
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error("Error syncing migrated tokens:", error)
    return NextResponse.json(
      { 
        error: "Failed to sync migrated tokens",
        details: errorMsg 
      },
      { status: 500 }
    )
  }
}

