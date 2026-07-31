'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CompareRadarChart } from '@/components/CompareRadarChart'
import type { CityRecord, NationalBaselines } from '@/lib/types'
import { buildCompareRows } from '@/lib/compare'
import { buildRadarSeries } from '@/lib/charts'
import { cityPath, comparePath } from '@/lib/paths'

type Option = Pick<CityRecord, 'slug' | 'name' | 'state' | 'stateCode'>

export function CompareCities({
  cities,
  national,
  initialSlugs = [],
}: {
  cities: CityRecord[]
  national: NationalBaselines
  initialSlugs?: string[]
}) {
  const options = useMemo(
    () =>
      [...cities]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((city) => ({
          slug: city.slug,
          name: city.name,
          state: city.state,
          stateCode: city.stateCode,
        })),
    [cities],
  )

  const defaults = useMemo(() => {
    const valid = initialSlugs.filter((slug) => options.some((city) => city.slug === slug))
    if (valid.length >= 2) return [valid[0], valid[1], valid[2] ?? '']
    if (valid.length === 1) return [valid[0], '', '']
    return ['', '', '']
  }, [initialSlugs, options])

  const [slotA, setSlotA] = useState(defaults[0])
  const [slotB, setSlotB] = useState(defaults[1])
  const [slotC, setSlotC] = useState(defaults[2])

  const selectedSlugs = [slotA, slotB, slotC].filter(Boolean)
  const selectedCities = selectedSlugs
    .map((slug) => cities.find((city) => city.slug === slug))
    .filter((city): city is CityRecord => Boolean(city))

  const rows = selectedCities.length >= 2 ? buildCompareRows(selectedCities, national) : []
  const radarSeries =
    selectedCities.length >= 2 ? buildRadarSeries(selectedCities, cities, national) : []

  return (
    <div className="compare-tool">
      <form
        className="compare-picker"
        onSubmit={(event) => {
          event.preventDefault()
          if (selectedSlugs.length < 2) return
          window.location.assign(comparePath(selectedSlugs))
        }}
      >
        <CitySelect
          id="compare-a"
          label="City A"
          value={slotA}
          options={options}
          exclude={[slotB, slotC]}
          onChange={setSlotA}
        />
        <CitySelect
          id="compare-b"
          label="City B"
          value={slotB}
          options={options}
          exclude={[slotA, slotC]}
          onChange={setSlotB}
        />
        <CitySelect
          id="compare-c"
          label="City C (optional)"
          value={slotC}
          options={options}
          exclude={[slotA, slotB]}
          onChange={setSlotC}
          allowEmpty
        />
        <button type="submit" className="button" disabled={selectedSlugs.length < 2}>
          Compare cities
        </button>
      </form>

      {selectedCities.length >= 2 ? (
        <>
          <div className="compare-heading">
            <h2>
              Side-by-side:{' '}
              {selectedCities.map((city) => `${city.name}, ${city.stateCode}`).join(' vs ')}
            </h2>
            <p>
              Figures are for incorporated city limits unless noted. Crime rates are citywide and can
              hide neighborhood variation — see{' '}
              <Link href="/methodology">methodology</Link>.
            </p>
          </div>

          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col">Metric</th>
                  {selectedCities.map((city) => (
                    <th key={city.slug} scope="col">
                      <Link href={cityPath(city)}>
                        {city.name}, {city.stateCode}
                      </Link>
                    </th>
                  ))}
                  <th scope="col">U.S. baseline</th>
                  <th scope="col">Context / gap</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {row.values.map((value, index) => (
                      <td key={`${row.label}-${index}`}>{value}</td>
                    ))}
                    <td>{row.national}</td>
                    <td className="compare-context">{row.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="chart-section" aria-labelledby="compare-radar-heading">
            <h2 id="compare-radar-heading">Profile shape</h2>
            <p>
              Normalized 0–100 scores across housing affordability, safety, income, and mild summer
              climate (higher = relatively more favorable within the MapsToIt catalog). Raw values
              remain in the table above.
            </p>
            <CompareRadarChart series={radarSeries} />
          </section>

          <p className="compare-share">
            Shareable link:{' '}
            <Link href={comparePath(selectedSlugs)}>{comparePath(selectedSlugs)}</Link>
          </p>
        </>
      ) : (
        <p className="compare-empty">Select at least two catalog cities to render a comparison matrix.</p>
      )}
    </div>
  )
}

function CitySelect({
  id,
  label,
  value,
  options,
  exclude,
  onChange,
  allowEmpty = false,
}: {
  id: string
  label: string
  value: string
  options: Option[]
  exclude: string[]
  onChange: (slug: string) => void
  allowEmpty?: boolean
}) {
  const blocked = new Set(exclude.filter(Boolean))
  return (
    <label className="compare-select" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allowEmpty ? 'None' : 'Choose a city'}</option>
        {options
          .filter((city) => city.slug === value || !blocked.has(city.slug))
          .map((city) => (
            <option key={city.slug} value={city.slug}>
              {city.name}, {city.stateCode}
            </option>
          ))}
      </select>
    </label>
  )
}
