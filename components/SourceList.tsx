import type { CityRecord } from '@/lib/types'
import { publicSourceLabel } from '@/lib/sources'
import { formatFreshnessLabel, freshnessForKey, resolveSourceFreshness } from '@/lib/source-freshness'
import { SourceFreshnessNote, STALE_TOOLTIP, StaleInfoIcon } from '@/components/SourceFreshnessNote'

const SOURCE_KEYS = [
  { label: 'Census / ACS', key: 'census' as const, value: (city: CityRecord) => city.sources.census },
  { label: 'BLS', key: 'bls' as const, value: (city: CityRecord) => city.sources.bls },
  { label: 'Crime', key: 'crime' as const, value: (city: CityRecord) => city.sources.fbi },
  { label: 'Climate', key: 'climate' as const, value: (city: CityRecord) => city.sources.noaa },
  {
    label: 'Population trend',
    key: 'population' as const,
    value: (city: CityRecord) => city.populationHistory?.source,
  },
]

export function SourceList({ city }: { city: CityRecord }) {
  const freshness = resolveSourceFreshness(city)
  const crimeStale = freshness.crime?.vintage?.includes('2019')

  const entries = SOURCE_KEYS.map(({ label, key, value }) => {
    const sourceValue = value(city)
    if (!sourceValue) return null
    const { entry, stale } = freshnessForKey(city, key)
    const asOfLabel = formatFreshnessLabel(entry)
    return { label, sourceValue, asOfLabel, stale }
  }).filter(Boolean) as Array<{
    label: string
    sourceValue: string
    asOfLabel: string | null
    stale: boolean
  }>

  return (
    <section className="sources-block">
      <h2>Sources</h2>
      <ul>
        {entries.map(({ label, sourceValue, asOfLabel, stale }) => (
          <li key={label}>
            <strong>{label}:</strong> {publicSourceLabel(sourceValue)}
            {asOfLabel ? (
              <>
                {' '}
                —{' '}
                <SourceFreshnessNote label={asOfLabel} stale={stale} className="source-freshness source-freshness-inline" />
              </>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="sources-updated">
        Catalog refreshed {city.lastUpdated}
        {crimeStale ? (
          <>
            {' '}
            <StaleInfoIcon tip={`Crime figures may use an older FBI vintage than income or housing. ${STALE_TOOLTIP}`} />
          </>
        ) : null}
      </p>
    </section>
  )
}
