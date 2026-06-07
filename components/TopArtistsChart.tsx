'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ArtistData {
  artist_name: string
  plays: number
  hours: number
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg p-3 text-xs" style={{
      background: '#1a1a1a', border: '1px solid #2f2f2f', fontFamily: 'DM Mono, monospace'
    }}>
      <p style={{ color: '#e8e4dc', fontWeight: 600 }}>{d.artist_name}</p>
      <p style={{ color: '#1DB954' }}>{d.plays?.toLocaleString()} plays</p>
      <p style={{ color: '#888' }}>{d.hours?.toFixed(0)} hours</p>
    </div>
  )
}

export function TopArtistsChart({ data }: { data: ArtistData[] }) {
  const top = data?.slice(0, 15) ?? []
  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={top} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
        <XAxis type="number" tickLine={false} axisLine={false}
          tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 10, fontFamily: 'DM Mono, monospace', fill: '#888' }} />
        <YAxis type="category" dataKey="artist_name" tickLine={false} axisLine={false}
          width={130} tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fill: '#c8c4bc' }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="plays" radius={[0, 3, 3, 0]}>
          {top.map((_, i) => (
            <Cell key={i} fill={i === 0 ? '#1DB954' : i < 3 ? 'rgba(29,185,84,0.5)' : 'rgba(29,185,84,0.2)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
