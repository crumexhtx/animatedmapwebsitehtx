import Link from 'next/link'
import type { CityRecord } from '@/lib/types'
import { cityPath, comparePath, statePath } from '@/lib/catalog'
import { formatCurrency, formatNumber } from '@/lib/format'

export function NearbyCities({
  cities,
  fromSlug,
}: {
  cities: CityRecord[]
  fromSlug?: string
}) {
  if (!cities.length) return null

  return (
    <section className="nearby-block">
      <h2>Nearby & similar cities</h2>
      <p>Continue researching with these internal links — each page is a full data profile.</p>
      <ul className="nearby-list">
        {cities.map((city) => (
          <li key={city.slug}>
            <Link href={cityPath(city)}>
              <strong>{city.name}, {city.stateCode}</strong>
              <span>
                {formatNumber(city.population)} people · homes ~{formatCurrency(city.medianHomePrice)}
              </span>
            </Link>
            <div className="nearby-actions">
              <Link className="nearby-state" href={statePath(city.stateSlug)}>
                {city.state}
              </Link>
              {fromSlug ? (
                <Link className="nearby-compare" href={comparePath([fromSlug, city.slug])}>
                  Compare
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
