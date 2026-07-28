import type { PopulationHistory } from '@/lib/types'
import { formatNumber } from '@/lib/format'

const WIDTH = 600
const HEIGHT = 200
const PAD_X = 8
const PAD_TOP = 16
const PAD_BOTTOM = 28

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

export function PopulationTrend({
  history,
  cityName,
}: {
  history?: PopulationHistory
  cityName: string
}) {
  if (!history || history.points.length < 2) return null

  const points = history.points
  const first = points[0]
  const last = points[points.length - 1]
  const pctChange = ((last.population - first.population) / first.population) * 100
  const direction = pctChange > 0.5 ? 'grew' : pctChange < -0.5 ? 'declined' : 'stayed roughly flat'
  const changeLabel =
    Math.abs(pctChange) < 0.5
      ? `stayed roughly flat (${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(1)}%)`
      : `${direction} ${Math.abs(pctChange).toFixed(1)}%`

  const { line, area, coords, minYear, maxYear } = buildPath(points)
  const midIndex = Math.floor(coords.length / 2)

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
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${cityName} population, ${minYear} to ${maxYear}`}>
          <path d={area} className="population-trend-area" />
          <path d={line} className="population-trend-line" />
          {coords.map((c, i) => (
            <circle key={points[i].year} cx={c.x} cy={c.y} r={i === 0 || i === coords.length - 1 ? 3.5 : 2} className="population-trend-dot" />
          ))}
          <text x={coords[0].x} y={HEIGHT - 8} className="population-trend-axis-label" textAnchor="start">
            {first.year}
          </text>
          {coords.length > 2 && (
            <text x={coords[midIndex].x} y={HEIGHT - 8} className="population-trend-axis-label" textAnchor="middle">
              {points[midIndex].year}
            </text>
          )}
          <text x={coords[coords.length - 1].x} y={HEIGHT - 8} className="population-trend-axis-label" textAnchor="end">
            {last.year}
          </text>
        </svg>
      </div>

      <p className="population-trend-source">Source: {history.source}</p>
    </section>
  )
}
