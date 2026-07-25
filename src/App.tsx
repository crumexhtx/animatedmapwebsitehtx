import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router'
import * as maplibregl from 'maplibre-gl'
import { Globe2 } from 'lucide-react'
import { datasets, datasetsForCountry, layerLabels } from './data'
import { capitalsByCode } from './lib/capitals'
import { extendBounds, fitDataset } from './lib/geo'
import { deckLayersForDataset } from './map/deckLayers'
import { useAtlasMap } from './map/useAtlasMap'
import { RegionDrawer } from './components/RegionDrawer'
import { SiteHeader } from './components/SiteHeader'
import { AboutPage } from './pages/AboutPage'
import { AtlasPanel } from './pages/AtlasPanel'
import { ContactPage } from './pages/ContactPage'
import { DatasetPage } from './pages/DatasetPage'
import { DatasetsPage } from './pages/DatasetsPage'
import type { AtlasDataset, DatasetCategory, RegionMetric } from './types'

function resolveCountryCode(
  country: string,
  countryCode: string | undefined,
  countryCodes: Record<string, string>,
) {
  return (
    countryCode
    ?? countryCodes[country]
    ?? datasets.find((dataset) => dataset.country === country)?.countryCode
    ?? null
  )
}

function findCountryByCode(code: string, countryCodes: Record<string, string>) {
  const upper = code.toUpperCase()
  const fromData = datasets.find((dataset) => dataset.countryCode === upper)
  if (fromData) return { country: fromData.country, code: upper }
  const fromMap = Object.entries(countryCodes).find(([, value]) => value === upper)
  if (fromMap) return { country: fromMap[0], code: upper }
  return null
}

function AtlasRoute({
  mapApi,
  category,
  setCategory,
  selectedRegion,
  setSelectedRegion,
  setMapCaptionDataset,
}: {
  mapApi: ReturnType<typeof useAtlasMap>
  category: DatasetCategory | 'All'
  setCategory: (next: DatasetCategory | 'All') => void
  selectedRegion: RegionMetric | null
  setSelectedRegion: (region: RegionMetric | null) => void
  setMapCaptionDataset: (dataset: AtlasDataset | null) => void
}) {
  const navigate = useNavigate()
  const { countryCode, datasetId } = useParams()
  const [query, setQuery] = useState('')
  const fittedKey = useRef<string | null>(null)

  const resolved = countryCode
    ? findCountryByCode(countryCode, mapApi.countryCodes)
    : null
  const selectedCountry = resolved?.country ?? null
  const selectedCountryCode = resolved?.code ?? null

  const countryDatasets = useMemo(() => {
    if (!selectedCountry) return []
    return datasetsForCountry(selectedCountry).filter(
      (dataset) => category === 'All' || dataset.category === category,
    )
  }, [selectedCountry, category])

  const activeDataset = useMemo(() => {
    if (!countryDatasets.length) return null
    if (datasetId) {
      return countryDatasets.find((dataset) => dataset.id === datasetId) ?? countryDatasets[0]
    }
    return countryDatasets[0]
  }, [countryDatasets, datasetId])

  const datasetCountByCountry = useMemo(() => {
    const counts: Record<string, number> = {}
    datasets.forEach((dataset) => {
      counts[dataset.country] = (counts[dataset.country] ?? 0) + 1
    })
    return counts
  }, [])

  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const normalized = query.toLowerCase()
    return mapApi.allCountries
      .filter((country) => country.toLowerCase().includes(normalized))
      .slice(0, 8)
      .map((name) => ({
        name,
        code: mapApi.countryCodes[name] ?? datasets.find((dataset) => dataset.country === name)?.countryCode,
        datasetCount: datasetCountByCountry[name] ?? 0,
      }))
      .sort((a, b) => b.datasetCount - a.datasetCount || a.name.localeCompare(b.name))
  }, [query, mapApi.allCountries, mapApi.countryCodes, datasetCountByCountry])

  const selectedCapital = selectedCountryCode ? capitalsByCode[selectedCountryCode] : undefined

  useEffect(() => {
    setMapCaptionDataset(activeDataset)
    return () => setMapCaptionDataset(null)
  }, [activeDataset, setMapCaptionDataset])

  useEffect(() => {
    if (!mapApi.mapReady || !mapApi.mapRef.current) return
    mapApi.mapRef.current.setFilter('country-selected', ['==', ['get', 'name'], selectedCountry ?? ''])
    mapApi.mapRef.current.setFilter('country-selected-border', ['==', ['get', 'name'], selectedCountry ?? ''])
  }, [mapApi.mapReady, selectedCountry, mapApi.mapRef])

  useEffect(() => {
    if (!mapApi.mapReady || !mapApi.deckOverlayRef.current) return
    if (!activeDataset) {
      mapApi.deckOverlayRef.current.setProps({ layers: [] })
      return
    }
    mapApi.deckOverlayRef.current.setProps({
      layers: deckLayersForDataset(activeDataset, selectedRegion?.id ?? null, (region) => {
        setSelectedRegion(region)
        mapApi.mapRef.current?.easeTo({
          center: region.coordinates,
          zoom: Math.max(mapApi.mapRef.current.getZoom(), 4.6),
          duration: 700,
        })
      }),
    })
  }, [mapApi.mapReady, activeDataset, selectedRegion, mapApi.deckOverlayRef, mapApi.mapRef, setSelectedRegion])

  useEffect(() => {
    if (!mapApi.mapReady || !mapApi.mapRef.current) return
    const map = mapApi.mapRef.current
    const frame = requestAnimationFrame(() => map.resize())
    return () => cancelAnimationFrame(frame)
  }, [mapApi.mapReady, selectedCountry, activeDataset?.id, category, mapApi.mapRef])

  useEffect(() => {
    if (!mapApi.mapReady || !mapApi.mapRef.current || !selectedCountry) {
      fittedKey.current = null
      return
    }
    const key = `${selectedCountry}:${activeDataset?.id ?? 'none'}`
    if (fittedKey.current === key) return
    fittedKey.current = key

    if (activeDataset) {
      fitDataset(mapApi.mapRef.current, activeDataset)
      return
    }

    const countryFeature = mapApi.mapRef.current
      .querySourceFeatures('countries')
      .find((feature) => feature.properties?.name === selectedCountry)
    if (countryFeature?.geometry && 'coordinates' in countryFeature.geometry) {
      const bounds = new maplibregl.LngLatBounds()
      extendBounds(bounds, countryFeature.geometry.coordinates)
      if (!bounds.isEmpty()) {
        mapApi.mapRef.current.fitBounds(bounds, {
          padding: 120,
          maxZoom: 5,
          duration: 1400,
          pitch: 0,
          bearing: 0,
        })
      }
    }
  }, [mapApi.mapReady, selectedCountry, activeDataset, mapApi.mapRef])

  function goToCountry(country: string, code?: string, preferredDatasetId?: string) {
    const resolvedCode = resolveCountryCode(country, code, mapApi.countryCodes)
    if (!resolvedCode) return
    setSelectedRegion(null)
    setQuery('')
    if (preferredDatasetId) {
      navigate(`/atlas/${resolvedCode.toLowerCase()}/${preferredDatasetId}`)
      return
    }
    navigate(`/atlas/${resolvedCode.toLowerCase()}`)
  }

  function resetWorld() {
    setSelectedRegion(null)
    setQuery('')
    fittedKey.current = null
    navigate('/')
    mapApi.mapRef.current?.flyTo({ center: [8, 18], zoom: 1.7, pitch: 0, bearing: 0, duration: 1400 })
  }

  function selectCategory(next: DatasetCategory | 'All') {
    setCategory(next)
    setSelectedRegion(null)
  }

  return (
    <AtlasPanel
      selectedCountry={selectedCountry}
      selectedCapitalName={selectedCapital?.name}
      countryDatasets={countryDatasets}
      activeDataset={activeDataset}
      selectedRegion={selectedRegion}
      category={category}
      query={query}
      searchResults={searchResults}
      onResetWorld={resetWorld}
      onSelectDataset={(id) => {
        if (!selectedCountryCode) return
        setSelectedRegion(null)
        navigate(`/atlas/${selectedCountryCode.toLowerCase()}/${id}`)
      }}
      onSelectRegion={(region) => {
        setSelectedRegion(region)
        mapApi.mapRef.current?.easeTo({
          center: region.coordinates,
          zoom: Math.max(mapApi.mapRef.current.getZoom(), 4.6),
          duration: 700,
        })
      }}
      onSelectCategory={selectCategory}
      onQueryChange={setQuery}
      onPickCountry={goToCountry}
      onOpenDatasetPage={(id) => navigate(`/datasets/${id}`)}
    />
  )
}

function DatasetDetailRoute() {
  const navigate = useNavigate()
  const { datasetId } = useParams()
  const dataset = datasets.find((item) => item.id === datasetId)
  if (!dataset) return <Navigate to="/datasets" replace />

  return (
    <DatasetPage
      dataset={dataset}
      onViewMap={() => navigate(`/atlas/${dataset.countryCode.toLowerCase()}/${dataset.id}`)}
    />
  )
}

export default function App() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [category, setCategory] = useState<DatasetCategory | 'All'>('All')
  const [selectedRegion, setSelectedRegion] = useState<RegionMetric | null>(null)
  const [mapCaptionDataset, setMapCaptionDataset] = useState<AtlasDataset | null>(null)
  const countryCodesRef = useRef<Record<string, string>>({})

  const mapApi = useAtlasMap(mapContainer, (country, code) => {
    const resolvedCode = resolveCountryCode(country, code, countryCodesRef.current)
    if (!resolvedCode) return
    setSelectedRegion(null)
    navigate(`/atlas/${resolvedCode.toLowerCase()}`)
  })

  useEffect(() => {
    countryCodesRef.current = mapApi.countryCodes
  }, [mapApi.countryCodes])

  const showMap = location.pathname === '/' || location.pathname.startsWith('/atlas')

  useEffect(() => {
    if (showMap || !mapApi.deckOverlayRef.current) return
    mapApi.deckOverlayRef.current.setProps({ layers: [] })
  }, [showMap, mapApi.deckOverlayRef])

  const atlasProps = {
    mapApi,
    category,
    setCategory,
    selectedRegion,
    setSelectedRegion,
    setMapCaptionDataset,
  }

  return (
    <main className={`app-shell ${showMap ? '' : 'static-page'}`}>
      <section className="data-section" aria-label="Serious data controls">
        <SiteHeader />
        <Routes>
          <Route path="/" element={<AtlasRoute {...atlasProps} />} />
          <Route path="/atlas/:countryCode" element={<AtlasRoute {...atlasProps} />} />
          <Route path="/atlas/:countryCode/:datasetId" element={<AtlasRoute {...atlasProps} />} />
          <Route
            path="/datasets"
            element={(
              <DatasetsPage
                category={category}
                onSelectCategory={(next) => {
                  setCategory(next)
                  setSelectedRegion(null)
                }}
              />
            )}
          />
          <Route path="/datasets/:datasetId" element={<DatasetDetailRoute />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </section>

      <section className={`map-section ${showMap ? '' : 'is-hidden'}`} aria-label="Map visualization">
        <div ref={mapContainer} className="world-map" />
        {mapCaptionDataset ? (
          <div className="map-caption dataset-caption">
            <span className="pulse-dot" />
            {mapCaptionDataset.title} · {layerLabels[mapCaptionDataset.mapLayer]}
          </div>
        ) : (
          <div className="map-caption">
            <span className="pulse-dot" /> Glowing countries have deck.gl layer demos
          </div>
        )}
        {!mapApi.mapReady && (
          <div className="map-loader"><Globe2 size={30} /> Spinning up the planet…</div>
        )}
        {showMap && mapCaptionDataset && selectedRegion && (
          <RegionDrawer
            dataset={mapCaptionDataset}
            region={selectedRegion}
            onClose={() => setSelectedRegion(null)}
          />
        )}
      </section>
    </main>
  )
}
