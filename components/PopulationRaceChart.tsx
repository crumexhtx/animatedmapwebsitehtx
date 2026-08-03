'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PopulationRaceCity } from '@/lib/charts'
import { formatNumber } from '@/lib/format'
import { cityPath } from '@/lib/paths'

const PLAY_MS = 900
const TOP_N = 15

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function PopulationRaceChart({
  cities,
  years,
}: {
  cities: PopulationRaceCity[]
  years: number[]
}) {
  const router = useRouter()
  const reducedMotion = usePrefersReducedMotion()
  const lastIndex = Math.max(years.length - 1, 0)
  const [yearIndex, setYearIndex] = useState(lastIndex)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing || reducedMotion || years.length < 2) return
    if (yearIndex >= lastIndex) {
      setPlaying(false)
      return
    }
    const id = window.setTimeout(() => {
      setYearIndex((value) => Math.min(value + 1, lastIndex))
    }, PLAY_MS)
    return () => window.clearTimeout(id)
  }, [playing, yearIndex, lastIndex, reducedMotion, years.length])

  const year = years[yearIndex] ?? years[0]
  const ranked = useMemo(() => {
    return cities
      .map((city) => ({
        ...city,
        population: city.byYear[year] ?? 0,
      }))
      .filter((city) => city.population > 0)
      .sort((a, b) => b.population - a.population || a.name.localeCompare(b.name))
      .slice(0, TOP_N)
  }, [cities, year])

  const maxPop = ranked[0]?.population ?? 1

  if (!years.length || !ranked.length) {
    return <p className="lead">Population history is not available yet.</p>
  }

  const togglePlay = () => {
    if (reducedMotion) return
    if (yearIndex >= lastIndex) setYearIndex(0)
    setPlaying((value) => !value)
  }

  return (
    <div className="chart-frame chart-frame-tall">
      <p className="population-race-year" aria-live="polite">
        {year}
      </p>

      {!reducedMotion && (
        <div className="year-play-controls" style={{ marginBottom: '1rem' }}>
          <button type="button" className="button button-secondary year-play-button" onClick={togglePlay}>
            {playing ? 'Pause' : yearIndex >= lastIndex ? 'Replay' : 'Play'}
          </button>
          <label className="year-play-slider">
            <span className="visually-hidden">Year</span>
            <input
              type="range"
              min={0}
              max={lastIndex}
              step={1}
              value={yearIndex}
              onChange={(event) => {
                setPlaying(false)
                setYearIndex(Number(event.target.value))
              }}
            />
            <span aria-hidden>
              {years[0]}–{years[lastIndex]}
            </span>
          </label>
        </div>
      )}

      <ol className="population-race-list" aria-label={`Largest catalog cities in ${year}`}>
        {ranked.map((city, index) => (
          <li key={city.slug}>
            <button
              type="button"
              className="population-race-row"
              onClick={() => router.push(cityPath(city))}
            >
              <div className="population-race-label">
                {index + 1}. {city.name}
                <span>{city.stateCode}</span>
              </div>
              <div className="population-race-track" aria-hidden>
                <div
                  className="population-race-bar"
                  style={{ width: `${Math.max((city.population / maxPop) * 100, 4)}%` }}
                />
              </div>
              <div className="population-race-value">{formatNumber(city.population)}</div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
