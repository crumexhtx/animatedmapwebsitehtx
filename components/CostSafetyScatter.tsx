'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { cityPath } from '@/lib/paths'

export type ScatterPoint = {
  slug: string
  name: string
  stateCode: string
  stateSlug: string
  costOfLivingIndex: number
  violentCrime: number
  medianHomePrice: number
  population: number
}

export function CostSafetyScatter({ points }: { points: ScatterPoint[] }) {
  const router = useRouter()
  const [active, setActive] = useState<ScatterPoint | null>(null)
  const data = useMemo(() => points, [points])

  return (
    <div className="chart-frame chart-frame-tall" role="img" aria-label="Cost of living versus violent crime scatter plot">
      <ResponsiveContainer width="100%" height={480}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 28, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cfd9d2" />
          <XAxis
            type="number"
            dataKey="costOfLivingIndex"
            name="Housing cost index"
            tick={{ fill: '#4d5c56', fontSize: 12 }}
            label={{
              value: 'Housing cost index (100 = U.S. avg)',
              position: 'insideBottom',
              offset: -12,
              fill: '#4d5c56',
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            dataKey="violentCrime"
            name="Violent crime"
            tick={{ fill: '#4d5c56', fontSize: 12 }}
            label={{
              value: 'Violent crime rate per 100k',
              angle: -90,
              position: 'insideLeft',
              fill: '#4d5c56',
              fontSize: 12,
            }}
          />
          <ZAxis type="number" dataKey="population" range={[40, 220]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active: tipActive, payload }) => {
              if (!tipActive || !payload?.length) return null
              const point = payload[0].payload as ScatterPoint
              return (
                <div className="chart-tooltip">
                  <strong>
                    {point.name}, {point.stateCode}
                  </strong>
                  <span>Housing index {point.costOfLivingIndex}</span>
                  <span>Violent crime {point.violentCrime} / 100k</span>
                  <span className="chart-tooltip-hint">Click to open profile</span>
                </div>
              )
            }}
          />
          <Scatter
            data={data}
            fill="#0f6b5c"
            fillOpacity={0.7}
            onClick={(item) => {
              const point = item as unknown as ScatterPoint
              if (point?.slug) router.push(cityPath(point))
            }}
            onMouseEnter={(item) => setActive(item as unknown as ScatterPoint)}
            onMouseLeave={() => setActive(null)}
            style={{ cursor: 'pointer' }}
          />
        </ScatterChart>
      </ResponsiveContainer>
      {active ? (
        <p className="chart-active" aria-live="polite">
          Selected: {active.name}, {active.stateCode} — housing index {active.costOfLivingIndex}, violent
          crime {active.violentCrime}/100k
        </p>
      ) : (
        <p className="chart-active chart-active-muted">Hover a point for details · click to open the city profile</p>
      )}
    </div>
  )
}
