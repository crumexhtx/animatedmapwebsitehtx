'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PopulationHistory } from '@/lib/types'
import { formatNumber } from '@/lib/format'

const WIDTH = 600
const HEIGHT = 200
const PAD_X = 8
const PAD_TOP = 16
const PAD_BOTTOM = 28
const PLAY_MS = 700

function buildPath(points: { year: number; population: number }[]) {
  const years = points.map((point) => point.year)
  const values = points.map((point) => point.population)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const yearSpan = Math.max(maxYear - minYear, 1)
  const valueSpan = Math.max(maxValue - minValue, 1)

  const coords = points.map((point) => {
    const x = PAD_X + ((point.year - minYear) / yearSpan) * (WIDTH - PAD_X * 2)
    const y =
      HEIGHT -
      PAD_BOTTOM -
      ((point.population - minValue) / valueSpan) * (HEIGHT - PAD_TOP - PAD_BOTTOM)
    return { x, y }
  })

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  const area =
    `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${HEIGHT - PAD_BOTTOM} ` +
    `L ${coords[0].x.toFixed(1)} ${HEIGHT - PAD_BOTTOM} Z`

  return { line, area, coords, minYear, maxYear }
}

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

export function PopulationTrend({
  history,
  cityName,
}: {
  history?: PopulationHistory
  cityName: string
}) {
  const reducedMotion = usePrefersReducedMotion()
  const points = history?.points ?? []
  const lastIndex = Math.max(points.length - 1, 0)
  const [yearIndex, setYearIndex] = useState(lastIndex)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    setYearIndex(lastIndex)
    setPlaying(false)
  }, [lastIndex, history?.source])

  useEffect(() => {
    if (!playing || reducedMotion || points.length < 2) return
    if (yearIndex >= lastIndex) {
      setPlaying(false)
      return
    }
    const id = window.setTimeout(() => {
      setYearIndex((value) => Math.min(value + 1, lastIndex))
    }, PLAY_MS)
    return () => window.clearTimeout(id)
  }, [playing, yearIndex, lastIndex, reducedMotion, points.length])

  const visiblePoints = useMemo(() => {
    if (reducedMotion || points.length < 2) return points
    return points.slice(0, yearIndex + 1)
  }, [points, yearIndex, reducedMotion])

  if (!history || points.length < 2) return null

  const first = points[0]
  const last = points[points.length - 1]
  const active = points[Math.min(yearIndex, lastIndex)]
  const pctChange = ((active.population - first.population) / first.population) * 100
  const fullPct = ((last.population - first.population) / first.population) * 100
  const direction = fullPct > 0.5 ? 'grew' : fullPct < -0.5 ? 'declined' : 'stayed roughly flat'
  const changeLabel =
    Math.abs(fullPct) < 0.5
      ? `stayed roughly flat (${fullPct >= 0 ? '+' : ''}${fullPct.toFixed(1)}%)`
      : `${direction} ${Math.abs(fullPct).toFixed(1)}%`

  const { line, area, coords, minYear, maxYear } = buildPath(visiblePoints)
  const midIndex = Math.floor(coords.length / 2)

  const togglePlay = () => {
    if (reducedMotion) return
    if (yearIndex >= lastIndex) setYearIndex(0)
    setPlaying((value) => !value)
  }

  return (
    <section className="stats-block" aria-label="Population trend">
      <div className="stats-heading">
        <h2>Population trend</h2>
        <p>
          {cityName} {changeLabel} from {formatNumber(first.population)} in {first.year} to{' '}
          {formatNumber(last.population)} in {last.year}.
        </p>
      </div>

      <div className="population-trend-chart">
        <div className="population-trend-readout" aria-live="polite">
          <strong>{active.year}</strong>
          <span>{formatNumber(active.population)} people</span>
          <span>
            {pctChange >= 0 ? '+' : ''}
            {pctChange.toFixed(1)}% vs {first.year}
          </span>
        </div>

        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${cityName} population, ${minYear} to ${active.year}`}>
          <path d={area} className="population-trend-area" />
          <path d={line} className="population-trend-line" />
          {coords.map((c, i) => (
            <circle
              key={visiblePoints[i].year}
              cx={c.x}
              cy={c.y}
              r={i === 0 || i === coords.length - 1 ? 3.5 : 2}
              className="population-trend-dot"
            />
          ))}
          <text x={coords[0].x} y={HEIGHT - 8} className="population-trend-axis-label" textAnchor="start">
            {visiblePoints[0].year}
          </text>
          {coords.length > 2 && (
            <text x={coords[midIndex].x} y={HEIGHT - 8} className="population-trend-axis-label" textAnchor="middle">
              {visiblePoints[midIndex].year}
            </text>
          )}
          <text x={coords[coords.length - 1].x} y={HEIGHT - 8} className="population-trend-axis-label" textAnchor="end">
            {active.year}
          </text>
        </svg>

        {!reducedMotion && (
          <div className="year-play-controls">
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
              <span aria-hidden>{active.year}</span>
            </label>
          </div>
        )}
      </div>

      <p className="population-trend-source">Source: {history.source}</p>
    </section>
  )
}
