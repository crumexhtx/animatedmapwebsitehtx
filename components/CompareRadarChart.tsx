'use client'

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { RadarCitySeries } from '@/lib/charts'
import { RADAR_METRIC_LABELS } from '@/lib/charts'

const COLORS = ['#0f6b5c', '#8a5a2b', '#1b3d34']

export function CompareRadarChart({ series }: { series: RadarCitySeries[] }) {
  if (series.length < 2) return null

  const keys = Object.keys(RADAR_METRIC_LABELS) as Array<keyof typeof RADAR_METRIC_LABELS>
  const data = keys.map((key) => {
    const row: Record<string, string | number> = {
      metric: RADAR_METRIC_LABELS[key],
    }
    for (const city of series) {
      row[city.slug] = city.scores[key]
    }
    return row
  })

  return (
    <div
      className="chart-frame"
      role="img"
      aria-label={`Radar comparison of ${series.map((city) => city.name).join(' vs ')}`}
    >
      <ResponsiveContainer width="100%" height={380}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#cfd9d2" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: '#4d5c56', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#4d5c56', fontSize: 11 }} />
          {series.map((city, index) => (
            <Radar
              key={city.slug}
              name={`${city.name}, ${city.stateCode}`}
              dataKey={city.slug}
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.22}
            />
          ))}
          <Legend />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #cfd9d2',
              background: '#fff',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
