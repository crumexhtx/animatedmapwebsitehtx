import type { CityRecord, NationalBaselines } from '@/lib/types'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import Link from 'next/link'

type CompareTone = 'higher' | 'lower' | 'near' | 'neutral'

type StatItem = {
  label: string
  value: string
  note?: string
  compare?: {
    national: string
    deltaLabel: string
    tone: CompareTone
  }
}

function pctDelta(city: number, national: number) {
  if (!Number.isFinite(city) || !Number.isFinite(national) || national === 0) return null
  return ((city - national) / Math.abs(national)) * 100
}

function toneFromDelta(delta: number): CompareTone {
  if (Math.abs(delta) < 5) return 'near'
  return delta > 0 ? 'higher' : 'lower'
}

function compareCurrency(city: number, national: number): StatItem['compare'] {
  const delta = pctDelta(city, national)
  if (delta == null) return undefined
  const abs = Math.abs(delta)
  const direction = delta >= 0 ? 'above' : 'below'
  return {
    national: formatCurrency(national),
    deltaLabel:
      abs < 5 ? `Near U.S. avg (${formatCurrency(national)})` : `${abs.toFixed(0)}% ${direction} U.S. avg`,
    tone: toneFromDelta(delta),
  }
}

function compareNumber(
  city: number,
  national: number,
  formatNational: (value: number) => string,
  unit = '',
): StatItem['compare'] {
  const delta = pctDelta(city, national)
  if (delta == null) return undefined
  const abs = Math.abs(delta)
  const direction = delta >= 0 ? 'above' : 'below'
  return {
    national: `${formatNational(national)}${unit}`,
    deltaLabel:
      abs < 5
        ? `Near U.S. avg (${formatNational(national)}${unit})`
        : `${abs.toFixed(0)}% ${direction} U.S. avg`,
    tone: toneFromDelta(delta),
  }
}

function comparePoints(city: number, national: number, unit: string): StatItem['compare'] {
  const delta = city - national
  if (!Number.isFinite(delta)) return undefined
  const abs = Math.abs(delta)
  const direction = delta >= 0 ? 'above' : 'below'
  return {
    national: `${national}${unit}`,
    deltaLabel:
      abs < 1.5
        ? `Near U.S. avg (${national}${unit})`
        : `${abs.toFixed(1)}${unit} ${direction} U.S. avg`,
    tone: Math.abs(delta) < 1.5 ? 'near' : delta > 0 ? 'higher' : 'lower',
  }
}

export function CityStats({
  city,
  national,
}: {
  city: CityRecord
  national: NationalBaselines
}) {
  const crimeUnavailable = city.crimeIndex.source === 'data unavailable'
  // Curated-seed crime figures are a small 0-100 launch placeholder, not a real FBI
  // per-100k rate — comparing it against the national per-100k average would be
  // misleading, so treat it like the "unavailable" case for the compare column.
  const crimeIsCuratedSeed = city.crimeIndex.source.includes('curated')
  const crimeNeedsCaveat = crimeUnavailable || crimeIsCuratedSeed
  // city.population is already the latest Census PEP point when one exists (set once, at
  // build time, in build-catalog.ts) — read it directly here rather than recomputing it, so
  // this display can't drift out of sync with the trend chart or any other consumer again.
  const latestPep = city.populationHistory?.points.at(-1)
  const populationNote = latestPep
    ? `City limits · Census PEP ${latestPep.year} estimate`
    : 'City limits · not metro/MSA'
  const items: StatItem[] = [
    {
      label: 'Population',
      value: formatNumber(city.population),
      note: populationNote,
    },
    {
      label: 'Median household income',
      value: formatCurrency(city.medianHouseholdIncome),
      note: 'Incorporated place (ACS)',
      compare: compareCurrency(city.medianHouseholdIncome, national.medianHouseholdIncome),
    },
    {
      label: 'Housing cost index',
      value: `${city.costOfLivingIndex}`,
      note: 'ACS home+rent vs U.S. (100 = avg)',
      compare: compareNumber(city.costOfLivingIndex, national.costOfLivingIndex, (v) => String(v)),
    },
    {
      label: 'Median home value',
      value: formatCurrency(city.medianHomePrice),
      note: 'City limits (ACS)',
      compare: compareCurrency(city.medianHomePrice, national.medianHomeValue),
    },
    {
      label: 'Median rent',
      value: formatCurrency(city.medianRent),
      note: 'City limits (ACS)',
      compare: compareCurrency(city.medianRent, national.medianRent),
    },
    {
      label: 'Unemployment',
      value: formatPercent(city.unemploymentRate),
      note: 'County LAUS · not city-only',
      compare: comparePoints(city.unemploymentRate, national.unemploymentRate, ' pts'),
    },
    {
      label: 'Avg commute',
      value: `${city.commute.avgMinutes} min`,
      compare: compareNumber(city.commute.avgMinutes, national.commuteMinutes, (v) => String(v), ' min'),
    },
    ...(city.commute.walkScore != null
      ? [
          {
            label: 'Walk Score',
            value: String(city.commute.walkScore),
            compare: compareNumber(city.commute.walkScore, national.walkScore, (v) => String(v)),
          } satisfies StatItem,
        ]
      : []),
    {
      label: 'Violent crime rate',
      value: crimeUnavailable ? 'Unavailable' : String(city.crimeIndex.violent),
      note: crimeUnavailable
        ? 'FBI CDE gap'
        : crimeIsCuratedSeed
          ? 'launch estimate, not FBI-verified yet'
          : 'annualized per 100k · citywide',
      compare: crimeNeedsCaveat
        ? undefined
        : compareNumber(city.crimeIndex.violent, national.crimeViolent, (v) => String(v)),
    },
    {
      label: 'Property crime rate',
      value: crimeUnavailable ? 'Unavailable' : String(city.crimeIndex.property),
      note: crimeUnavailable
        ? 'FBI CDE gap'
        : crimeIsCuratedSeed
          ? 'launch estimate, not FBI-verified yet'
          : 'annualized per 100k · citywide',
      compare: crimeNeedsCaveat
        ? undefined
        : compareNumber(city.crimeIndex.property, national.crimeProperty, (v) => String(v)),
    },
    {
      label: 'Summer high',
      value: `${city.climate.avgHighSummer}°F`,
      compare: comparePoints(city.climate.avgHighSummer, national.avgHighSummer, '°F'),
    },
    {
      label: 'Winter low',
      value: `${city.climate.avgLowWinter}°F`,
      compare: comparePoints(city.climate.avgLowWinter, national.avgLowWinter, '°F'),
    },
    {
      label: 'Annual rainfall',
      value: `${city.climate.annualRainfall} in`,
      compare: compareNumber(city.climate.annualRainfall, national.annualRainfall, (v) => String(v), ' in'),
    },
    {
      label: 'Sunny days',
      value: String(city.climate.sunnyDays),
      compare: compareNumber(city.climate.sunnyDays, national.sunnyDays, (v) => String(v)),
    },
  ]

  return (
    <section className="stats-block" aria-label="City statistics compared with national averages">
      <div className="stats-heading">
        <h2>Key figures</h2>
        <p>
          Each metric shows how {city.name} compares with the U.S. baseline (ACS/BLS nationals where available;
          catalog-city averages for crime, climate, and commute). Income, housing, population, and crime are for the
          incorporated city (city limits), not the broader metro/MSA — unemployment is county-level (BLS LAUS).
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
                  <span className="stat-compare-national">U.S. {item.compare.national}</span>
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
