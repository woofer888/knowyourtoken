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
        const hasErrors = data.errors > 0
        // Show first error detail if available, but truncate if too long
        let errorMsg = ""
        if (data.errorDetails && data.errorDetails.length > 0) {
          const firstError = data.errorDetails[0]
          errorMsg = firstError.length > 150 ? firstError.substring(0, 150) + "..." : firstError
        }
        
        setResult({
          success: !hasErrors,
          message: `Sync completed: ${data.imported} imported, ${data.updated} updated${data.errors > 0 ? `, ${data.errors} errors` : ''}${errorMsg ? ` (${errorMsg})` : ''}`,
        })
        
        // Also log full error details to console for debugging
        if (data.errorDetails && data.errorDetails.length > 0) {
          console.error("Sync errors:", data.errorDetails)
        }
      } else {
        setResult({
          success: false,
          message: data.error || data.details || "Failed to sync tokens",
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

