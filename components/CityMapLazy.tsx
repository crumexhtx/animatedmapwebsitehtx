'use client'

import dynamic from 'next/dynamic'
import type { CityRecord } from '@/lib/types'

const CityMap = dynamic(
  () => import('@/components/CityMap').then((mod) => mod.CityMap),
  {
    ssr: false,
    loading: () => <div className="city-map-fallback">Loading map…</div>,
  },
)

type Props = {
  cities: CityRecord[]
  focus?: CityRecord | null
  className?: string
  variant?: 'default' | 'hero'
}

export function CityMapLazy(props: Props) {
  return <CityMap {...props} />
}
