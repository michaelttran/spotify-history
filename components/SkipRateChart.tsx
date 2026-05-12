'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface SkipData {
  year: number
  skip_rate: number
  total_plays: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 text-xs" style={{
      background: '#1a1a1a', border: '1px solid #2f2f2f', fontFamily: 'DM Mono, monospace'
    }}>
      <p style={{ color: '#e8e4dc', fontWeight: 600 }}>{label}</p>
      <p style={{ color: '#9b7bc8' }}>Skip rate: {(payload[0]?.value * 100).toFixed(1)}%</p>
    </div>
  )
}

export function SkipRateChart({ data }: { data: SkipData[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="0" />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} tickLine={false} axisLine={false}
          width={36} tick={{ fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} />
        <Line dataKey="skip_rate" type="monotone" stroke="#9b7bc8" strokeWidth={2}
          dot={{ fill: '#9b7bc8', r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
