"use client"

import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/utils"

interface TokenCardLiveDataProps {
  symbol: string
  fallbackMarketCap: number | null
}

export function TokenCardLiveData({
  symbol,
  fallbackMarketCap,
}: TokenCardLiveDataProps) {
  const [marketCap, setMarketCap] = useState<number | null>(fallbackMarketCap)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchMarketCap() {
      try {
        setLoading(true)
        const response = await fetch(`/api/market-data/${symbol}`)
        
        if (response.ok) {
          const data = await response.json()
          setMarketCap(data.marketCap || fallbackMarketCap)
        }
      } catch (err) {
        // Silently fail and use fallback
        setMarketCap(fallbackMarketCap)
      } finally {
        setLoading(false)
      }
    }

    fetchMarketCap()
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchMarketCap, 60000)
    return () => clearInterval(interval)
  }, [symbol, fallbackMarketCap])

  return (
    <span className="text-muted-foreground">
      Market Cap:{" "}
      <span className="font-medium">
        {loading ? "..." : formatCurrency(marketCap)}
      </span>
    </span>
  )
}

