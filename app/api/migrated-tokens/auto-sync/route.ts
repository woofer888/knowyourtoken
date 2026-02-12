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

    // Sort by creationTime descending to get newest first
    // Note: For graduated tokens, creationTime might be when token was created, not when it migrated
    // We need to check the actual migration time from the API response
    const sortedTokens = [...graduatedTokens].sort((a, b) => {
      // Try to get migration time, fallback to creation time
      const timeA = (a as any).migrationTime || (a as any).graduatedAt || a.creationTime || (a as any).createdAt || 0
      const timeB = (b as any).migrationTime || (b as any).graduatedAt || b.creationTime || (b as any).createdAt || 0
      return timeB - timeA // Descending order (newest first)
    })

    // Filter to ONLY tokens that migrated AFTER our last one
    // NO old tokens - only import if we have a last migration date to compare against
    let tokensToProcess: typeof sortedTokens = []
    
    if (lastMigrated?.migrationDate) {
      const lastDate = lastMigrated.migrationDate.getTime() / 1000
      // Use a small buffer (10 seconds) to account for timing differences and API delays
      const bufferTime = 10
      tokensToProcess = sortedTokens.filter((token) => {
        // Try multiple fields - check for migration time, graduated time, or creation time
        const tokenTime = (token as any).migrationTime || (token as any).graduatedAt || token.creationTime || (token as any).createdAt || 0
        // Only import tokens that migrated AFTER our last one (with small buffer)
        const isNewer = tokenTime > (lastDate - bufferTime)
        if (!isNewer) {
          console.log(`Skipping token - migration time ${new Date(tokenTime * 1000).toISOString()} is not after ${new Date((lastDate - bufferTime) * 1000).toISOString()}`)
        }
        return isNewer
      })
      console.log(`Filtered to ${tokensToProcess.length} new tokens (after ${new Date((lastDate - bufferTime) * 1000).toISOString()})`)
      console.log(`Last migrated token in DB: ${new Date(lastDate * 1000).toISOString()}`)
      if (sortedTokens.length > 0) {
        const firstTokenTime = (sortedTokens[0] as any).migrationTime || (sortedTokens[0] as any).graduatedAt || sortedTokens[0].creationTime || (sortedTokens[0] as any).createdAt || 0
        console.log(`Newest token from API: ${new Date(firstTokenTime * 1000).toISOString()}`)
      }
    } else {
      // If no previous migrations, don't import anything (to avoid importing old tokens)
      console.log("No previous migrations found - skipping import to avoid old tokens. Delete all migrated tokens first, then new ones will be imported.")
      return NextResponse.json({
        message: "No previous migrations found. Delete all migrated tokens first, then new ones will be imported automatically.",
        imported: 0,
        checked: graduatedTokens.length,
        new: 0,
      })
    }

    // Limit to 20 max per sync to avoid timeout
    tokensToProcess = tokensToProcess.slice(0, 20)

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

        // Check if already exists by contract address (prevent duplicates)
        const existing = await prisma.token.findFirst({
          where: {
            contractAddress: mint,
            chain: "Solana",
          },
        })

        if (existing) {
          console.log(`Skipping ${mint} - already exists in database`)
          continue // Skip if already exists - prevent duplicates
        }

        // Fetch metadata
        const metadata = await fetchTokenMetadata(mint)
        const tokenData = convertPumpFunTokenToDbFormat(
          metadata || token,
          "PumpSwap"
        )
        
        // Ensure contractAddress is set
        tokenData.contractAddress = mint
        if (!tokenData.chain) {
          tokenData.chain = "Solana"
        }
        
        // Clean and validate data (same as sync route)
        const cleanTokenData = {
          name: (tokenData.name || `Token ${mint.substring(0, 8)}`).trim(),
          symbol: (tokenData.symbol || "UNKNOWN").trim(),
          slug: (tokenData.slug || `token-${mint.substring(0, 16)}`).trim(),
          contractAddress: mint.trim(),
          chain: (tokenData.chain || "Solana").trim(),
          description: tokenData.description || null,
          lore: null,
          originStory: null,
          logoUrl: tokenData.logoUrl || null,
          twitterUrl: tokenData.twitterUrl || null,
          telegramUrl: tokenData.telegramUrl || null,
          websiteUrl: tokenData.websiteUrl || null,
          isPumpFun: true,
          migrated: true,
          migrationDate: tokenData.migrationDate || new Date(),
          migrationDex: tokenData.migrationDex || "PumpSwap",
          published: true, // Auto-publish migrated tokens
        }
        
        // Check if slug exists and make it unique if needed
        const slugExists = await prisma.token.findUnique({
          where: { slug: cleanTokenData.slug },
        })
        
        if (slugExists) {
          cleanTokenData.slug = `${cleanTokenData.slug}-${mint.substring(0, 8)}`
        }

        // Create new token
        try {
          await prisma.token.create({
            data: cleanTokenData,
          })
          imported++
          console.log(`✓ Auto-imported: ${cleanTokenData.name} (${cleanTokenData.symbol})`)
        } catch (createError: any) {
          if (createError.code === 'P2002') {
            // Slug conflict, try with unique slug
            cleanTokenData.slug = `token-${mint.substring(0, 16)}`
            await prisma.token.create({
              data: cleanTokenData,
            })
            imported++
            console.log(`✓ Auto-imported with unique slug: ${cleanTokenData.name}`)
          } else {
            console.error(`Error creating token ${mint}:`, createError)
            errors++
          }
        }

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

