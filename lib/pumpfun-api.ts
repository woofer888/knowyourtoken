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
  // PumpFun API returns 'coinMint' in the graduated tokens endpoint
  const metadata = token.metadata || null
  const mint = token.mint || token.coinMint || token.mintAddress || token.address || ""
  
  // Extract name and symbol from various possible locations
  const name = token.name || metadata?.name || (token as any).name || ""
  const symbol = token.symbol || metadata?.symbol || (token as any).symbol || ""
  const description = token.description || metadata?.description || null
  const imageUri = token.imageUri || metadata?.image || token.image || null
  
  // Extract social links
  const twitter = token.twitter || (token as any).twitterUrl || null
  const telegram = token.telegram || (token as any).telegramUrl || null
  const website = token.website || (token as any).websiteUrl || null
  
  // Extract migration time - for graduated tokens, this is when they migrated, not when created
  // Try migrationTime or graduatedAt first, then fallback to creationTime
  let migrationTime = (token as any).migrationTime || (token as any).graduatedAt || token.creationTime || (token as any).createdAt || (token as any).created_at
  
  // Normalize to seconds (Unix timestamp)
  if (typeof migrationTime === 'string') {
    // If it's a string, try to parse it as a date
    const parsed = new Date(migrationTime).getTime()
    if (!isNaN(parsed)) {
      migrationTime = parsed / 1000 // Convert to seconds
    } else {
      migrationTime = 0
    }
  } else if (migrationTime && typeof migrationTime === 'number') {
    // If it's a number, check if it's in seconds or milliseconds
    if (migrationTime > 10000000000) {
      // It's in milliseconds, convert to seconds
      migrationTime = migrationTime / 1000
    }
    // If it's < 10000000000, it's already in seconds, use as-is
  } else {
    migrationTime = 0
  }
  
  // Validate the timestamp is reasonable (not in the future by more than 1 year)
  const now = Date.now() / 1000 // Current time in seconds
  const oneYearFromNow = now + (365 * 24 * 60 * 60)
  if (migrationTime > oneYearFromNow) {
    console.warn(`Invalid migration time: ${migrationTime} (${new Date(migrationTime * 1000).toISOString()}). Using current time instead.`)
    migrationTime = now
  }
  
  // Use migrationTime as creationTime for the migration date
  const creationTime = migrationTime
  
  // Generate slug from name, or fallback to mint-based slug
  // Ensure slug is never empty
  let slugBase = name || `token-${mint.substring(0, 8)}`
  if (!slugBase || slugBase.trim() === "") {
    slugBase = `token-${mint.substring(0, 8)}`
  }
  
  let slug = slugBase
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  
  // Ensure slug is never empty - use mint as fallback
  if (!slug || slug.trim() === "") {
    slug = `token-${mint.substring(0, 16)}`
  }
  
  // Ensure name and symbol are never empty
  const finalName = name || `Token ${mint.substring(0, 8)}`
  const finalSymbol = symbol || "UNKNOWN"
  
  // Ensure contractAddress is never empty
  if (!mint || mint.trim() === "") {
    throw new Error("Contract address (mint) is required")
  }
  
  // Convert creationTime (in seconds) to Date object
  let migrationDate: Date
  if (creationTime && creationTime > 0) {
    // creationTime is already in seconds, convert to milliseconds for Date constructor
    const timestampMs = creationTime * 1000
    migrationDate = new Date(timestampMs)
    
    // Validate the date is reasonable (not in the future by more than 1 year)
    const now = Date.now()
    const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000)
    if (timestampMs > oneYearFromNow) {
      console.warn(`Invalid migration date: ${migrationDate.toISOString()} (timestamp: ${creationTime}). Using current time instead.`)
      migrationDate = new Date()
    }
  } else {
    migrationDate = new Date()
  }
  
  return {
    name: finalName,
    symbol: finalSymbol,
    slug: slug,
    contractAddress: mint,
    chain: "Solana",
    description: description,
    logoUrl: imageUri,
    twitterUrl: twitter ? (twitter.startsWith('http') ? twitter : `https://twitter.com/${twitter.replace('@', '')}`) : null,
    telegramUrl: telegram ? (telegram.startsWith('http') ? telegram : `https://t.me/${telegram.replace('@', '').replace('/', '')}`) : null,
    websiteUrl: website ? (website.startsWith('http') ? website : `https://${website}`) : null,
    isPumpFun: true,
    migrated: true,
    migrationDate: migrationDate,
    migrationDex: migrationDex,
    published: true, // Auto-publish migrated tokens
  }
}

