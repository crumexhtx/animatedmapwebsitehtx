'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { geoAlbersUsa, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry } from 'geojson'

export type StateColAverage = {
  name: string
  code: string
  slug: string
  cityCount: number
  avgCostOfLivingIndex: number
}

/** Local copy preferred; CDN fallback if missing. */
const GEO_URLS = [
  '/geo/us-states.json',
  'https://cdn.jsdelivr.net/gh/PublicaMundi/MappingAPI@master/data/geojson/us-states.json',
]

const VIEW_WIDTH = 960
const VIEW_HEIGHT = 560

/** Light sand → deep teal so mid-range states stay readable on the map. */
function colorForIndex(value: number | undefined, min: number, max: number) {
  if (value == null) return '#d7ded8'
  if (max === min) return '#0b5c4f'
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  // Piecewise ramp: pale sand → soft mint → rich teal
  const stops = [
    { t: 0, r: 244, g: 236, b: 214 },
    { t: 0.45, r: 158, g: 201, b: 186 },
    { t: 1, r: 11, g: 92, b: 79 },
  ]
  let i = 0
  while (i < stops.length - 2 && t > stops[i + 1].t) i += 1
  const a = stops[i]
  const b = stops[i + 1]
  const u = (t - a.t) / (b.t - a.t || 1)
  const r = Math.round(a.r + (b.r - a.r) * u)
  const g = Math.round(a.g + (b.g - a.g) * u)
  const bl = Math.round(a.b + (b.b - a.b) * u)
  return `rgb(${r}, ${g}, ${bl})`
}

async function loadStatesGeoJson(): Promise<FeatureCollection> {
  for (const url of GEO_URLS) {
    try {
      const response = await fetch(url)
      if (!response.ok) continue
      const data = (await response.json()) as FeatureCollection
      if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) return data
    } catch {
      // try next source
    }
  }
  throw new Error('Could not load US states GeoJSON')
}

type StateFeature = Feature<Geometry, { name?: string }>

export function StateColChoropleth({ states }: { states: StateColAverage[] }) {
  const router = useRouter()
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState<StateColAverage | null>(null)

  const byName = useMemo(
    () => new Map(states.map((state) => [state.name.toLowerCase(), state])),
    [states],
  )
  const values = states.map((state) => state.avgCostOfLivingIndex)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 100

  useEffect(() => {
    let cancelled = false
    void loadStatesGeoJson()
      .then((data) => {
        if (!cancelled) {
          setGeojson(data)
          setError(null)
        }
      })
      .catch((err) => {
        console.error('choropleth load failed', err)
        if (!cancelled) {
          setError('State map data could not be loaded. The ranked list below still works.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const pathGenerator = useMemo(() => {
    if (!geojson) return null
    const projection = geoAlbersUsa().fitSize([VIEW_WIDTH, VIEW_HEIGHT], geojson)
    return geoPath(projection)
  }, [geojson])

  const paths = useMemo(() => {
    if (!geojson || !pathGenerator) return []
    return (geojson.features as StateFeature[]).flatMap((feature, index) => {
      const name = String(feature.properties?.name ?? '')
      const match = byName.get(name.toLowerCase())
      const d = pathGenerator(feature)
      if (!d) return []
      return [
        {
          key: `${name || 'state'}-${index}`,
          d,
          name: match?.name ?? name,
          match,
          fill: colorForIndex(match?.avgCostOfLivingIndex, min, max),
        },
      ]
    })
  }, [byName, geojson, max, min, pathGenerator])

  return (
    <div className="choropleth">
      <div className="choropleth-map choropleth-map-svg" role="img" aria-label="U.S. state housing cost averages map">
        {!geojson && !error ? <div className="city-map-loader choropleth-loader">Loading state map…</div> : null}
        {geojson && pathGenerator ? (
          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className="choropleth-svg"
          >
            <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#f4f7f2" />
            {[...paths]
              .sort((a, b) => b.d.length - a.d.length)
              .map((path) => (
              <path
                key={path.key}
                d={path.d}
                fill={path.fill}
                stroke="#1a2a24"
                strokeOpacity={0.55}
                strokeWidth={1.1}
                vectorEffect="non-scaling-stroke"
                className={path.match ? 'choropleth-state is-mapped' : 'choropleth-state'}
                tabIndex={path.match ? 0 : undefined}
                role={path.match ? 'link' : undefined}
                aria-label={
                  path.match
                    ? `${path.name}: catalog average housing index ${path.match.avgCostOfLivingIndex}`
                    : `${path.name}: no MapsToIt cities in catalog yet`
                }
                onMouseEnter={() =>
                  setHover(
                    path.match ?? {
                      name: path.name,
                      code: '',
                      slug: '',
                      cityCount: 0,
                      avgCostOfLivingIndex: 0,
                    },
                  )
                }
                onMouseLeave={() => setHover(null)}
                onFocus={() =>
                  setHover(
                    path.match ?? {
                      name: path.name,
                      code: '',
                      slug: '',
                      cityCount: 0,
                      avgCostOfLivingIndex: 0,
                    },
                  )
                }
                onBlur={() => setHover(null)}
                onClick={() => {
                  if (path.match?.slug) router.push(`/states/${path.match.slug}`)
                }}
                onKeyDown={(event) => {
                  if (!path.match?.slug) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    router.push(`/states/${path.match.slug}`)
                  }
                }}
              />
            ))}
          </svg>
        ) : null}
      </div>
      {error ? <p className="chart-active">{error}</p> : null}
      <div className="choropleth-legend" aria-hidden>
        <span>Lower COL avg</span>
        <span className="choropleth-ramp" />
        <span>Higher COL avg</span>
      </div>
      <p className="chart-active" aria-live="polite">
        {hover
          ? hover.cityCount
            ? `${hover.name}: catalog avg housing index ${hover.avgCostOfLivingIndex} across ${hover.cityCount} cities — click for state page`
            : `${hover.name}: no MapsToIt cities in catalog yet`
          : 'Hover a state for catalog-average housing cost · click mapped states to open the state page'}
      </p>
    </div>
  )
}
