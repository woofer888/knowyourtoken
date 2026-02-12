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
        const mint = token.mint || (token as any).address
        
        if (!mint) {
          console.warn("Token missing mint address:", token)
          errors++
          continue
        }

        // Fetch detailed metadata
        const metadata = await fetchTokenMetadata(mint)
        
        if (!metadata) {
          // Try using the token data directly if metadata fetch fails
          const tokenData = convertPumpFunTokenToDbFormat(token, "PumpSwap")
          
          // Check if token already exists
          const existing = await prisma.token.findFirst({
            where: {
              contractAddress: mint,
              chain: "Solana",
            },
          })

          if (existing) {
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
          } else {
            await prisma.token.create({
              data: tokenData,
            })
            imported++
          }
        } else {
          // Use fetched metadata
          const tokenData = convertPumpFunTokenToDbFormat(metadata, "PumpSwap")

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
          } else {
            // Create new token
            await prisma.token.create({
              data: tokenData,
            })
            imported++
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`Error processing token:`, error)
        errorDetails.push(errorMsg)
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

