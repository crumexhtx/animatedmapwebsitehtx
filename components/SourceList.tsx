import type { CityRecord } from '@/lib/types'
import { publicSourceLabel } from '@/lib/sources'

export function SourceList({ city }: { city: CityRecord }) {
  const entries = [
    city.sources.census && ['Census / ACS', city.sources.census],
    city.sources.bls && ['BLS', city.sources.bls],
    city.sources.fbi && ['Crime', city.sources.fbi],
    city.sources.noaa && ['Climate', city.sources.noaa],
    city.populationHistory && ['Population trend', city.populationHistory.source],
  ].filter(Boolean) as [string, string][]

  return (
    <section className="sources-block">
      <h2>Sources</h2>
      <ul>
        {entries.map(([label, value]) => (
          <li key={label}>
            <strong>{label}:</strong> {publicSourceLabel(value)}
          </li>
        ))}
      </ul>
      <p className="sources-updated">Last updated {city.lastUpdated}</p>
    </section>
  )
}
