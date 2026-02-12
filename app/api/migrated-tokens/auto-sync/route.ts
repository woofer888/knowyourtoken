import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { executeQuery } from "@/lib/db-query"
import { fetchGraduatedTokens, fetchTokenMetadata, convertPumpFunTokenToDbFormat } from "@/lib/pumpfun-api"

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidate at most once per minute

/**
 * Lightweight auto-sync endpoint
 * Checks for new migrated tokens and imports only new ones
 * Should be called at most once per minute
 */
export async function GET(request: NextRequest) {
  try {
    // First, check if we have ANY migrated tokens at all
    const migratedCount = await prisma.token.count({
      where: {
        migrated: true,
        isPumpFun: true,
      },
    })
    
    // Get the most recent migration date from our database
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

    // Fetch graduated tokens
    const graduatedTokens = await fetchGraduatedTokens()
    
    if (graduatedTokens.length === 0) {
      return NextResponse.json({
        message: "No graduated tokens found",
        imported: 0,
      })
    }

    // Sort by creationTime descending to get newest first
    // Note: For graduated tokens, creationTime might be when token was created, not when it migrated
    // We need to check the actual migration time from the API response
    const sortedTokens = [...graduatedTokens].sort((a, b) => {
      // Try to get migration time, fallback to creation time
      const timeA = (a as any).migrationTime || (a as any).graduatedAt || a.creationTime || (a as any).createdAt || 0
      const timeB = (b as any).migrationTime || (b as any).graduatedAt || b.creationTime || (b as any).createdAt || 0
      return timeB - timeA // Descending order (newest first)
    })

    // Filter to ONLY tokens that migrated AFTER our last one
    // If no previous migrations, import only the most recent token to establish a baseline
    let tokensToProcess: typeof sortedTokens = []
    
    if (lastMigrated?.migrationDate) {
      const lastDate = lastMigrated.migrationDate.getTime() / 1000
      // Use a larger buffer (30 seconds) to account for API timing differences and delays
      const bufferTime = 30
      tokensToProcess = sortedTokens.filter((token) => {
        // Try multiple fields - check for migration time, graduated time, or creation time
        const tokenTime = (token as any).migrationTime || (token as any).graduatedAt || token.creationTime || (token as any).createdAt || 0
        const mint = token.mint || (token as any).coinMint || 'unknown'
        
        // Check for specific tokens the user mentioned
        if (mint.includes('BHnSeK64YVpSyYVxz5GnPVTR2w3bZ1y5vdMPMN1Rpump') || mint.includes('ARkgcXQqVy5Vi1qaKF44piXaV8bUB2vb1phDPDjXpump')) {
          console.log(`🔍 Found user's token ${mint.substring(0, 8)}... - time: ${new Date(tokenTime * 1000).toISOString()} (${tokenTime}), last: ${new Date(lastDate * 1000).toISOString()} (${lastDate}), diff: ${(tokenTime - lastDate).toFixed(1)}s`)
        }
        
        // Only import tokens that migrated AFTER our last one (with buffer for timing)
        const isNewer = tokenTime > (lastDate - bufferTime)
        if (!isNewer && sortedTokens.indexOf(token) < 10) {
          // Log first 10 skipped tokens for debugging
          const timeDiff = lastDate - tokenTime
          console.log(`Skipping token ${mint.substring(0, 8)}... - migration time ${new Date(tokenTime * 1000).toISOString()} (${tokenTime}) is ${timeDiff.toFixed(1)}s before last ${new Date(lastDate * 1000).toISOString()} (${lastDate})`)
        }
        return isNewer
      })
      console.log(`Filtered to ${tokensToProcess.length} new tokens (after ${new Date((lastDate - bufferTime) * 1000).toISOString()})`)
      console.log(`Last migrated token in DB: ${lastMigrated.migrationDate.toISOString()} (timestamp: ${lastDate})`)
      if (sortedTokens.length > 0) {
        const firstTokenTime = (sortedTokens[0] as any).migrationTime || (sortedTokens[0] as any).graduatedAt || sortedTokens[0].creationTime || (sortedTokens[0] as any).createdAt || 0
        const firstMint = sortedTokens[0].mint || (sortedTokens[0] as any).coinMint || 'unknown'
        const timeDiff = firstTokenTime - lastDate
        console.log(`Newest token from API: ${firstMint.substring(0, 8)}... at ${new Date(firstTokenTime * 1000).toISOString()} (timestamp: ${firstTokenTime}) - ${timeDiff > 0 ? `${timeDiff.toFixed(1)}s newer` : `${Math.abs(timeDiff).toFixed(1)}s older`} than last`)
      }
    } else {
      // If no previous migrations, DO NOT import anything automatically
      // User must manually use "Sync All Migrated" to establish a baseline
      // This prevents importing old tokens on every refresh
      console.log(`No previous migrations found (count: ${migratedCount}) - skipping auto-import to prevent old tokens. Use 'Sync All Migrated' button to manually import a baseline.`)
      return NextResponse.json({
        message: "No previous migrations found. Use 'Sync All Migrated' button in admin dashboard to manually import a baseline. After that, new migrations will be imported automatically.",
        imported: 0,
        checked: graduatedTokens.length,
        new: 0,
      })
    }

    // Limit to 20 max per sync to avoid timeout
    tokensToProcess = tokensToProcess.slice(0, 20)

    if (tokensToProcess.length === 0) {
      return NextResponse.json({
        message: "No new tokens to import",
        imported: 0,
      })
    }

    let imported = 0
    let errors = 0
    let skippedExisting = 0
    let skippedTooOld = 0

    console.log(`Processing ${tokensToProcess.length} tokens to import...`)

    for (const token of tokensToProcess) {
      try {
        // Handle different response formats - API returns 'coinMint'
        const mint = token.mint || (token as any).coinMint || (token as any).address || (token as any).mintAddress
        
        if (!mint) {
          errors++
          errorDetails.push(`Token missing mint address`)
          continue
        }

        // Log which token we're processing
        console.log(`Processing token: ${mint.substring(0, 8)}... (full: ${mint})`)
        
        // Note: If token is in graduated list, it should be valid
        // Don't be too strict with address pattern - just log a warning
        const isPumpFunAddress = 
          mint.toLowerCase().includes('pump') || // Has "pump" in address
          mint.length === 44 // Standard Solana address length
        
        if (!isPumpFunAddress) {
          console.log(`Warning: ${mint.substring(0, 8)}... - address doesn't match PumpFun pattern, but continuing since it's in graduated list`)
        }

        // Check if already exists by contract address (prevent duplicates)
        const existing = await executeQuery(() =>
          prisma.token.findFirst({
            where: {
              contractAddress: mint,
              chain: "Solana",
            },
          })
        )

        if (existing) {
          console.log(`Skipping ${mint.substring(0, 8)}... - already exists in database`)
          skippedExisting++
          continue // Skip if already exists - prevent duplicates
        }
        
        // Log which token we're processing
        console.log(`Processing token: ${mint.substring(0, 8)}... (full: ${mint})`)

        // Get the actual migration time from the token BEFORE fetching metadata
        // This is critical - we need to use the time from the graduated tokens list, not metadata
        const tokenMigrationTime = (token as any).migrationTime || (token as any).graduatedAt || token.creationTime || (token as any).createdAt || 0
        let migrationDate: Date
        if (tokenMigrationTime && tokenMigrationTime > 0) {
          // Convert from seconds to Date
          migrationDate = new Date(tokenMigrationTime * 1000)
        } else {
          // Fallback to current time if no migration time found
          migrationDate = new Date()
        }
        
        // CRITICAL: Double-check that this token is newer than our last one
        // This prevents importing old tokens even if they passed the initial filter
        // Use same buffer (30 seconds) as the initial filter
        if (lastMigrated?.migrationDate) {
          const lastDate = lastMigrated.migrationDate.getTime() / 1000
          const thisDate = migrationDate.getTime() / 1000
          const bufferTime = 30
          if (thisDate <= (lastDate - bufferTime)) {
            const timeDiff = lastDate - thisDate
            console.log(`Skipping ${mint.substring(0, 8)}... - migration date ${migrationDate.toISOString()} (${thisDate}) is ${timeDiff.toFixed(1)}s before last migrated ${lastMigrated.migrationDate.toISOString()} (${lastDate})`)
            skippedTooOld++
            continue
          }
        }
        
        // CRITICAL: Verify this token actually migrated from PumpFun
        // First check: token must have creationTime from PumpFun
        if (!token.creationTime || token.creationTime <= 0) {
          console.log(`Skipping ${mint.substring(0, 8)}... - token missing creationTime from PumpFun`)
          errors++
          errorDetails.push(`${mint.substring(0, 8)}... - missing creationTime`)
          continue
        }
        
        // IMPORTANT: If token is in /coins/graduated endpoint, it IS migrated
        // No need to check completion status - being in graduated list is proof
        console.log(`Processing token ${mint.substring(0, 8)}... from graduated list (migrated)`)
        
        // Fetch metadata from PumpFun API to get full token details
        const metadata = await fetchTokenMetadata(mint)
        
        if (!metadata) {
          console.log(`Warning: ${mint.substring(0, 8)}... - metadata not found, but continuing since it's in graduated list`)
          // Don't skip - token is in graduated list, so it's migrated
        }
        
        // Log token details for debugging
        console.log(`✓ Validating token ${mint.substring(0, 8)}... - has metadata: ${!!metadata}, address: ${mint}`)
        
        const tokenData = convertPumpFunTokenToDbFormat(
          metadata || token,
          "PumpSwap"
        )
        
        // Ensure contractAddress is set
        tokenData.contractAddress = mint
        if (!tokenData.chain) {
          tokenData.chain = "Solana"
        }
        
        // Clean and validate data (same as sync route)
        // Use the migration date we extracted from the token, not from tokenData
        const cleanTokenData = {
          name: (tokenData.name || `Token ${mint.substring(0, 8)}`).trim(),
          symbol: (tokenData.symbol || "UNKNOWN").trim(),
          slug: (tokenData.slug || `token-${mint.substring(0, 16)}`).trim(),
          contractAddress: mint.trim(),
          chain: (tokenData.chain || "Solana").trim(),
          description: tokenData.description || null,
          lore: null,
          originStory: null,
          logoUrl: tokenData.logoUrl || null,
          twitterUrl: tokenData.twitterUrl || null,
          telegramUrl: tokenData.telegramUrl || null,
          websiteUrl: tokenData.websiteUrl || null,
          isPumpFun: true,
          migrated: true,
          migrationDate: migrationDate, // Use the actual migration time from the token, not from metadata
          migrationDex: tokenData.migrationDex || "PumpSwap",
          published: true, // Auto-publish migrated tokens
        }
        
        // Check if slug exists and make it unique if needed
        const slugExists = await executeQuery(() =>
          prisma.token.findUnique({
            where: { slug: cleanTokenData.slug },
          })
        )
        
        if (slugExists) {
          cleanTokenData.slug = `${cleanTokenData.slug}-${mint.substring(0, 8)}`
        }

        // Create new token
        try {
          await executeQuery(() =>
            prisma.token.create({
              data: cleanTokenData,
            })
          )
          imported++
          console.log(`✓ Auto-imported: ${cleanTokenData.name} (${cleanTokenData.symbol}) - ${mint.substring(0, 8)}...`)
        } catch (createError: any) {
          if (createError.code === 'P2002') {
            // Check if it's a duplicate contract address
            if (createError.meta?.target?.includes('contractAddress')) {
              console.log(`Skipping ${mint} - duplicate contract address (already exists)`)
              continue
            }
            // Slug conflict, try with unique slug
            cleanTokenData.slug = `token-${mint.substring(0, 16)}`
            try {
              await executeQuery(() =>
                prisma.token.create({
                  data: cleanTokenData,
                })
              )
              imported++
              console.log(`✓ Auto-imported with unique slug: ${cleanTokenData.name}`)
            } catch (retryError: any) {
              // If still fails due to duplicate contract, skip it
              if (retryError.code === 'P2002' && retryError.meta?.target?.includes('contractAddress')) {
                console.log(`Skipping ${mint} - duplicate contract address (retry failed)`)
                continue
              }
              console.error(`Error creating token ${mint} (retry):`, retryError)
              errors++
            }
          } else {
            console.error(`Error creating token ${mint}:`, createError)
            errors++
          }
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const mint = token.mint || (token as any).coinMint || 'unknown'
        console.error(`Error importing token ${mint.substring(0, 8)}...:`, errorMsg)
        console.error(`Full error:`, error)
        errors++
        errorDetails.push(`${mint.substring(0, 8)}... - ${errorMsg.substring(0, 100)}`)
      }
    }

    return NextResponse.json({
      message: imported > 0 
        ? `Auto-sync completed: imported ${imported} tokens` 
        : `Auto-sync completed: found ${tokensToProcess.length} new tokens but imported 0 (${skippedExisting} already exist, ${skippedTooOld} too old, ${errors} errors)`,
      imported,
      errors,
      checked: graduatedTokens.length,
      new: tokensToProcess.length,
      skippedExisting,
      skippedTooOld,
      errorDetails: errorDetails ? errorDetails.slice(0, 5) : [], // Return first 5 errors for debugging
    })
  } catch (error) {
    console.error("Error in auto-sync:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error("Auto-sync error details:", { errorMessage, errorStack })
    return NextResponse.json(
      { 
        error: "Auto-sync failed",
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}

