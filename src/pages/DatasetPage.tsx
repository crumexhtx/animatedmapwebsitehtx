import { ArrowLeft, ArrowUpRight, ExternalLink } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { layerLabels } from '../data'
import type { AtlasDataset } from '../types'

export function DatasetPage({
  dataset,
  onViewMap,
}: {
  dataset: AtlasDataset
  onViewMap: () => void
}) {
  return (
    <article className="content-page dataset-detail-page" style={{ '--accent': dataset.accent } as CSSProperties}>
      <Link className="world-back" to="/datasets"><ArrowLeft size={15} /> All datasets</Link>
      <span className="panel-kicker">Demo dataset · {dataset.category} · {dataset.countryCode}</span>
      <h1>{dataset.title}</h1>
      <p className="page-lead">{dataset.summary}</p>
      <p className="data-banner">
        Figures shown here are <strong>demo approximations</strong> for exploring the visualization layer — not a live feed from the agency below.
      </p>

      <div className="dataset-meta">
        <div>
          <small>Country</small>
          <strong>{dataset.country}</strong>
        </div>
        <div>
          <small>Metric</small>
          <strong>{dataset.metric}</strong>
        </div>
        <div>
          <small>Layer</small>
          <strong>{layerLabels[dataset.mapLayer].split(' · ')[0]}</strong>
        </div>
        <div>
          <small>Source pattern</small>
          <strong>{dataset.sourceLabel}</strong>
        </div>
      </div>

      <div className="page-grid dataset-info-grid">
        <section>
          <small>01 · WHAT IT IS</small>
          <h2>{dataset.eyebrow}</h2>
          <p>{dataset.summary}</p>
        </section>
        <section>
          <small>02 · WHERE IT COMES FROM</small>
          <h2>Data source</h2>
          <p>
            Modeled after {dataset.sourceLabel}. Values are shown as {dataset.unit} for layer demonstration.
          </p>
          <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">
            Open source reference <ExternalLink size={13} />
          </a>
        </section>
        <section>
          <small>03 · WHERE IT MAPS</small>
          <h2>{dataset.country}</h2>
          <p>
            Coverage is {dataset.country} ({dataset.countryCode}), across {dataset.regions.length} mapped regions
            using a {layerLabels[dataset.mapLayer]}.
          </p>
          <a href={dataset.exampleReference} target="_blank" rel="noreferrer">
            deck.gl example <ExternalLink size={13} />
          </a>
        </section>
      </div>

      <button className="primary-cta" onClick={onViewMap}>
        View on map <ArrowUpRight size={16} />
      </button>
    </article>
  )
}
