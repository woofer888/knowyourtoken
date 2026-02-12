import { prisma } from "@/lib/prisma"
import { TokenCard } from "@/components/token-card"
import { Badge } from "@/components/ui/badge"
import { Prisma } from "@prisma/client"
import { AutoSyncTrigger } from "@/components/auto-sync-trigger"

export const dynamic = 'force-dynamic'

type TokenWithMarketData = Prisma.TokenGetPayload<{
  select: {
    id: true;
    slug: true;
    name: true;
    symbol: true;
    description: true;
    chain: true;
    logoUrl: true;
    marketCap: true;
    sentiment: true;
    migrated: true;
    migrationDate: true;
    migrationDex: true;
  };
}>

export default async function MigratedTokensPage() {
  let tokens: TokenWithMarketData[] = []

  try {
    tokens = await prisma.token.findMany({
      where: {
        published: true,
        migrated: true,
      },
      orderBy: {
        migrationDate: "desc",
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
        migrated: true,
        migrationDate: true,
        migrationDex: true,
      },
    })
  } catch (error) {
    console.error('Database error:', error)
    tokens = []
  }

  return (
    <div className="container py-8 md:py-12">
      <AutoSyncTrigger />
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Migrated Tokens</h1>
            <p className="text-muted-foreground">
              PumpFun tokens that have successfully migrated to DEXs
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              New tokens are automatically imported when you visit this page
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {tokens.length} Migrated
          </Badge>
        </div>
      </div>

      {tokens.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tokens.map((token) => (
            <div key={token.id} className="relative">
              <TokenCard 
                token={{
                  id: token.id,
                  slug: token.slug,
                  name: token.name,
                  symbol: token.symbol,
                  description: token.description,
                  chain: token.chain,
                  logoUrl: token.logoUrl,
                  marketCap: token.marketCap,
                  sentiment: token.sentiment,
                }} 
              />
              {token.migrationDex && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge variant="default" className="text-xs">
                    Migrated to {token.migrationDex}
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No migrated tokens found yet.</p>
          <p className="text-sm mt-2">Tokens that migrate from PumpFun will appear here.</p>
        </div>
      )}
    </div>
  )
}

