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

function colorForIndex(value: number | undefined, min: number, max: number) {
  if (value == null) return 'rgba(215, 224, 217, 0.55)'
  if (max === min) return 'rgba(15, 107, 92, 0.85)'
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const r = Math.round(216 + (15 - 216) * t)
  const g = Math.round(239 + (107 - 239) * t)
  const b = Math.round(232 + (92 - 232) * t)
  return `rgba(${r}, ${g}, ${b}, 0.92)`
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
            <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#e8f0ea" />
            {paths.map((path) => (
              <path
                key={path.key}
                d={path.d}
                fill={path.fill}
                stroke="#14201c"
                strokeOpacity={0.35}
                strokeWidth={0.8}
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
