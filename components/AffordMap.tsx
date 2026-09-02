'use client'

import dynamic from 'next/dynamic'
import type { CityRecord } from '@/lib/types'
import { toMapCities } from '@/lib/map-data'

const CityMap = dynamic(
  () => import('@/components/CityMap').then((mod) => mod.CityMap),
  {
    ssr: false,
    loading: () => <div className="city-map-fallback">Loading map…</div>,
  },
)

export function AffordMap({ cities }: { cities: CityRecord[] }) {
  if (!cities.length) {
    return <div className="city-map-fallback afford-map-empty">Matching cities will appear on the map.</div>
  }

  return (
    <div className="afford-map-panel">
      <CityMap cities={toMapCities(cities)} variant="default" />
    </div>
  )
}
