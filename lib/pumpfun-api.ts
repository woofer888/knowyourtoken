// PumpFun API integration for fetching graduated/migrated tokens

export interface PumpFunGraduatedToken {
  mint: string
  name: string
  symbol: string
  uri: string
  description: string
  imageUri: string
  metadata: {
    name: string
    symbol: string
    description: string
    image: string
    attributes?: Array<{ trait_type: string; value: string }>
  }
  twitter?: string
  telegram?: string
  website?: string
  creationTime: number
  complete: boolean
  curveComplete: boolean
  marketCap?: number
  usdMarketCap?: number
}

export interface PumpFunTokenMetadata {
  mint: string
  name: string
  symbol: string
  description: string
  imageUri: string
  twitter?: string
  telegram?: string
  website?: string
  metadata: {
    name: string
    symbol: string
    description: string
    image: string
    attributes?: Array<{ trait_type: string; value: string }>
  }
}

/**
 * Fetch list of graduated/migrated tokens from PumpFun
 */
export async function fetchGraduatedTokens(): Promise<PumpFunGraduatedToken[]> {
  try {
    const response = await fetch(
      "https://advanced-api-v2.pump.fun/coins/graduated?sortBy=creationTime",
      {
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    )

    if (!response.ok) {
      throw new Error(`PumpFun API error: ${response.status}`)
    }

    const data = await response.json()
    return data || []
  } catch (error) {
    console.error("Error fetching graduated tokens from PumpFun:", error)
    return []
  }
}

/**
 * Fetch detailed metadata for a specific token by mint address
 */
export async function fetchTokenMetadata(
  mint: string
): Promise<PumpFunTokenMetadata | null> {
  try {
    const response = await fetch(
      `https://frontend-api-v3.pump.fun/coins/${mint}`,
      {
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error fetching metadata for token ${mint}:`, error)
    return null
  }
}

/**
 * Convert PumpFun token data to our database format
 */
export function convertPumpFunTokenToDbFormat(
  token: PumpFunGraduatedToken | PumpFunTokenMetadata,
  migrationDex: string = "PumpSwap"
) {
  const metadata = "metadata" in token ? token.metadata : null
  
  return {
    name: token.name || metadata?.name || "",
    symbol: token.symbol || metadata?.symbol || "",
    slug: (token.name || metadata?.name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    contractAddress: "mint" in token ? token.mint : "",
    chain: "Solana",
    description: token.description || metadata?.description || null,
    logoUrl: token.imageUri || metadata?.image || null,
    twitterUrl: token.twitter || null,
    telegramUrl: token.telegram || null,
    websiteUrl: token.website || null,
    isPumpFun: true,
    migrated: true,
    migrationDate: "creationTime" in token && token.creationTime
      ? new Date(token.creationTime * 1000)
      : new Date(),
    migrationDex: migrationDex,
    published: false, // Start as draft for review
  }
}

