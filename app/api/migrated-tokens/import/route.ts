import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fetchTokenMetadata, convertPumpFunTokenToDbFormat } from "@/lib/pumpfun-api"

/**
 * Import a migrated token by contract address (mint)
 * Fetches token data from PumpFun API automatically
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contractAddress, migrationDex = "PumpSwap" } = body

    if (!contractAddress) {
      return NextResponse.json(
        { error: "Contract address (mint) is required" },
        { status: 400 }
      )
    }

    // Check if token already exists
    const existing = await prisma.token.findFirst({
      where: {
        contractAddress: contractAddress,
        chain: "Solana",
      },
    })

    // Fetch token metadata from PumpFun API
    const pumpfunData = await fetchTokenMetadata(contractAddress)

    if (!pumpfunData) {
      return NextResponse.json(
        { error: "Could not fetch token data from PumpFun. Please check the contract address." },
        { status: 404 }
      )
    }

    // Convert to database format
    const tokenData = convertPumpFunTokenToDbFormat(pumpfunData, migrationDex)

    if (existing) {
      // Update existing token
      const updated = await prisma.token.update({
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
          migrationDex: migrationDex,
        },
      })

      return NextResponse.json({
        message: "Token updated successfully",
        token: updated,
      })
    } else {
      // Create new token
      const newToken = await prisma.token.create({
        data: tokenData,
      })

      return NextResponse.json({
        message: "Token imported successfully",
        token: newToken,
      })
    }
  } catch (error) {
    console.error("Error importing migrated token:", error)
    return NextResponse.json(
      { error: "Failed to import token" },
      { status: 500 }
    )
  }
}

