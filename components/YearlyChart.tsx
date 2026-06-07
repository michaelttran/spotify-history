'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'

interface YearlyData {
  year: number
  plays: number
  unique_tracks: number
  hours_played: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 text-xs" style={{
      background: '#1a1a1a',
      border: '1px solid #2f2f2f',
      fontFamily: 'DM Mono, monospace'
    }}>
      <p className="font-semibold mb-2" style={{ color: '#e8e4dc' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

export function YearlyChart({ data }: { data: YearlyData[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="0" />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="plays" orientation="left" tickLine={false} axisLine={false}
          tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={32} />
        <YAxis yAxisId="hours" orientation="right" tickLine={false} axisLine={false}
          tickFormatter={v => `${v}h`} width={40} />
        <Tooltip content={<CustomTooltip />} />
        <Bar yAxisId="plays" dataKey="plays" name="Plays" fill="rgba(29,185,84,0.25)"
          radius={[3, 3, 0, 0]} />
        <Line yAxisId="hours" dataKey="hours_played" name="Hours" type="monotone"
          stroke="#1DB954" strokeWidth={2} dot={{ fill: '#1DB954', r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
