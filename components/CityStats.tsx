import type { ReactNode } from 'react'
import type { CityRecord, NationalBaselines } from '@/lib/types'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { freshnessForKey } from '@/lib/source-freshness'
import { SourceFreshnessNote } from '@/components/SourceFreshnessNote'
import { compareCurrency, compareNumber, comparePoints, compareUnemployment } from '@/lib/stat-compare'
import { crimeRateNote, crimeSourceKind } from '@/lib/crime-source'
import Link from 'next/link'

type CompareTone = 'higher' | 'lower' | 'near' | 'neutral'

type StatItem = {
  label: string
  value: string
  note?: ReactNode
  compare?: {
    national: string
    deltaLabel: string
    tone: CompareTone
  }
}

function FreshnessNote({ city, source }: { city: CityRecord; source: 'census' | 'bls' | 'crime' | 'climate' | 'population' }) {
  const { label, stale } = freshnessForKey(city, source)
  if (!label) return null
  return <SourceFreshnessNote label={label} stale={stale} />
}

function statNote(base: string | undefined, freshness: ReactNode) {
  if (!base && !freshness) return undefined
  return (
    <>
      {base ? <span>{base}</span> : null}
      {base && freshness ? <br /> : null}
      {freshness}
    </>
  )
}

export function CityStats({
  city,
  national,
}: {
  city: CityRecord
  national: NationalBaselines
}) {
  const crimeKind = crimeSourceKind(city.crimeIndex.source)
  const crimeNeedsCaveat = crimeKind === 'unavailable' || crimeKind === 'curated'
  const latestPep = city.populationHistory?.points.at(-1)
  const populationNote = statNote(
    latestPep ? `City limits · Census PEP ${latestPep.year} estimate` : 'City limits · not metro/MSA',
    <FreshnessNote city={city} source="population" />,
  )
  const items: StatItem[] = [
    {
      label: 'Population',
      value: formatNumber(city.population),
      note: populationNote,
    },
    {
      label: 'Median household income',
      value: formatCurrency(city.medianHouseholdIncome),
      note: statNote('Incorporated place (ACS)', <FreshnessNote city={city} source="census" />),
      compare: compareCurrency(city.medianHouseholdIncome, national.medianHouseholdIncome, 'us'),
    },
    {
      label: 'Housing cost index',
      value: `${city.costOfLivingIndex}`,
      note: statNote('ACS home+rent vs U.S. (100 = avg)', <FreshnessNote city={city} source="census" />),
      compare: compareNumber(city.costOfLivingIndex, national.costOfLivingIndex, (v) => String(v), 'us'),
    },
    {
      label: 'Median home value',
      value: formatCurrency(city.medianHomePrice),
      note: statNote('City limits (ACS)', <FreshnessNote city={city} source="census" />),
      compare: compareCurrency(city.medianHomePrice, national.medianHomeValue, 'us'),
    },
    {
      label: 'Median rent',
      value: formatCurrency(city.medianRent),
      note: statNote('City limits (ACS)', <FreshnessNote city={city} source="census" />),
      compare: compareCurrency(city.medianRent, national.medianRent, 'us'),
    },
    {
      label: 'Unemployment',
      value: formatPercent(city.unemploymentRate),
      note: statNote('County LAUS · not city-only', <FreshnessNote city={city} source="bls" />),
      compare: compareUnemployment(city.unemploymentRate, national.unemploymentRate),
    },
    {
      label: 'Avg commute',
      value: `${city.commute.avgMinutes} min`,
      compare: compareNumber(city.commute.avgMinutes, national.commuteMinutes, (v) => String(v), 'catalog', ' min'),
    },
    ...(city.commute.walkScore != null
      ? [
          {
            label: 'Walk Score',
            value: String(city.commute.walkScore),
            compare: compareNumber(city.commute.walkScore, national.walkScore, (v) => String(v), 'catalog'),
          } satisfies StatItem,
        ]
      : []),
    {
      label: 'Violent crime rate',
      value: crimeKind === 'unavailable' ? 'Unavailable' : String(city.crimeIndex.violent),
      note: statNote(crimeRateNote(city.crimeIndex.source), <FreshnessNote city={city} source="crime" />),
      compare: crimeNeedsCaveat
        ? undefined
        : compareNumber(city.crimeIndex.violent, national.crimeViolent, (v) => String(v), 'catalog'),
    },
    {
      label: 'Property crime rate',
      value: crimeKind === 'unavailable' ? 'Unavailable' : String(city.crimeIndex.property),
      note: statNote(crimeRateNote(city.crimeIndex.source), <FreshnessNote city={city} source="crime" />),
      compare: crimeNeedsCaveat
        ? undefined
        : compareNumber(city.crimeIndex.property, national.crimeProperty, (v) => String(v), 'catalog'),
    },
    {
      label: 'Summer high',
      value: `${city.climate.avgHighSummer}°F`,
      note: <FreshnessNote city={city} source="climate" />,
      compare: comparePoints(city.climate.avgHighSummer, national.avgHighSummer, 'catalog', {
        nearThreshold: 1.5,
        formatNational: (v) => `${v}°F`,
      }),
    },
    {
      label: 'Winter low',
      value: `${city.climate.avgLowWinter}°F`,
      note: <FreshnessNote city={city} source="climate" />,
      compare: comparePoints(city.climate.avgLowWinter, national.avgLowWinter, 'catalog', {
        nearThreshold: 1.5,
        formatNational: (v) => `${v}°F`,
      }),
    },
    {
      label: 'Annual rainfall',
      value: `${city.climate.annualRainfall} in`,
      note: <FreshnessNote city={city} source="climate" />,
      compare: compareNumber(city.climate.annualRainfall, national.annualRainfall, (v) => String(v), 'catalog', ' in'),
    },
    {
      label: 'Sunny days',
      value: String(city.climate.sunnyDays),
      note: <FreshnessNote city={city} source="climate" />,
      compare: compareNumber(city.climate.sunnyDays, national.sunnyDays, (v) => String(v), 'catalog'),
    },
  ]

  return (
    <section className="stats-block" aria-label="City statistics compared with U.S. and catalog averages">
      <div className="stats-heading">
        <h2>Key figures</h2>
        <p>
          Each metric shows how {city.name} compares with a U.S. baseline (ACS/BLS nationals) or a MapsToIt catalog
          average (crime, climate, and commute). Income, housing, population, and crime are for the incorporated city
          (city limits), not the broader metro/MSA — unemployment is county-level (BLS LAUS).
        </p>
      </div>
      <dl className="stat-grid">
        {items.map((item) => (
          <div key={item.label} className="stat-cell">
            <dt>{item.label}</dt>
            <dd>
              {item.value}
              {item.note ? <small>{item.note}</small> : null}
              {item.compare ? (
                <small className={`stat-compare tone-${item.compare.tone}`}>
                  {item.compare.deltaLabel}
                  <span className="stat-compare-national">{item.compare.national}</span>
                </small>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      <aside className="crime-disclaimer" role="note">
        <p className="coverage-kicker">Safety context</p>
        <p>
          Citywide violent and property crime rates (often from FBI tables or agency aggregates) can misrepresent an
          entire municipality — risk is usually hyper-local. Inspect neighborhood and block-level patterns, local
          police department reports, and neighborhood mapping tools before relying on a single citywide number.
          Details on sources and vintage are in{' '}
          <Link href="/methodology">methodology</Link>
          {city.sources.fbi ? ` (this profile: ${city.sources.fbi})` : ''}.
        </p>
      </aside>
    </section>
  )
}
