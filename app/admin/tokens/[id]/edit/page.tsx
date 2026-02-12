"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function EditTokenPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    slug: "",
    description: "",
    lore: "",
    originStory: "",
    contractAddress: "",
    chain: "Solana",
    twitterUrl: "",
    telegramUrl: "",
    websiteUrl: "",
    logoUrl: "",
    launchDate: "",
    launchPrice: "",
    currentPrice: "",
    marketCap: "",
    volume24h: "",
    sentiment: "",
    published: false,
  })

  useEffect(() => {
    async function fetchToken() {
      try {
        const response = await fetch(`/api/admin/tokens/${params.id}`)
        if (response.ok) {
          const token = await response.json()
          setFormData({
            name: token.name || "",
            symbol: token.symbol || "",
            slug: token.slug || "",
            description: token.description || "",
            lore: token.lore || "",
            originStory: token.originStory || "",
            contractAddress: token.contractAddress || "",
            chain: token.chain || "Solana",
            twitterUrl: token.twitterUrl || "",
            telegramUrl: token.telegramUrl || "",
            websiteUrl: token.websiteUrl || "",
            logoUrl: token.logoUrl || "",
            launchDate: token.launchDate ? new Date(token.launchDate).toISOString().split("T")[0] : "",
            launchPrice: token.launchPrice?.toString() || "",
            currentPrice: token.currentPrice?.toString() || "",
            marketCap: token.marketCap?.toString() || "",
            volume24h: token.volume24h?.toString() || "",
            sentiment: token.sentiment || "",
            published: token.published || false,
          })
        }
      } catch (error) {
        console.error("Error fetching token:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchToken()
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/tokens/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          launchDate: formData.launchDate || null,
          launchPrice: formData.launchPrice ? parseFloat(formData.launchPrice) : null,
          currentPrice: formData.currentPrice ? parseFloat(formData.currentPrice) : null,
          marketCap: formData.marketCap ? parseFloat(formData.marketCap) : null,
          volume24h: formData.volume24h ? parseFloat(formData.volume24h) : null,
        }),
      })

      if (response.ok) {
        router.push("/admin")
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.message || "Failed to update token")
      }
    } catch (error) {
      alert("Failed to update token")
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  if (loading) {
    return (
      <div className="container py-8 md:py-12">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container py-8 md:py-12">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>
      </Link>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Edit Token</CardTitle>
          <CardDescription>Update token information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol *</Label>
                <Input
                  id="symbol"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lore">Lore / Narrative</Label>
              <textarea
                id="lore"
                name="lore"
                value={formData.lore}
                onChange={handleChange}
                rows={5}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="originStory">Origin Story</Label>
              <textarea
                id="originStory"
                name="originStory"
                value={formData.originStory}
                onChange={handleChange}
                rows={5}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contractAddress">Contract Address *</Label>
                <Input
                  id="contractAddress"
                  name="contractAddress"
                  value={formData.contractAddress}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chain">Chain *</Label>
                <select
                  id="chain"
                  name="chain"
                  value={formData.chain}
                  onChange={handleChange}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="Solana">Solana</option>
                  <option value="Ethereum">Ethereum</option>
                  <option value="BSC">BSC</option>
                  <option value="Base">Base</option>
                  <option value="Arbitrum">Arbitrum</option>
                  <option value="Polygon">Polygon</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                name="logoUrl"
                type="url"
                value={formData.logoUrl}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Social Links</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="twitterUrl">Twitter</Label>
                  <Input
                    id="twitterUrl"
                    name="twitterUrl"
                    type="url"
                    value={formData.twitterUrl}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegramUrl">Telegram</Label>
                  <Input
                    id="telegramUrl"
                    name="telegramUrl"
                    type="url"
                    value={formData.telegramUrl}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website</Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    value={formData.websiteUrl}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Market Data</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="launchDate">Launch Date</Label>
                  <Input
                    id="launchDate"
                    name="launchDate"
                    type="date"
                    value={formData.launchDate}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="launchPrice">Launch Price</Label>
                  <Input
                    id="launchPrice"
                    name="launchPrice"
                    type="number"
                    step="any"
                    value={formData.launchPrice}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentPrice">Current Price</Label>
                  <Input
                    id="currentPrice"
                    name="currentPrice"
                    type="number"
                    step="any"
                    value={formData.currentPrice}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marketCap">Market Cap</Label>
                  <Input
                    id="marketCap"
                    name="marketCap"
                    type="number"
                    step="any"
                    value={formData.marketCap}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volume24h">24h Volume</Label>
                  <Input
                    id="volume24h"
                    name="volume24h"
                    type="number"
                    step="any"
                    value={formData.volume24h}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sentiment">Sentiment</Label>
                  <select
                    id="sentiment"
                    name="sentiment"
                    value={formData.sentiment}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">None</option>
                    <option value="Bullish">Bullish</option>
                    <option value="Bearish">Bearish</option>
                    <option value="Neutral">Neutral</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="published"
                name="published"
                checked={formData.published}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="published">Published</Label>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/admin">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

