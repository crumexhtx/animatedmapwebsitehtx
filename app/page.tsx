import Link from 'next/link'
import { CityMapLazy } from '@/components/CityMapLazy'
import { cityPath, getFeaturedCities, allCities } from '@/lib/catalog'
import { formatCurrency, formatNumber } from '@/lib/format'

export default function HomePage() {
  const featured = getFeaturedCities().slice(0, 10)

  return (
    <>
      <section className="home-hero" aria-label="MapsToIt city explorer">
        <div className="home-hero-map">
          <CityMapLazy cities={allCities} variant="hero" />
        </div>
        <div className="home-hero-scrim" aria-hidden />
        <div className="home-hero-copy">
          <p className="home-brand">
            Maps<span>ToIt</span>
          </p>
          <h1>Research a U.S. city before you move.</h1>
          <p>
            Cost of living, safety, income, climate, and commute — mapped so you can browse places, then dig into full city profiles.
          </p>
          <div className="cta-row">
            <Link className="button" href="/cities">
              Browse cities
            </Link>
            <Link className="button button-secondary" href="/methodology">
              How we source data
            </Link>
          </div>
        </div>
        <p className="home-hero-map-hint">Two-finger drag to explore · Tap a city</p>
      </section>

      <section className="section">
        <h2>Featured cities</h2>
        <p>Popular relocation destinations with complete MapsToIt profiles.</p>
        <ul className="city-list">
          {featured.map((city) => (
            <li key={city.slug}>
              <Link href={cityPath(city)}>
                <strong>
                  {city.name}, {city.stateCode}
                </strong>
                <span>
                  {formatNumber(city.population)} people · COL {city.costOfLivingIndex} · homes ~
                  {formatCurrency(city.medianHomePrice)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
