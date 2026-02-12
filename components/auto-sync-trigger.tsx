"use client"

import { useEffect } from "react"

/**
 * Client component that triggers auto-sync when the migrated page loads
 * This ensures new tokens are automatically imported
 */
export function AutoSyncTrigger() {
  useEffect(() => {
    // Trigger auto-sync in the background (don't wait for response)
    fetch("/api/migrated-tokens/auto-sync")
      .then((res) => res.json())
      .then((data) => {
        if (data.imported > 0) {
          console.log(`Auto-sync imported ${data.imported} new tokens`)
          // Optionally refresh the page to show new tokens
          // window.location.reload()
        }
      })
      .catch((error) => {
        console.error("Auto-sync error:", error)
      })
  }, [])

  return null // This component doesn't render anything
}

