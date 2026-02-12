import { prisma } from "@/lib/prisma"
import { TokenCard } from "@/components/token-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export const dynamic = 'force-dynamic'

interface SearchParams {
  q?: string
  chain?: string
}

export default async function TokensPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const searchQuery = searchParams.q || ""
  const chainFilter = searchParams.chain

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

  type Chain = {
    chain: string
  }

  let tokens: TokenCard[] = []
  let chains: Chain[] = []

  try {
    tokens = await prisma.token.findMany({
      where: {
        published: true,
        ...(searchQuery && {
          OR: [
            { name: { contains: searchQuery } },
            { symbol: { contains: searchQuery } },
            { description: { contains: searchQuery } },
          ],
        }),
        ...(chainFilter && { chain: chainFilter }),
      },
      orderBy: {
        marketCap: "desc",
      },
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

    // Get unique chains for filter
    chains = await prisma.token.findMany({
      where: { published: true },
      select: { chain: true },
      distinct: ["chain"],
    })
  } catch (error) {
    console.error('Database error:', error)
    // Return empty arrays if database connection fails
    tokens = []
    chains = []
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">All Tokens</h1>
        <p className="text-muted-foreground">
          Browse all meme tokens in our encyclopedia
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        <form action="/tokens" method="get" className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Search tokens..."
              defaultValue={searchQuery}
              className="pl-9"
            />
          </div>
          <select
            name="chain"
            defaultValue={chainFilter || ""}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All Chains</option>
            {chains.map((c) => (
              <option key={c.chain} value={c.chain}>
                {c.chain}
              </option>
            ))}
          </select>
          <Button type="submit">Search</Button>
        </form>
      </div>

      {/* Results */}
      {tokens.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tokens.map((token) => (
            <TokenCard key={token.id} token={token} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No tokens found matching your search.</p>
        </div>
      )}
    </div>
  )
}

