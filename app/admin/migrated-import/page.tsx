"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function MigratedImportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [contractAddress, setContractAddress] = useState("")
  const [chain, setChain] = useState("Solana")
  const [migrationDex, setMigrationDex] = useState("PumpSwap")
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/migrated-tokens/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractAddress,
          chain,
          migrationDex,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
        setTimeout(() => {
          router.push("/admin")
        }, 2000)
      } else {
        setResult({ success: false, message: data.error || "Failed to import token" })
      }
    } catch (error) {
      setResult({ success: false, message: "Failed to import token" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8 md:py-12">
      <Link href="/admin">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>
      </Link>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Import Migrated Token</CardTitle>
          <CardDescription>
            Enter a contract address to automatically fetch and import token data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="contractAddress">Contract Address *</Label>
              <Input
                id="contractAddress"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="Enter contract address (e.g., EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm)"
                required
              />
              <p className="text-xs text-muted-foreground">
                The system will automatically fetch name, symbol, logo, and other data
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="chain">Chain *</Label>
                <select
                  id="chain"
                  value={chain}
                  onChange={(e) => setChain(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="Solana">Solana</option>
                  <option value="Ethereum">Ethereum</option>
                  <option value="BSC">BSC</option>
                  <option value="Base">Base</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="migrationDex">Migration DEX *</Label>
                <select
                  id="migrationDex"
                  value={migrationDex}
                  onChange={(e) => setMigrationDex(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="PumpSwap">PumpSwap</option>
                  <option value="Raydium">Raydium</option>
                  <option value="Jupiter">Jupiter</option>
                  <option value="Orca">Orca</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {result && (
              <div
                className={`p-4 rounded-md ${
                  result.success
                    ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                }`}
              >
                {result.message}
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <Link href="/admin">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Importing..." : "Import Token"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

