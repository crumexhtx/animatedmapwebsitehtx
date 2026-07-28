import type { CityRecord } from '@/lib/types'

type UnmappedCity = { name: string }

export function CatalogCoverageNote({
  stateName,
  cities,
  unmapped,
}: {
  stateName: string
  cities: CityRecord[]
  unmapped: UnmappedCity[]
}) {
  const names = cities.map((city) => city.name)
  const nameList =
    names.length <= 3
      ? names.join(', ')
      : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`

  return (
    <aside className="coverage-callout" role="note">
      <p className="coverage-kicker">Catalog coverage</p>
      <p>
        State-level averages on this page are unweighted means across the{' '}
        <strong>{cities.length}</strong> mapped MapsToIt {cities.length === 1 ? 'city' : 'cities'} only
        {names.length ? ` (${nameList})` : ''} — not a complete inventory of every municipality in{' '}
        {stateName}. Income, housing, and cost-of-living rollups therefore exclude unmapped places.
      </p>
      {unmapped.length ? (
        <div className="unmapped-directory">
          <h3>Commonly researched cities not yet mapped</h3>
          <p>
            These places do not have a full MapsToIt profile yet, so they are omitted from the averages above.
          </p>
          <ul className="unmapped-list">
            {unmapped.map((city) => (
              <li key={city.name}>{city.name}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  )
}
