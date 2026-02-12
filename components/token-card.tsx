import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { TokenImage } from "@/components/token-image"

interface TokenCardProps {
  token: {
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
}

export function TokenCard({ token }: TokenCardProps) {
  return (
    <Link href={`/token/${token.slug}`}>
      <Card className="h-full transition-all hover:shadow-lg cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted">
                <TokenImage
                  src={token.logoUrl}
                  alt={token.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <CardTitle className="text-xl">{token.name}</CardTitle>
                <CardDescription>{token.symbol}</CardDescription>
              </div>
            </div>
            <Badge variant="outline">{token.chain}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-6 flex flex-col" style={{ minHeight: '140px' }}>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed" style={{ minHeight: '4rem', lineHeight: '1.5' }}>
            {token.description || "No description available."}
          </p>
          <div className="flex justify-between items-center text-sm mt-auto">
            <span className="text-muted-foreground">
              Market Cap: <span className="font-medium">{formatCurrency(token.marketCap)}</span>
            </span>
            {token.sentiment && (
              <Badge
                variant={
                  token.sentiment === "Bullish"
                    ? "default"
                    : token.sentiment === "Bearish"
                    ? "destructive"
                    : "secondary"
                }
                className="text-xs py-0"
              >
                {token.sentiment}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

