import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdSlot } from '@/components/AdSlot'
import { AffiliateZone } from '@/components/AffiliateZone'
import { AnswerSections } from '@/components/AnswerSections'
import { CityMapLazy } from '@/components/CityMapLazy'
import { CityStats } from '@/components/CityStats'
import { CityGallery } from '@/components/CityGallery'
import { CityUrlButton } from '@/components/CityUrlButton'
import { ContentSnapshot } from '@/components/ContentSnapshot'
import { NearbyCities } from '@/components/NearbyCities'
import { PopulationTrend } from '@/components/PopulationTrend'
import { SourceList } from '@/components/SourceList'
import {
  allCities,
  cityPath,
  comparePath,
  getCity,
  getNearbyCities,
  nationalBaselines,
  siteUrl,
  statePath,
} from '@/lib/catalog'
import { comparisonsForCity, comparisonPath } from '@/lib/comparison-pairs'
import {
  buildCityAnswerSections,
  buildCityDirectAnswer,
  buildCitySnapshotMetrics,
} from '@/lib/snapshot'
import { absoluteUrl, cityJsonLd, cityMetadata, safeJsonLd } from '@/lib/seo'

type Props = {
  params: Promise<{ state: string; city: string }>
}

export function generateStaticParams() {
  return allCities.map((city) => ({
    state: city.stateSlug,
    city: city.slug,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug } = await params
  const city = getCity(citySlug)
  if (!city) return {}
  return cityMetadata(city)
}

export default async function CityPage({ params }: Props) {
  const { state, city: citySlug } = await params
  const city = getCity(citySlug)
  if (!city || city.stateSlug !== state) notFound()

  const nearby = getNearbyCities(city)
  const comparePeer =
    nearby[0]?.slug ?? allCities.find((item) => item.slug !== city.slug)?.slug
  const relatedComparisons = comparisonsForCity(city.slug)
    .map((pair) => {
      const otherSlug = pair.a === city.slug ? pair.b : pair.a
      const other = getCity(otherSlug)
      if (!other) return null
      return { pair, other }
    })
    .filter(Boolean) as Array<{
    pair: ReturnType<typeof comparisonsForCity>[number]
    other: NonNullable<ReturnType<typeof getCity>>
  }>

  const directAnswer = buildCityDirectAnswer(city, nationalBaselines)
  const snapshotMetrics = buildCitySnapshotMetrics(city, nationalBaselines)
  const answerSections = buildCityAnswerSections(city, nationalBaselines)

  const placeLd = cityJsonLd(city)
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: answerSections.slice(0, 6).map((section) => ({
      '@type': 'Question',
      name: section.heading,
      acceptedAnswer: {
        '@type': 'Answer',
        text: section.answer,
      },
    })),
  }
  const webpageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${city.name}, ${city.state}`,
    description: directAnswer.slice(0, 300),
    dateModified: city.lastUpdated,
    url: absoluteUrl(cityPath(city)),
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.content-snapshot-answer', '.answer-lead'],
    },
  }

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(placeLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(webpageLd) }}
      />

      <div className="page-hero">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/cities">Cities</Link>
          <span>/</span>
          <Link href={statePath(city.stateSlug)}>{city.state}</Link>
          <span>/</span>
          <span>{city.name}</span>
        </nav>
        <div className="city-title-row">
          <h1>
            {city.name}, {city.state}
          </h1>
          <CityUrlButton
            url={`${siteUrl()}${cityPath(city)}`}
            label={`${city.name}, ${city.state}`}
          />
        </div>
        <p className="lead">
          Cost of living, housing, income, commute, climate, and safety — compiled for relocators researching {city.name}.
        </p>
      </div>

      <div className="city-layout">
        <div>
          <ContentSnapshot
            title={`How much does it cost to live in ${city.name}?`}
            directAnswer={directAnswer}
            asOf={city.lastUpdated}
            metrics={snapshotMetrics}
          />

          <CityGallery images={city.images} cityName={city.name} />

          <div className="city-map-panel">
            <CityMapLazy cities={allCities} focus={city} />
          </div>

          <CityStats city={city} national={nationalBaselines} />

          <PopulationTrend history={city.populationHistory} cityName={city.name} />

          <AnswerSections sections={answerSections} />

          <p className="compare-cta">
            <Link
              className="button"
              href={comparePeer ? comparePath([city.slug, comparePeer]) : '/compare'}
            >
              Compare {city.name} with another city
            </Link>
          </p>

          {relatedComparisons.length ? (
            <section className="answer-section">
              <h2>What nearby city comparisons involve {city.name}?</h2>
              <p className="answer-lead">
                These curated pair pages put {city.name} beside another high-intent destination with the same
                proprietary metrics table.
              </p>
              <ul className="city-list">
                {relatedComparisons.map(({ pair, other }) => (
                  <li key={pair.slug}>
                    <Link href={comparisonPath(pair.slug)}>
                      <strong>
                        {city.name} vs {other.name}
                      </strong>
                      <span>{pair.intent}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="prose">
            {city.description.split('\n\n').map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>

          {city.neighborhoods?.length ? (
            <>
              <h2>Neighborhoods often researched</h2>
              <ul className="neighborhoods">
                {city.neighborhoods.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </>
          ) : null}

          <AdSlot slotId="city-in-content" size="in-content" />

          <NearbyCities cities={nearby} fromSlug={city.slug} />
          <SourceList city={city} />

          <AffiliateZone category="moving" cityName={city.name} />
          <AffiliateZone category="renters-insurance" cityName={city.name} />
          <AffiliateZone category="real-estate" cityName={city.name} />

          <p className="lead">
            <Link href={cityPath(city)}>Canonical profile</Link>
            {' · '}
            <Link href={statePath(city.stateSlug)}>All {city.state} cities</Link>
            {' · '}
            <Link href="/cities">Full city index</Link>
          </p>
        </div>

        <aside className="sidebar">
          <AdSlot slotId="city-sidebar" />
          <p className="lead">
            State overview:{' '}
            <Link href={statePath(city.stateSlug)}>{city.state}</Link>
          </p>
        </aside>
      </div>
    </article>
  )
}
