'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { MapCity } from '@/lib/map-data'

const CityMap = dynamic(
  () => import('@/components/CityMap').then((mod) => mod.CityMap),
  {
    ssr: false,
    loading: () => <div className="city-map-fallback">Loading map…</div>,
  },
)

type Props = {
  focus?: MapCity | null
  className?: string
  variant?: 'default' | 'hero'
}

/** Load MapLibre + city points only when the map is near the viewport so LCP can paint first. */
export function CityMapLazy({ focus = null, className, variant }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [cities, setCities] = useState<MapCity[] | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host || shouldLoad) return

    const reveal = () => setShouldLoad(true)

    if (typeof IntersectionObserver === 'undefined') {
      reveal()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          reveal()
        }
      },
      {
        // Hero map sits below the fold on mobile; don't prefetch it into LCP.
        rootMargin: variant === 'hero' ? '0px' : '120px',
        threshold: variant === 'hero' ? 0.2 : 0,
      },
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [shouldLoad, variant])

  useEffect(() => {
    if (!shouldLoad || cities) return

    let cancelled = false
    fetch('/api/map-cities')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load map cities')
        return res.json() as Promise<MapCity[]>
      })
      .then((data) => {
        if (!cancelled) setCities(data)
      })
      .catch(() => {
        if (!cancelled) setCities([])
      })

    return () => {
      cancelled = true
    }
  }, [shouldLoad, cities])

  const ready = shouldLoad && cities && cities.length > 0

  return (
    <div ref={hostRef} className="city-map-lazy-host">
      {ready ? (
        <CityMap cities={cities} focus={focus} className={className} variant={variant} />
      ) : (
        <div className="city-map-fallback">Loading map…</div>
      )}
    </div>
  )
}
