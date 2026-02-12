import { NextRequest, NextResponse } from "next/server"

// Map token symbols to CoinGecko IDs
const COINGECKO_IDS: Record<string, string> = {
  BONK: "bonk",
  PEPE: "pepe",
  WIF: "dogwifcoin",
  // Add more as needed
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  const coinId = COINGECKO_IDS[symbol.toUpperCase()]

  if (!coinId) {
    return NextResponse.json(
      { error: "Token not found in CoinGecko" },
      { status: 404 }
    )
  }

  try {
    // Fetch market data from CoinGecko
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
      {
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    )

    if (!response.ok) {
      throw new Error("Failed to fetch market data")
    }

    const data = await response.json()
    const tokenData = data[coinId]

    if (!tokenData) {
      return NextResponse.json(
        { error: "Token data not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      currentPrice: tokenData.usd || 0,
      marketCap: tokenData.usd_market_cap || 0,
      volume24h: tokenData.usd_24h_vol || 0,
      change24h: tokenData.usd_24h_change || 0,
    })
  } catch (error) {
    console.error("Error fetching market data:", error)
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    )
  }
}

