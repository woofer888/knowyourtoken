"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Eye } from "lucide-react"

interface Token {
  id: string
  slug: string
  name: string
  symbol: string
  chain: string
  published: boolean
  createdAt: Date
  _count: {
    events: number
    gallery: number
  }
}

interface AdminTokenListProps {
  tokens: Token[]
}

export function AdminTokenList({ tokens }: AdminTokenListProps) {
  return (
    <div className="space-y-4">
      {tokens.length > 0 ? (
        tokens.map((token) => (
          <Card key={token.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{token.name}</CardTitle>
                  <CardDescription>
                    {token.symbol} • {token.chain}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={token.published ? "default" : "secondary"}>
                    {token.published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {token._count.events} events • {token._count.gallery} media items
                </div>
                <div className="flex items-center space-x-2">
                  {token.published && (
                    <Link href={`/token/${token.slug}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </Link>
                  )}
                  <Link href={`/admin/tokens/${token.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No tokens found. Create your first token!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

