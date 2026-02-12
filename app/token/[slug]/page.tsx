import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatPrice } from "@/lib/utils"
import { ExternalLink, Twitter, MessageCircle, Globe } from "lucide-react"
import { TokenImage } from "@/components/token-image"
import type { Metadata } from "next"
import { Prisma } from "@prisma/client"

interface PageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const token = await prisma.token.findUnique({
      where: { slug: params.slug },
    })

    if (!token || !token.published) {
      return {
        title: "Token Not Found",
      }
    }

    return {
      title: `${token.name} (${token.symbol}) - KnowYourToken`,
      description: token.description || `Learn about ${token.name}, a meme token on ${token.chain}.`,
      openGraph: {
        title: `${token.name} (${token.symbol})`,
        description: token.description || undefined,
        images: token.logoUrl ? [token.logoUrl] : undefined,
      },
    }
  } catch (error) {
    console.error('Database error in generateMetadata:', error)
    return {
      title: "Token Not Found",
    }
  }
}

export default async function TokenPage({ params }: PageProps) {
  type TokenWithRelations = Prisma.TokenGetPayload<{
    include: {
      events: true
      gallery: true
    }
  }>
  
  let token: TokenWithRelations | null = null
  
  try {
    token = await prisma.token.findUnique({
      where: { slug: params.slug },
      include: {
        events: {
          orderBy: {
            date: "desc",
          },
        },
        gallery: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })
  } catch (error) {
    console.error('Database error:', error)
    notFound()
  }

  if (!token || !token.published) {
    notFound()
  }

  return (
    <div className="container py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted">
              <TokenImage
                src={token.logoUrl}
                alt={token.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold">{token.name}</h1>
              <p className="text-xl text-muted-foreground">{token.symbol}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {token.chain}
          </Badge>
        </div>

        {token.description && (
          <p className="text-lg text-muted-foreground max-w-3xl">
            {token.description}
          </p>
        )}

        {/* Social Links */}
        <div className="flex items-center space-x-4 mt-6">
          {token.twitterUrl && (
            <a href={token.twitterUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Twitter className="mr-2 h-4 w-4" />
                Twitter
              </Button>
            </a>
          )}
          {token.telegramUrl && (
            <a href={token.telegramUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <MessageCircle className="mr-2 h-4 w-4" />
                Telegram
              </Button>
            </a>
          )}
          {token.websiteUrl && (
            <a href={token.websiteUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Globe className="mr-2 h-4 w-4" />
                Website
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lore">Lore & Origin</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contract Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Contract Address</p>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {token.contractAddress}
                    </code>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Chain</p>
                  <Badge>{token.chain}</Badge>
                </div>
                {token.launchDate && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Launch Date</p>
                    <p className="text-sm">{token.launchDate.toLocaleDateString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Market Data</CardTitle>
                <CardDescription>Current market information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Price</span>
                  <span className="text-sm font-medium">{formatPrice(token.currentPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Market Cap</span>
                  <span className="text-sm font-medium">{formatCurrency(token.marketCap)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">24h Volume</span>
                  <span className="text-sm font-medium">{formatCurrency(token.volume24h)}</span>
                </div>
                {token.launchPrice && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Launch Price</span>
                    <span className="text-sm font-medium">{formatPrice(token.launchPrice)}</span>
                  </div>
                )}
                {token.sentiment && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Community Sentiment</span>
                    <Badge
                      variant={
                        token.sentiment === "Bullish"
                          ? "default"
                          : token.sentiment === "Bearish"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs py-0 mt-1"
                    >
                      {token.sentiment}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lore & Origin Tab */}
        <TabsContent value="lore" className="space-y-6">
          {token.lore && (
            <Card>
              <CardHeader>
                <CardTitle>Lore / Narrative</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-muted-foreground">{token.lore}</p>
              </CardContent>
            </Card>
          )}

          {token.originStory && (
            <Card>
              <CardHeader>
                <CardTitle>Origin Story</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-muted-foreground">{token.originStory}</p>
              </CardContent>
            </Card>
          )}

          {!token.lore && !token.originStory && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No lore or origin story available yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          {token.events.length > 0 ? (
            <div className="space-y-4">
              {token.events.map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <CardDescription>
                          {event.date.toLocaleDateString()} • {event.type}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {event.description && (
                    <CardContent>
                      <p className="text-muted-foreground">{event.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No timeline events available yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="space-y-6">
          {token.gallery.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {token.gallery.map((media) => (
                <Card key={media.id} className="overflow-hidden">
                  <div className="relative aspect-video bg-muted">
                    {media.type === "image" ? (
                      <TokenImage
                        src={media.url}
                        alt={media.caption || "Token media"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Video/GIF</p>
                      </div>
                    )}
                  </div>
                  {media.caption && (
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{media.caption}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No gallery media available yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

