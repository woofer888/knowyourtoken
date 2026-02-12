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
        
        // Validate required fields
        if (!tokenData.name || !tokenData.symbol || !tokenData.contractAddress) {
          const missing = []
          if (!tokenData.name) missing.push("name")
          if (!tokenData.symbol) missing.push("symbol")
          if (!tokenData.contractAddress) missing.push("contractAddress")
          errorDetails.push(`Token ${mint} missing required fields: ${missing.join(", ")}`)
          errors++
          continue
        }

        // Check if token already exists
        const existing = await prisma.token.findFirst({
          where: {
            contractAddress: mint,
            chain: "Solana",
          },
        })

        if (existing) {
          // Update existing token
          await prisma.token.update({
            where: { id: existing.id },
            data: {
              name: tokenData.name,
              symbol: tokenData.symbol,
              description: tokenData.description || existing.description,
              logoUrl: tokenData.logoUrl || existing.logoUrl,
              twitterUrl: tokenData.twitterUrl || existing.twitterUrl,
              websiteUrl: tokenData.websiteUrl || existing.websiteUrl,
              telegramUrl: tokenData.telegramUrl || existing.telegramUrl,
              isPumpFun: true,
              migrated: true,
              migrationDate: tokenData.migrationDate,
              migrationDex: tokenData.migrationDex,
            },
          })
          updated++
          console.log(`Updated token: ${tokenData.name} (${tokenData.symbol})`)
        } else {
          // Create new token
          await prisma.token.create({
            data: tokenData,
          })
          imported++
          console.log(`Imported token: ${tokenData.name} (${tokenData.symbol})`)
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

