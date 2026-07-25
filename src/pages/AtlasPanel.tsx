import { ArrowLeft, ArrowUpRight, Info, Layers, LocateFixed, Search, X } from 'lucide-react'
import { Link } from 'react-router'
import { categories, layerLabels } from '../data'
import { formatMetric } from '../lib/format'
import type { AtlasDataset, DatasetCategory, RegionMetric } from '../types'

export function AtlasPanel({
  selectedCountry,
  selectedCapitalName,
  countryDatasets,
  activeDataset,
  selectedRegion,
  category,
  query,
  searchResults,
  onResetWorld,
  onSelectDataset,
  onSelectRegion,
  onSelectCategory,
  onQueryChange,
  onPickCountry,
  onOpenDatasetPage,
}: {
  selectedCountry: string | null
  selectedCapitalName?: string
  countryDatasets: AtlasDataset[]
  activeDataset: AtlasDataset | null
  selectedRegion: RegionMetric | null
  category: DatasetCategory | 'All'
  query: string
  searchResults: Array<{ name: string; code?: string; datasetCount: number }>
  onResetWorld: () => void
  onSelectDataset: (datasetId: string) => void
  onSelectRegion: (region: RegionMetric) => void
  onSelectCategory: (next: DatasetCategory | 'All') => void
  onQueryChange: (value: string) => void
  onPickCountry: (country: string, code?: string) => void
  onOpenDatasetPage: (datasetId: string) => void
}) {
  return (
    <div className={`explorer-panel ${selectedCountry ? 'country-mode' : ''}`}>
      {selectedCountry ? (
        <>
          <div className="explorer-intro">
            <button className="world-back" onClick={onResetWorld}><ArrowLeft size={15} /> World view</button>
            <span className="panel-kicker">LAYER EXPLORER · DEMO DATA</span>
            <h1>{selectedCountry}</h1>
            {selectedCapitalName && (
              <div className="capital-pill"><LocateFixed size={13} /> Capital · {selectedCapitalName}</div>
            )}
            <p>
              {countryDatasets.length
                ? 'Open a dataset page for source details, or select one to render it on the map below. Figures are illustrative demos.'
                : 'Not published yet — the US is live today, with more countries joining the atlas next.'}
            </p>
          </div>

          <div className="explorer-columns">
            <div className="fact-list">
              {countryDatasets.map((dataset) => (
                <div key={dataset.id} className={`dataset-row ${activeDataset?.id === dataset.id ? 'active' : ''}`}>
                  <button
                    className="dataset-select"
                    onClick={() => onSelectDataset(dataset.id)}
                  >
                    <i style={{ background: dataset.accent }}>{dataset.mapLayer.slice(0, 3).toUpperCase()}</i>
                    <span>
                      <small>{dataset.category} · {layerLabels[dataset.mapLayer].split(' · ')[0]}</small>
                      <b>{dataset.title}</b>
                    </span>
                  </button>
                  <button
                    className="dataset-info"
                    onClick={() => onOpenDatasetPage(dataset.id)}
                    aria-label={`About ${dataset.title}`}
                  >
                    <Info size={15} />
                  </button>
                </div>
              ))}
              {!countryDatasets.length && (
                <div className="empty-state">No deck.gl layer demos here yet.</div>
              )}
            </div>

            {activeDataset && (
              <div className="leaderboard">
                <div className="leaderboard-head">
                  <Layers size={14} /> {layerLabels[activeDataset.mapLayer]}
                </div>
                {activeDataset.regions.slice(0, 6).map((region, index) => (
                  <button
                    key={region.id}
                    className={selectedRegion?.id === region.id ? 'active' : ''}
                    onClick={() => onSelectRegion(region)}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <b>{region.name}</b>
                    <strong>{formatMetric(region.perCapita)}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="explorer-intro world-intro">
          <p className="data-banner compact">Demo atlas · illustrative US figures mapped to six deck.gl layers</p>
          <h1>Serious data,<br /><em>six layers.</em></h1>
          <p>
            Search any country on the globe — the United States is live today, with more countries joining the atlas as new datasets are added.
          </p>
          <div className="explore-hint">
            <LocateFixed size={17} />
            <span>
              <b>Start with the United States</b>
              Six demo datasets, one per deck.gl layer type
            </span>
          </div>
          <Link className="primary-cta world-cta" to="/atlas/us">
            Open United States <ArrowUpRight size={16} />
          </Link>
        </div>
      )}

      <div className="controls-row map-controls">
        <div className="search-box">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search a country…"
            aria-label="Search countries"
          />
          {query && <button onClick={() => onQueryChange('')}><X size={14} /></button>}
          {!!searchResults.length && (
            <div className="search-results">
              {searchResults.map((country) => (
                <button key={country.name} onClick={() => onPickCountry(country.name, country.code)}>
                  <span>
                    {country.name}
                    <small className="search-meta">
                      {country.datasetCount > 0
                        ? `${country.datasetCount} demo layer${country.datasetCount === 1 ? '' : 's'}`
                        : 'Coming soon'}
                    </small>
                  </span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="category-dock" aria-label="Dataset categories">
          <button className={category === 'All' ? 'active' : ''} onClick={() => onSelectCategory('All')}>✦ <span>Everything</span></button>
          {categories.map((item) => (
            <button
              key={item.name}
              className={category === item.name ? 'active' : ''}
              onClick={() => onSelectCategory(item.name)}
            >
              {item.emoji} <span>{item.name}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
