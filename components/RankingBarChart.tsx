'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RankingCity } from '@/lib/charts'

const CHEAP_COLOR = '#0f6b5c'
const EXPENSIVE_COLOR = '#8a5a2b'

export function RankingBarChart({
  cities,
  mode,
}: {
  cities: RankingCity[]
  mode: 'cheapest' | 'expensive'
}) {
  const data = cities.map((city) => ({
    ...city,
    label: `${city.name}, ${city.stateCode}`,
  }))
  const fill = mode === 'cheapest' ? CHEAP_COLOR : EXPENSIVE_COLOR

  return (
    <div className="chart-frame" role="img" aria-label={`${mode} cities by housing cost index`}>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#cfd9d2" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 'dataMax']}
            tick={{ fill: '#4d5c56', fontSize: 12 }}
            label={{ value: 'Housing cost index (100 = U.S. avg)', position: 'insideBottom', offset: -2, fill: '#4d5c56', fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={128}
            tick={{ fill: '#14201c', fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => [`${String(value)}`, 'Housing cost index']}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #cfd9d2',
              background: '#fff',
            }}
          />
          <Bar dataKey="costOfLivingIndex" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry) => (
              <Cell key={entry.slug} fill={fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
