"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export function DeleteMigratedButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete ALL migrated PumpFun tokens? This will delete all old migrated tokens. Only new migrations will be imported going forward. This cannot be undone.")) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/tokens/delete-migrated", {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: `Deleted ${data.deleted} migrated tokens`,
        })
        // Refresh the page after a short delay to show updated list
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to delete tokens",
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to delete tokens",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={loading}
      >
        <Trash2 className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Deleting..." : "Delete All Migrated"}
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

