// Utility functions to fetch token data from various APIs

interface TokenData {
  name: string
  symbol: string
  contractAddress: string
  logoUrl: string | null
  description: string | null
  twitterUrl: string | null
  websiteUrl: string | null
  telegramUrl: string | null
  chain: string
}

/**
 * Fetch token data from DexScreener API
 * DexScreener provides token info for Solana and other chains
 */
export async function fetchTokenDataFromDexScreener(
  contractAddress: string,
  chain: string = "solana"
): Promise<TokenData | null> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`,
      {
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const pair = data.pairs?.[0]

    if (!pair) {
      return null
    }

    return {
      name: pair.baseToken?.name || "",
      symbol: pair.baseToken?.symbol || "",
      contractAddress: pair.baseToken?.address || contractAddress,
      logoUrl: pair.baseToken?.logoURI || null,
      description: null, // DexScreener doesn't provide descriptions
      twitterUrl: null, // Would need to fetch from another source
      websiteUrl: null,
      telegramUrl: null,
      chain: chain,
    }
  } catch (error) {
    console.error("Error fetching from DexScreener:", error)
    return null
  }
}

/**
 * Fetch token data from Birdeye API (Solana-focused)
 * Requires API key - you'd need to sign up at birdeye.so
 */
export async function fetchTokenDataFromBirdeye(
  contractAddress: string
): Promise<TokenData | null> {
  // Birdeye requires API key
  // const apiKey = process.env.BIRDEYE_API_KEY
  // if (!apiKey) return null

  try {
    // Example Birdeye API call (would need actual API key)
    // const response = await fetch(
    //   `https://public-api.birdeye.so/defi/token_overview?address=${contractAddress}`,
    //   {
    //     headers: {
    //       'X-API-KEY': apiKey,
    //     },
    //   }
    // )
    
    return null // Placeholder
  } catch (error) {
    console.error("Error fetching from Birdeye:", error)
    return null
  }
}

/**
 * Fetch token metadata from Solana on-chain data
 * Uses Solana web3.js to get token metadata
 */
export async function fetchSolanaTokenMetadata(
  contractAddress: string
): Promise<Partial<TokenData> | null> {
  try {
    // This would require @solana/web3.js
    // For now, return null as placeholder
    return null
  } catch (error) {
    console.error("Error fetching Solana metadata:", error)
    return null
  }
}

/**
 * Main function to fetch comprehensive token data
 * Tries multiple sources and combines the data
 */
export async function fetchTokenData(
  contractAddress: string,
  chain: string
): Promise<TokenData | null> {
  // Try DexScreener first (no API key needed)
  if (chain.toLowerCase() === "solana") {
    const dexscreenerData = await fetchTokenDataFromDexScreener(
      contractAddress,
      chain
    )
    if (dexscreenerData) {
      return dexscreenerData
    }
  }

  // Try Birdeye if API key is available
  // const birdeyeData = await fetchTokenDataFromBirdeye(contractAddress)
  // if (birdeyeData) return birdeyeData

  return null
}

