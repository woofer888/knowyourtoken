"use client"

import { useState, useEffect, useMemo } from "react"

interface TokenImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  width?: number
  height?: number
  fill?: boolean
}

export function TokenImage({ src, alt, className, width, height, fill }: TokenImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Proxy external images through our API to avoid CORS issues
  const proxiedSrc = useMemo(() => {
    if (!src) return null
    
    // If it's an external URL, proxy it through our API
    if (src.startsWith('http://') || src.startsWith('https://')) {
      try {
        const url = new URL(src)
        // GitHub raw URLs work fine without proxy, so skip them
        if (url.hostname === 'raw.githubusercontent.com' || url.hostname === 'github.com') {
          return src
        }
        
        // Only proxy if it's not from our own domain (check if window is available for client-side)
        const isExternal = typeof window !== 'undefined' 
          ? url.hostname !== 'localhost' && url.hostname !== window.location.hostname
          : url.hostname !== 'localhost'
        
        if (isExternal) {
          return `/api/image-proxy?url=${encodeURIComponent(src)}`
        }
      } catch (e) {
        // Invalid URL, return as-is
      }
    }
    
    return src
  }, [src])

  useEffect(() => {
    if (proxiedSrc) {
      setIsLoading(true)
      setHasError(false)
      
      // Preload the image to ensure it loads immediately
      const img = new Image()
      img.onload = () => {
        setIsLoading(false)
      }
      img.onerror = () => {
        setHasError(true)
        setIsLoading(false)
      }
      img.src = proxiedSrc
    }
  }, [proxiedSrc])

  const handleError = () => {
    console.error('Image failed to load:', proxiedSrc)
    setHasError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  if (!proxiedSrc || hasError) {
    // Fallback: Use a simple SVG placeholder
    const placeholderSvg = `data:image/svg+xml,${encodeURIComponent(
      `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#e5e7eb"/>
        <text x="50%" y="50%" font-family="Arial" font-size="12" fill="#9ca3af" text-anchor="middle" dy=".3em">${alt.substring(0, 3).toUpperCase()}</text>
      </svg>`
    )}`
    
    if (fill) {
      return (
        <div
          className={`bg-muted flex items-center justify-center ${className || ""}`}
          style={{ width: '100%', height: '100%' }}
        >
          <img src={placeholderSvg} alt={alt} className={className} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )
    }
    
    return (
      <img
        src={placeholderSvg}
        alt={alt}
        width={width}
        height={height}
        className={className}
      />
    )
  }

  if (fill) {
    return (
      <div className="relative" style={{ width: '100%', height: '100%' }}>
        {isLoading && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Loading...</span>
          </div>
        )}
        <img
          src={proxiedSrc}
          alt={alt}
          className={className}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: isLoading ? 'none' : 'block' }}
          onError={handleError}
          onLoad={handleLoad}
          loading="eager"
          decoding="async"
        />
      </div>
    )
  }

  return (
    <img
      src={proxiedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
      loading="eager"
      decoding="async"
    />
  )
}

