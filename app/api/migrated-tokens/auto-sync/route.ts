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
    const sortedTokens = [...graduatedTokens].sort((a, b) => {
      const timeA = a.creationTime || (a as any).createdAt || 0
      const timeB = b.creationTime || (b as any).createdAt || 0
      return timeB - timeA // Descending order (newest first)
    })

    // Filter to only NEW tokens that migrated very recently
    // Only import tokens that migrated in the last 1 hour to avoid importing old historical tokens
    const oneHourAgo = Math.floor((Date.now() - 60 * 60 * 1000) / 1000) // 1 hour ago in seconds
    
    let tokensToProcess = sortedTokens.filter((token) => {
      const tokenTime = token.creationTime || (token as any).createdAt || 0
      // Only include tokens that migrated in the last hour
      return tokenTime > oneHourAgo
    })

    // Also check if we have a last migration date - only import tokens newer than that
    if (lastMigrated?.migrationDate) {
      const lastDate = lastMigrated.migrationDate.getTime() / 1000
      tokensToProcess = tokensToProcess.filter((token) => {
        const tokenTime = token.creationTime || (token as any).createdAt || 0
        return tokenTime > lastDate
      })
    }

    // Limit to 20 max per sync to avoid timeout
    tokensToProcess = tokensToProcess.slice(0, 20)
    
    console.log(`Filtered to ${tokensToProcess.length} tokens migrated in the last hour (after ${new Date(oneHourAgo * 1000).toISOString()})`)

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

