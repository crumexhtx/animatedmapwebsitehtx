'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PopulationHistory } from '@/lib/types'
import { formatNumber } from '@/lib/format'
import {
  expandYearlyPointsToMonthly,
  formatPopulationPeriod,
  monthlyPlaybackIntervalMs,
  type MonthlyPopulationPoint,
} from '@/lib/population-trend'

const WIDTH = 600
const HEIGHT = 200
const PAD_X = 8
const PAD_TOP = 16
const PAD_BOTTOM = 28

function buildPath(points: MonthlyPopulationPoint[]) {
  const ts = points.map((point) => point.t)
  const values = points.map((point) => point.population)
  const minT = Math.min(...ts)
  const maxT = Math.max(...ts)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const tSpan = Math.max(maxT - minT, 1 / 12)
  const valueSpan = Math.max(maxValue - minValue, 1)

  const coords = points.map((point) => {
    const x = PAD_X + ((point.t - minT) / tSpan) * (WIDTH - PAD_X * 2)
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

  return { line, area, coords, minT, maxT }
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
  const yearlyPoints = useMemo(() => history?.points ?? [], [history?.points])
  const monthlyPoints = useMemo(() => expandYearlyPointsToMonthly(yearlyPoints), [yearlyPoints])
  const lastIndex = Math.max(monthlyPoints.length - 1, 0)
  const playMs = monthlyPlaybackIntervalMs(yearlyPoints.length)
  const [pointIndex, setPointIndex] = useState(lastIndex)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    setPointIndex(lastIndex)
    setPlaying(false)
  }, [lastIndex, history?.source])

  useEffect(() => {
    if (!playing || reducedMotion || monthlyPoints.length < 2) return
    if (pointIndex >= lastIndex) {
      setPlaying(false)
      return
    }
    const id = window.setTimeout(() => {
      setPointIndex((value) => Math.min(value + 1, lastIndex))
    }, playMs)
    return () => window.clearTimeout(id)
  }, [playing, pointIndex, lastIndex, reducedMotion, monthlyPoints.length, playMs])

  const visiblePoints = useMemo(() => {
    if (reducedMotion || monthlyPoints.length < 2) return monthlyPoints
    return monthlyPoints.slice(0, pointIndex + 1)
  }, [monthlyPoints, pointIndex, reducedMotion])

  if (!history || yearlyPoints.length < 2 || monthlyPoints.length < 2) return null

  const first = yearlyPoints[0]
  const last = yearlyPoints[yearlyPoints.length - 1]
  const active = monthlyPoints[Math.min(pointIndex, lastIndex)]
  const pctChange = ((active.population - first.population) / first.population) * 100
  const fullPct = ((last.population - first.population) / first.population) * 100
  const direction = fullPct > 0.5 ? 'grew' : fullPct < -0.5 ? 'declined' : 'stayed roughly flat'
  const changeLabel =
    Math.abs(fullPct) < 0.5
      ? `stayed roughly flat (${fullPct >= 0 ? '+' : ''}${fullPct.toFixed(1)}%)`
      : `${direction} ${Math.abs(fullPct).toFixed(1)}%`

  const { line, area, coords } = buildPath(visiblePoints)
  const midIndex = Math.floor(coords.length / 2)
  const activeLabel = formatPopulationPeriod(active.year, active.month)
  const startYear = yearlyPoints[0].year
  const endYear = yearlyPoints[yearlyPoints.length - 1].year
  const midYear = Math.round((startYear + endYear) / 2)

  const togglePlay = () => {
    if (reducedMotion) return
    if (pointIndex >= lastIndex) setPointIndex(0)
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
          <strong>{activeLabel}</strong>
          <span>{formatNumber(active.population)} people</span>
          <span>
            {pctChange >= 0 ? '+' : ''}
            {pctChange.toFixed(1)}% vs {first.year}
          </span>
        </div>

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`${cityName} population, ${startYear} to ${activeLabel}`}
        >
          <path d={area} className="population-trend-area" />
          <path d={line} className="population-trend-line" />
          {coords.map((c, i) => {
            const isEndpoint = i === 0 || i === coords.length - 1
            const isActive = i === coords.length - 1
            if (!isEndpoint && !isActive) return null
            return (
              <circle
                key={`${visiblePoints[i].t}-${i}`}
                cx={c.x}
                cy={c.y}
                r={isActive ? 3.5 : 3}
                className="population-trend-dot"
              />
            )
          })}
          <text x={coords[0].x} y={HEIGHT - 8} className="population-trend-axis-label" textAnchor="start">
            {startYear}
          </text>
          {coords.length > 2 && (
            <text x={coords[midIndex].x} y={HEIGHT - 8} className="population-trend-axis-label" textAnchor="middle">
              {midYear}
            </text>
          )}
          <text x={coords[coords.length - 1].x} y={HEIGHT - 8} className="population-trend-axis-label" textAnchor="end">
            {pointIndex >= lastIndex ? endYear : Math.floor(active.t)}
          </text>
        </svg>

        {!reducedMotion && (
          <div className="year-play-controls">
            <button type="button" className="button button-secondary year-play-button" onClick={togglePlay}>
              {playing ? 'Pause' : pointIndex >= lastIndex ? 'Replay' : 'Play'}
            </button>
            <label className="year-play-slider">
              <span className="visually-hidden">Timeline</span>
              <input
                type="range"
                min={0}
                max={lastIndex}
                step={1}
                value={pointIndex}
                onChange={(event) => {
                  setPlaying(false)
                  setPointIndex(Number(event.target.value))
                }}
              />
              <span aria-hidden>{activeLabel}</span>
            </label>
          </div>
        )}
      </div>

      <p className="population-trend-source">
        Source: {history.source}. Playback steps monthly between annual Census PEP estimates.
      </p>
    </section>
  )
}
