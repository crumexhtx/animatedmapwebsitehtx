import { useEffect } from 'react'
import { ExternalLink, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { layerLabels } from '../data'
import { formatMetric, formatNumber } from '../lib/format'
import type { AtlasDataset, RegionMetric } from '../types'

export function RegionDrawer({
  dataset,
  region,
  onClose,
}: {
  dataset: AtlasDataset
  region: RegionMetric
  onClose: () => void
}) {
  const rank = dataset.regions.findIndex((item) => item.id === region.id) + 1
  const max = Math.max(...dataset.regions.map((item) => Math.abs(item.perCapita)), 1)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <aside className="fact-drawer" style={{ '--accent': dataset.accent } as CSSProperties}>
      <button className="drawer-close" onClick={onClose} aria-label="Close region"><X size={18} /></button>
      <div className="fact-category">{dataset.category} · #{rank} of {dataset.regions.length}</div>
      <div className="fact-index">{dataset.countryCode} / {region.id.toUpperCase()}</div>
      <div className="deck-badge">{layerLabels[dataset.mapLayer].toUpperCase()}</div>
      <p className="fact-eyebrow">{dataset.eyebrow}</p>
      <h2>{region.name}</h2>
      <p className="fact-summary">{dataset.summary}</p>

      <div className="metric-grid">
        <div>
          <small>METRIC</small>
          <strong>{formatMetric(region.perCapita)}</strong>
          <span>{dataset.unit}</span>
        </div>
        <div>
          <small>POPULATION</small>
          <strong>{formatNumber(region.population)}</strong>
          <span>context</span>
        </div>
        <div>
          <small>RAW</small>
          <strong>{formatNumber(region.rawValue)}</strong>
          <span>{dataset.metric}</span>
        </div>
      </div>

      <div className="bar-viz">
        <div className="bar-row">
          <div><span>This region</span><b>{formatMetric(region.perCapita)}</b></div>
          <i style={{ width: `${Math.max(6, (Math.abs(region.perCapita) / max) * 100)}%`, background: dataset.accent }} />
        </div>
        <div className="bar-row">
          <div><span>Dataset peak ({dataset.regions[0].name})</span><b>{formatMetric(dataset.regions[0].perCapita)}</b></div>
          <i style={{ width: '100%', background: '#e8e5dc' }} />
        </div>
      </div>

      <p className="data-disclaimer">Demo figures — illustrative approximations, not a live feed from the cited source.</p>

      <a href={dataset.exampleReference} target="_blank" rel="noreferrer">
        deck.gl example <ExternalLink size={13} />
      </a>
      <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">
        Source pattern: {dataset.sourceLabel} <ExternalLink size={13} />
      </a>
    </aside>
  )
}
