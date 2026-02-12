import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fetchTokenData } from "@/lib/token-data-fetcher"

/**
 * Import a migrated token by contract address
 * Fetches token data automatically and creates/updates the token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contractAddress, chain = "Solana", migrationDex = "PumpSwap" } = body

    if (!contractAddress) {
      return NextResponse.json(
        { error: "Contract address is required" },
        { status: 400 }
      )
    }

    // Check if token already exists
    const existing = await prisma.token.findFirst({
      where: {
        contractAddress: contractAddress,
        chain: chain,
      },
    })

    // Fetch token data from APIs
    const tokenData = await fetchTokenData(contractAddress, chain)

    if (!tokenData) {
      return NextResponse.json(
        { error: "Could not fetch token data. Please add manually." },
        { status: 404 }
      )
    }

    // Generate slug from name
    const slug = tokenData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    if (existing) {
      // Update existing token
      const updated = await prisma.token.update({
        where: { id: existing.id },
        data: {
          name: tokenData.name,
          symbol: tokenData.symbol,
          logoUrl: tokenData.logoUrl || existing.logoUrl,
          twitterUrl: tokenData.twitterUrl || existing.twitterUrl,
          websiteUrl: tokenData.websiteUrl || existing.websiteUrl,
          telegramUrl: tokenData.telegramUrl || existing.telegramUrl,
          isPumpFun: true,
          migrated: true,
          migrationDate: new Date(),
          migrationDex: migrationDex,
        },
      })

      return NextResponse.json({
        message: "Token updated",
        token: updated,
      })
    } else {
      // Create new token
      const newToken = await prisma.token.create({
        data: {
          name: tokenData.name,
          symbol: tokenData.symbol,
          slug: slug,
          description: tokenData.description,
          contractAddress: contractAddress,
          chain: chain,
          logoUrl: tokenData.logoUrl,
          twitterUrl: tokenData.twitterUrl,
          websiteUrl: tokenData.websiteUrl,
          telegramUrl: tokenData.telegramUrl,
          isPumpFun: true,
          migrated: true,
          migrationDate: new Date(),
          migrationDex: migrationDex,
          published: false, // Start as draft for review
        },
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

