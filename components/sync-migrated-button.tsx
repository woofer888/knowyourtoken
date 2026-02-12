"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function SyncMigratedButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/migrated-tokens/sync", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: `Sync completed: ${data.imported} imported, ${data.updated} updated`,
        })
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to sync tokens",
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to sync tokens",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        onClick={handleSync}
        disabled={loading}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Syncing..." : "Sync All Migrated"}
      </Button>
      {result && (
        <span
          className={`text-sm ${
            result.success
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {result.message}
        </span>
      )}
    </div>
  )
}

