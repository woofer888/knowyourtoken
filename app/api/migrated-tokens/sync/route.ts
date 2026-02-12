import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fetchGraduatedTokens, fetchTokenMetadata, convertPumpFunTokenToDbFormat } from "@/lib/pumpfun-api"

/**
 * Sync all graduated/migrated tokens from PumpFun
 * This endpoint can be called periodically (via cron job or manually)
 */
export async function POST(request: NextRequest) {
  try {
    // Fetch all graduated tokens from PumpFun
    const graduatedTokens = await fetchGraduatedTokens()

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

    // Process each token
    for (const token of graduatedTokens) {
      try {
        // Fetch detailed metadata
        const metadata = await fetchTokenMetadata(token.mint)
        
        if (!metadata) {
          console.warn(`Could not fetch metadata for ${token.mint}`)
          errors++
          continue
        }

        // Check if token already exists
        const existing = await prisma.token.findFirst({
          where: {
            contractAddress: token.mint,
            chain: "Solana",
          },
        })

        const tokenData = convertPumpFunTokenToDbFormat(metadata, "PumpSwap")

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

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Error processing token ${token.mint}:`, error)
        errors++
      }
    }

    return NextResponse.json({
      message: "Sync completed",
      imported,
      updated,
      errors,
      total: graduatedTokens.length,
    })
  } catch (error) {
    console.error("Error syncing migrated tokens:", error)
    return NextResponse.json(
      { error: "Failed to sync migrated tokens" },
      { status: 500 }
    )
  }
}

