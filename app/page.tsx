import type { Metadata } from 'next'
import Link from 'next/link'
import { CityMapLazy } from '@/components/CityMapLazy'
import { StateFlag } from '@/components/StateFlag'
import { cityPath, getFeaturedCities } from '@/lib/catalog'
import { formatCurrency, formatNumber } from '@/lib/format'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default function HomePage() {
  const featured = getFeaturedCities().slice(0, 10)

  return (
    <>
      <section className="home-intro" aria-label="MapsToIt introduction">
        <p className="home-kicker">U.S. city relocation data</p>
        <h1>Research a U.S. city before you move.</h1>
        <p>
          Cost of living, safety, income, climate, and commute — mapped so you can browse places, then dig into full city
          profiles.
        </p>
        <div className="cta-row">
          <Link className="button" href="/cities" prefetch={false}>
            Browse cities
          </Link>
          <Link className="button button-secondary" href="/afford" prefetch={false}>
            Find a city
          </Link>
          <Link className="button button-secondary" href="/cities/rankings" prefetch={false}>
            Rankings
          </Link>
          <Link className="button button-secondary" href="/cities/cost-vs-safety" prefetch={false}>
            Cost vs safety
          </Link>
          <Link className="button button-secondary" href="/cities/state-costs" prefetch={false}>
            State costs
          </Link>
          <Link className="button button-secondary" href="/cities/population-over-time" prefetch={false}>
            Population over time
          </Link>
        </div>
      </section>

      <section className="home-map" aria-label="Interactive U.S. city map">
        <div className="home-map-frame">
          <CityMapLazy variant="hero" />
        </div>
        <p className="home-map-hint">Teal dots are cities · Tap one to open its profile</p>
      </section>

      <section className="section">
        <h2>Featured cities</h2>
        <p>Popular relocation destinations with complete MapsToIt profiles.</p>
        <ul className="city-list">
          {featured.map((city) => (
            <li key={city.slug}>
              <Link href={cityPath(city)} prefetch={false} className="city-list-link">
                <StateFlag stateCode={city.stateCode} stateName={city.state} />
                <span className="city-list-copy">
                  <strong>
                    {city.name}, {city.stateCode}
                  </strong>
                  <span>
                    {formatNumber(city.population)} people · Housing index {city.costOfLivingIndex} · homes ~
                    {formatCurrency(city.medianHomePrice)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
