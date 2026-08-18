import { NextResponse } from 'next/server'
import { allCities } from '@/lib/catalog'
import { toMapCities } from '@/lib/map-data'

export const dynamic = 'force-static'

/** Slim map payload — fetched only after the map is near the viewport. */
export function GET() {
  return NextResponse.json(toMapCities(allCities), {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
