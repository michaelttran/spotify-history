'use client'

interface HourlyData {
  hour: number
  dow: number
  plays: number
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`
)

export function HourlyHeatmap({ data }: { data: HourlyData[] }) {
  if (!data?.length) return null

  const maxPlays = Math.max(...data.map(d => d.plays))

  const grid: Record<string, number> = {}
  data.forEach(d => { grid[`${d.dow}-${d.hour}`] = d.plays })

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 600 }}>
        {/* Hour labels */}
        <div className="flex mb-1" style={{ paddingLeft: 36 }}>
          {HOURS.map((h, i) => (
            <div key={i} className="flex-1 text-center" style={{
              fontSize: 9, color: '#5a5a5a', fontFamily: 'DM Mono, monospace'
            }}>
              {i % 3 === 0 ? h : ''}
            </div>
          ))}
        </div>
        {/* Grid */}
        {DAYS.map((day, dow) => (
          <div key={dow} className="flex items-center mb-0.5">
            <div style={{
              width: 32, fontSize: 10, color: '#888',
              fontFamily: 'DM Mono, monospace', flexShrink: 0
            }}>{day}</div>
            {Array.from({ length: 24 }, (_, hour) => {
              const plays = grid[`${dow}-${hour}`] ?? 0
              const intensity = plays / maxPlays
              return (
                <div key={hour} className="flex-1 rounded-sm mx-px"
                  style={{
                    height: 18,
                    background: intensity > 0
                      ? `rgba(200,169,110,${0.08 + intensity * 0.85})`
                      : 'rgba(255,255,255,0.02)',
                  }}
                  title={`${day} ${HOURS[hour]}: ${plays.toLocaleString()} plays`}
                />
              )
            })}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span style={{ fontSize: 10, color: '#5a5a5a', fontFamily: 'DM Mono, monospace' }}>less</span>
          {[0.05, 0.2, 0.4, 0.65, 0.9].map((v, i) => (
            <div key={i} className="rounded-sm" style={{
              width: 12, height: 12,
              background: `rgba(200,169,110,${0.08 + v * 0.85})`
            }} />
          ))}
          <span style={{ fontSize: 10, color: '#5a5a5a', fontFamily: 'DM Mono, monospace' }}>more</span>
        </div>
      </div>
    </div>
  )
}
