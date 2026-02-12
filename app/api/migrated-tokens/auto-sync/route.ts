import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
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

    // Filter to only new tokens (if we have a last migration date)
    let tokensToProcess = graduatedTokens
    if (lastMigrated?.migrationDate) {
      const lastDate = lastMigrated.migrationDate.getTime() / 1000
      tokensToProcess = graduatedTokens.filter((token) => {
        const tokenTime = token.creationTime || (token as any).createdAt
        return tokenTime > lastDate
      })
    }

    // Limit to 10 new tokens per sync to avoid timeout
    tokensToProcess = tokensToProcess.slice(0, 10)

    if (tokensToProcess.length === 0) {
      return NextResponse.json({
        message: "No new tokens to import",
        imported: 0,
      })
    }

    let imported = 0
    let errors = 0

    for (const token of tokensToProcess) {
      try {
        // Handle different response formats - API returns 'coinMint'
        const mint = token.mint || (token as any).coinMint || (token as any).address || (token as any).mintAddress
        
        if (!mint) {
          errors++
          continue
        }

        // Check if already exists
        const existing = await prisma.token.findFirst({
          where: {
            contractAddress: mint,
            chain: "Solana",
          },
        })

        if (existing) {
          continue // Skip if already exists
        }

        // Fetch metadata
        const metadata = await fetchTokenMetadata(mint)
        const tokenData = convertPumpFunTokenToDbFormat(
          metadata || token,
          "PumpSwap"
        )

        // Create new token
        await prisma.token.create({
          data: tokenData,
        })
        imported++

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`Error importing token:`, error)
        errors++
      }
    }

    return NextResponse.json({
      message: "Auto-sync completed",
      imported,
      errors,
      checked: graduatedTokens.length,
      new: tokensToProcess.length,
    })
  } catch (error) {
    console.error("Error in auto-sync:", error)
    return NextResponse.json(
      { error: "Auto-sync failed" },
      { status: 500 }
    )
  }
}

