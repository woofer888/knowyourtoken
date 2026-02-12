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

    let imported = 0
    let updated = 0
    let errors = 0
    const errorDetails: string[] = []

    // Process each token (limit to first 50 to avoid timeout)
    const tokensToProcess = graduatedTokens.slice(0, 50)
    
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

        // Try to get name and symbol from the token object directly
        // The graduated tokens endpoint might not have name/symbol, so we'll fetch metadata
        const tokenName = token.name || (token as any).name || ""
        const tokenSymbol = token.symbol || (token as any).symbol || ""
        
        // If we don't have name/symbol, we MUST fetch metadata
        const needsMetadata = !tokenName || !tokenSymbol

        // Fetch detailed metadata (required if we don't have name/symbol)
        let metadata = null
        try {
          metadata = await fetchTokenMetadata(mint)
          if (!metadata) {
            console.warn(`Could not fetch metadata for ${mint}`)
            if (needsMetadata) {
              errorDetails.push(`Token ${mint} missing name/symbol and metadata fetch failed`)
              errors++
              continue
            }
          }
        } catch (err) {
          console.warn(`Error fetching metadata for ${mint}:`, err)
          if (needsMetadata) {
            errorDetails.push(`Token ${mint} missing name/symbol and metadata fetch error`)
            errors++
            continue
          }
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
          published: false,
        }

        // Check if token already exists by contract address
        const existing = await prisma.token.findFirst({
          where: {
            contractAddress: cleanTokenData.contractAddress,
            chain: cleanTokenData.chain,
          },
        })

        if (existing) {
          // Update existing token
          await prisma.token.update({
            where: { id: existing.id },
            data: {
              name: cleanTokenData.name,
              symbol: cleanTokenData.symbol,
              description: cleanTokenData.description || existing.description,
              logoUrl: cleanTokenData.logoUrl || existing.logoUrl,
              twitterUrl: cleanTokenData.twitterUrl || existing.twitterUrl,
              websiteUrl: cleanTokenData.websiteUrl || existing.websiteUrl,
              telegramUrl: cleanTokenData.telegramUrl || existing.telegramUrl,
              isPumpFun: true,
              migrated: true,
              migrationDate: cleanTokenData.migrationDate,
              migrationDex: cleanTokenData.migrationDex,
            },
          })
          updated++
          console.log(`✓ Updated token: ${cleanTokenData.name} (${cleanTokenData.symbol})`)
        } else {
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
              // Slug still conflicts, try with full mint
              cleanTokenData.slug = `token-${mint.substring(0, 16)}`
              try {
                await prisma.token.create({
                  data: cleanTokenData,
                })
                imported++
                console.log(`✓ Imported token with unique slug: ${cleanTokenData.name} (${cleanTokenData.symbol})`)
              } catch (retryError: any) {
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

