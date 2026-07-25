import type { CityRecord } from '@/lib/types'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'

export function CityStats({ city }: { city: CityRecord }) {
  const items = [
    { label: 'Population', value: formatNumber(city.population) },
    { label: 'Median household income', value: formatCurrency(city.medianHouseholdIncome) },
    { label: 'Cost of living index', value: `${city.costOfLivingIndex}`, note: '100 = U.S. avg' },
    { label: 'Median home price', value: formatCurrency(city.medianHomePrice) },
    { label: 'Median rent', value: formatCurrency(city.medianRent) },
    { label: 'Unemployment', value: formatPercent(city.unemploymentRate) },
    { label: 'Avg commute', value: `${city.commute.avgMinutes} min` },
    ...(city.commute.walkScore != null
      ? [{ label: 'Walk Score', value: String(city.commute.walkScore) }]
      : []),
    { label: 'Violent crime index', value: String(city.crimeIndex.violent) },
    { label: 'Property crime index', value: String(city.crimeIndex.property) },
    { label: 'Summer high', value: `${city.climate.avgHighSummer}°F` },
    { label: 'Winter low', value: `${city.climate.avgLowWinter}°F` },
    { label: 'Annual rainfall', value: `${city.climate.annualRainfall} in` },
    { label: 'Sunny days', value: String(city.climate.sunnyDays) },
  ]

  return (
    <dl className="stat-grid">
      {items.map((item) => (
        <div key={item.label} className="stat-cell">
          <dt>{item.label}</dt>
          <dd>
            {item.value}
            {'note' in item && item.note ? <small>{item.note}</small> : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}
