import { ChevronRight, Compass } from 'lucide-react'
import { Link } from 'react-router'
import { categories, datasets } from '../data'
import type { DatasetCategory } from '../types'

export function DatasetsPage({
  category,
  onSelectCategory,
}: {
  category: DatasetCategory | 'All'
  onSelectCategory: (next: DatasetCategory | 'All') => void
}) {
  const catalogDatasets = datasets.filter(
    (dataset) => category === 'All' || dataset.category === category,
  )

  return (
    <article className="content-page datasets-index">
      <span className="panel-kicker"><Compass size={14} /> DATASET CATALOG · DEMO ATLAS</span>
      <h1>Every layer,<br /><em>explained.</em></h1>
      <p className="page-lead">
        Open a dataset page to see what it measures, which country it covers, and which public source the demo figures are modeled after.
      </p>
      <nav className="category-dock catalog-filters" aria-label="Dataset categories">
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
      <div className="dataset-catalog">
        {catalogDatasets.map((dataset) => (
          <Link key={dataset.id} className="dataset-card" to={`/datasets/${dataset.id}`}>
            <i style={{ background: dataset.accent }} />
            <span>
              <small>{dataset.country} · {dataset.category} · demo</small>
              <b>{dataset.title}</b>
              <em>{dataset.sourceLabel}</em>
            </span>
            <ChevronRight size={16} />
          </Link>
        ))}
        {!catalogDatasets.length && <div className="empty-state">No datasets in this category.</div>}
      </div>
    </article>
  )
}
