"use client"

import { useEffect, useRef } from "react"

/**
 * Client component that triggers auto-sync when the migrated page loads
 * This ensures new tokens are automatically imported
 * Only syncs once per minute to avoid excessive API calls
 */
export function AutoSyncTrigger() {
  const lastSyncRef = useRef<number | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const syncTokens = async () => {
      try {
        const response = await fetch("/api/migrated-tokens/auto-sync")
        const data = await response.json()
        
        if (data.imported > 0) {
          console.log(`✓ Auto-sync imported ${data.imported} new tokens`)
          // Refresh the page to show new tokens
          window.location.reload()
        } else {
          // Log the response for debugging
          if (data.message) {
            console.log(`Auto-sync: ${data.message}`)
          }
          if (data.checked !== undefined) {
            console.log(`Auto-sync checked ${data.checked} tokens, found ${data.new || 0} new ones`)
          }
          if (data.errors > 0 && data.errorDetails) {
            console.log(`Auto-sync errors (${data.errors} total):`, data.errorDetails)
          }
        }
        
        lastSyncRef.current = Date.now()
      } catch (error) {
        console.error("Auto-sync error:", error)
      }
    }

    // Check if we should sync immediately (if it's been more than a minute since last sync)
    const now = Date.now()
    const oneMinute = 60 * 1000
    
    if (!lastSyncRef.current || (now - lastSyncRef.current) >= oneMinute) {
      // Sync immediately if it's been more than a minute
      syncTokens()
    }

    // Set up interval to sync every minute
    syncIntervalRef.current = setInterval(syncTokens, oneMinute)

    // Cleanup interval on unmount
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [])

  return null // This component doesn't render anything
}

