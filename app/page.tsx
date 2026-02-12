import { prisma } from "@/lib/prisma"
import { TokenCard } from "@/components/token-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import Link from "next/link"
import { executeQuery } from "@/lib/db-query"

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Fetch trending tokens (published, ordered by market cap)
  type TokenCard = {
    id: string
    slug: string
    name: string
    symbol: string
    description: string | null
    chain: string
    logoUrl: string | null
    marketCap: number | null
    sentiment: string | null
  }
  
  let trendingTokens: TokenCard[] = []
  let recentlyMigrated: TokenCard[] = []
  let errorMessage: string | null = null
  
  try {
    // Fetch trending tokens
    trendingTokens = await executeQuery(() =>
      prisma.token.findMany({
        where: {
          published: true,
        },
        orderBy: {
          marketCap: "desc",
        },
        take: 6,
        select: {
          id: true,
          slug: true,
          name: true,
          symbol: true,
          description: true,
          chain: true,
          logoUrl: true,
          marketCap: true,
          sentiment: true,
        },
      })
    )
    console.log(`Found ${trendingTokens.length} trending tokens`)
    
    // Fetch recently migrated tokens (published, ordered by migration date)
    recentlyMigrated = await executeQuery(() =>
      prisma.token.findMany({
        where: {
          published: true,
          migrated: true,
          isPumpFun: true,
        },
        orderBy: {
          migrationDate: "desc",
        },
        take: 6,
        select: {
          id: true,
          slug: true,
          name: true,
          symbol: true,
          description: true,
          chain: true,
          logoUrl: true,
          marketCap: true,
          sentiment: true,
        },
      })
    )
    console.log(`Found ${recentlyMigrated.length} recently migrated tokens`)
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Database error:', error)
    // Return empty arrays if database connection fails
    trendingTokens = []
    recentlyMigrated = []
  }

  return (
    <div className="container py-8 md:py-12">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center space-y-6 py-12 md:py-24">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl text-center">
          KnowYourToken
        </h1>
        <p className="max-w-[700px] text-lg text-muted-foreground text-center">
          The searchable encyclopedia for meme tokens. Learn about token lore, origin stories, and community narratives.
        </p>
        
        {/* Search Bar */}
        <form action="/search" method="get" className="w-full max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Search for a token (e.g., BONK, PEPE, WIF)..."
              className="pl-10 h-12 text-base"
            />
          </div>
        </form>
      </div>

      {/* Trending Tokens */}
      <section className="space-y-6 py-12">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Trending Tokens</h2>
          <Link href="/tokens">
            <Button variant="outline">View All</Button>
          </Link>
        </div>
        
        {trendingTokens.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trendingTokens.map((token) => (
              <TokenCard key={token.id} token={token} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No tokens found. Add some tokens in the admin panel!</p>
            {errorMessage && (
              <p className="text-xs text-red-500 mt-2">Error: {errorMessage}</p>
            )}
          </div>
        )}
      </section>

      {/* Recently Migrated Tokens */}
      <section className="space-y-6 py-12 border-t">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Recently Migrated</h2>
            <p className="text-sm text-muted-foreground mt-1">
              PumpFun tokens that recently migrated to DEXs
            </p>
          </div>
          <Link href="/migrated">
            <Button variant="outline">View All</Button>
          </Link>
        </div>
        
        {recentlyMigrated.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentlyMigrated.map((token) => (
              <TokenCard key={token.id} token={token} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No recently migrated tokens yet.</p>
            <p className="text-sm mt-2">Tokens that migrate from PumpFun will appear here automatically.</p>
          </div>
        )}
      </section>

      {/* Info Section */}
      <section className="py-12 border-t">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Token Lore</h3>
            <p className="text-muted-foreground">
              Discover the stories, memes, and narratives behind each token. Understand what makes communities tick.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Origin Stories</h3>
            <p className="text-muted-foreground">
              Learn how tokens were born, who created them, and the key moments that shaped their journey.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Community Data</h3>
            <p className="text-muted-foreground">
              Access contract addresses, social links, market data, and timelines of major events.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

