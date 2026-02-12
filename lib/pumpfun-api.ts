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
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        cache: "no-store", // Always fetch fresh data
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`PumpFun API error: ${response.status} - ${errorText}`)
      throw new Error(`PumpFun API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return data
    } else if (data?.data && Array.isArray(data.data)) {
      return data.data
    } else if (data?.coins && Array.isArray(data.coins)) {
      return data.coins
    }
    
    console.warn("Unexpected response format from PumpFun API:", data)
    return []
  } catch (error) {
    console.error("Error fetching graduated tokens from PumpFun:", error)
    throw error // Re-throw to let caller handle
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
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      console.warn(`Failed to fetch metadata for ${mint}: ${response.status}`)
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
  token: PumpFunGraduatedToken | PumpFunTokenMetadata | any,
  migrationDex: string = "PumpSwap"
) {
  // Handle different response formats
  const metadata = token.metadata || null
  const mint = token.mint || token.mintAddress || token.address || ""
  
  // Extract name and symbol from various possible locations
  const name = token.name || metadata?.name || (token as any).name || ""
  const symbol = token.symbol || metadata?.symbol || (token as any).symbol || ""
  const description = token.description || metadata?.description || null
  const imageUri = token.imageUri || metadata?.image || token.image || null
  
  // Extract social links
  const twitter = token.twitter || (token as any).twitterUrl || null
  const telegram = token.telegram || (token as any).telegramUrl || null
  const website = token.website || (token as any).websiteUrl || null
  
  // Extract creation time
  let creationTime = token.creationTime || (token as any).createdAt || (token as any).created_at
  if (typeof creationTime === 'string') {
    creationTime = new Date(creationTime).getTime() / 1000
  }
  
  return {
    name: name,
    symbol: symbol,
    slug: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `token-${mint.substring(0, 8)}`,
    contractAddress: mint,
    chain: "Solana",
    description: description,
    logoUrl: imageUri,
    twitterUrl: twitter ? (twitter.startsWith('http') ? twitter : `https://twitter.com/${twitter.replace('@', '')}`) : null,
    telegramUrl: telegram ? (telegram.startsWith('http') ? telegram : `https://t.me/${telegram.replace('@', '').replace('/', '')}`) : null,
    websiteUrl: website ? (website.startsWith('http') ? website : `https://${website}`) : null,
    isPumpFun: true,
    migrated: true,
    migrationDate: creationTime ? new Date(creationTime * 1000) : new Date(),
    migrationDex: migrationDex,
    published: false, // Start as draft for review
  }
}

