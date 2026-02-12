"use client"

import { useEffect, useState } from "react"
import { formatCurrency, formatPrice } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface LiveMarketDataProps {
  symbol: string
  fallbackPrice?: number | null
  fallbackMarketCap?: number | null
  fallbackVolume?: number | null
}

interface MarketData {
  currentPrice: number
  marketCap: number
  volume24h: number
  change24h: number
}

export function LiveMarketData({
  symbol,
  fallbackPrice,
  fallbackMarketCap,
  fallbackVolume,
}: LiveMarketDataProps) {
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMarketData() {
      try {
        setLoading(true)
        const response = await fetch(`/api/market-data/${symbol}`)
        
        if (!response.ok) {
          throw new Error("Failed to fetch market data")
        }

        const data = await response.json()
        setMarketData(data)
        setError(null)
      } catch (err) {
        console.error("Error fetching market data:", err)
        setError("Failed to load live data")
        // Use fallback data if available
        if (fallbackPrice || fallbackMarketCap || fallbackVolume) {
          setMarketData({
            currentPrice: fallbackPrice || 0,
            marketCap: fallbackMarketCap || 0,
            volume24h: fallbackVolume || 0,
            change24h: 0,
          })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchMarketData()
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchMarketData, 60000)
    return () => clearInterval(interval)
  }, [symbol, fallbackPrice, fallbackMarketCap, fallbackVolume])

  const price = marketData?.currentPrice ?? fallbackPrice ?? 0
  const marketCap = marketData?.marketCap ?? fallbackMarketCap ?? 0
  const volume = marketData?.volume24h ?? fallbackVolume ?? 0
  const change24h = marketData?.change24h ?? 0

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Current Price</span>
        <div className="flex items-center space-x-2">
          {loading ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : error && !marketData ? (
            <span className="text-sm font-medium">{formatPrice(fallbackPrice)}</span>
          ) : (
            <>
              <span className="text-sm font-medium">{formatPrice(price)}</span>
              {change24h !== 0 && (
                <span
                  className={`text-xs flex items-center ${
                    change24h >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {change24h >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {Math.abs(change24h).toFixed(2)}%
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Market Cap</span>
        {loading ? (
          <span className="text-sm text-muted-foreground">Loading...</span>
        ) : error && !marketData ? (
          <span className="text-sm font-medium">{formatCurrency(fallbackMarketCap)}</span>
        ) : (
          <span className="text-sm font-medium">{formatCurrency(marketCap)}</span>
        )}
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">24h Volume</span>
        {loading ? (
          <span className="text-sm text-muted-foreground">Loading...</span>
        ) : error && !marketData ? (
          <span className="text-sm font-medium">{formatCurrency(fallbackVolume)}</span>
        ) : (
          <span className="text-sm font-medium">{formatCurrency(volume)}</span>
        )}
      </div>
      {marketData && (
        <p className="text-xs text-muted-foreground text-right">
          Live data • Updates every 60s
        </p>
      )}
    </div>
  )
}

