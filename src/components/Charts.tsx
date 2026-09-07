import type { DomainBarItem } from '../lib/reports'
import { DIFFICULTY_LABELS } from '../lib/adaptive/types'

export interface LineChartPoint {
  label: string
  value: number
  subLabel?: string
}

export interface LineTrendChartProps {
  data: LineChartPoint[]
  title: string
  unit?: string
  color?: string
  minVal?: number
  maxVal?: number
  height?: number
  emptyMessage?: string
}

/**
 * Lightweight, Mobile-First Responsive SVG Line Trend Chart
 * Renders crisp on mobile screens with zero external charting dependencies.
 */
export function LineTrendChart({
  data,
  title,
  unit = '',
  color = 'var(--ink)',
  minVal,
  maxVal,
  height = 160,
  emptyMessage = 'Complete more sessions to see your performance trend.',
}: LineTrendChartProps) {
  if (!data || data.length < 2) {
    return (
      <div
        className="card"
        style={{
          borderRadius: 20,
          padding: '24px 20px',
          textAlign: 'center',
        }}
      >
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          {title}
        </span>
        <div style={{ padding: '24px 12px', background: 'var(--surface-muted)', borderRadius: 16, border: '1px dashed var(--border)' }}>
          <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>📊</span>
          <strong style={{ display: 'block', fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>
            Not enough activity yet
          </strong>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0, lineHeight: 1.4 }}>
            {emptyMessage}
          </p>
        </div>
      </div>
    )
  }

  const width = 320
  const paddingLeft = 36
  const paddingRight = 20
  const paddingTop = 20
  const paddingBottom = 30
  const plotWidth = width - paddingLeft - paddingRight
  const plotHeight = height - paddingTop - paddingBottom

  const values = data.map((d) => d.value)
  const computedMin = minVal !== undefined ? minVal : Math.min(...values)
  const computedMax = maxVal !== undefined ? maxVal : Math.max(...values)
  const range = computedMax === computedMin ? 1 : computedMax - computedMin

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * plotWidth
    const y = paddingTop + plotHeight - ((d.value - computedMin) / range) * plotHeight
    return { x, y, ...d }
  })

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`
  }, '')

  const areaD = `${pathD} L ${points[points.length - 1].x},${paddingTop + plotHeight} L ${points[0].x},${paddingTop + plotHeight} Z`
  const gradientId = `grad_${title.replace(/[^a-zA-Z0-9]/g, '_')}`

  return (
    <div
      className="card"
      style={{
        borderRadius: 20,
        padding: '20px 16px',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>
          {data[data.length - 1].value}
          {unit}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = paddingTop + plotHeight * ratio
          const gridVal = Math.round(computedMax - ratio * range)
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fontWeight="600"
                fill="var(--ink-muted)"
              >
                {gridVal}
                {unit}
              </text>
            </g>
          )
        })}

        {/* Shaded Area Under Curve */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Trend Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Point nodes with values */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="var(--card)" stroke={color} strokeWidth="2.5" />
            <text
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="var(--ink-muted)"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

/**
 * Domain Horizontal Bar Chart
 * Compares task proficiency across cognitive domains with clean visual progress tracks.
 */
export function DomainBarChart({ items }: { items: DomainBarItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="card" style={{ padding: '24px 20px', borderRadius: 20, textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--ink-muted)', margin: 0 }}>No domain activity recorded yet.</p>
      </div>
    )
  }

  const domainIcons: Record<string, string> = {
    memory: '🧠',
    attention: '🎯',
    recognition: '🔍',
    recall: '💡',
    sequencing: '🔢',
    visual_recognition: '👁️',
    auditory_recognition: '🎵',
    problem_solving: '🧩',
  }

  return (
    <div className="card" style={{ padding: '24px 20px', borderRadius: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          COGNITIVE DOMAIN COMPARISON
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 600 }}>Task Proficiency</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map((item) => {
          const icon = domainIcons[item.domain] || '🌱'
          const pct = item.attempts > 0 ? item.score : 0
          const barColor =
            item.score >= 75 ? 'var(--success)' : item.score >= 50 ? 'var(--warn)' : 'var(--error)'

          return (
            <div key={item.domain}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                    {item.label.replace(' Task Performance', '')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)', background: 'var(--surface-muted)', padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>
                    {DIFFICULTY_LABELS[item.difficulty] || `Diff ${item.difficulty}`}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: item.attempts > 0 ? 'var(--ink)' : 'var(--ink-muted)', minWidth: 40, textAlign: 'right' }}>
                    {item.attempts > 0 ? `${item.score}%` : '—'}
                  </span>
                </div>
              </div>

              {/* Progress track */}
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={item.label}
                style={{
                  height: 9,
                  borderRadius: 5,
                  background: 'var(--border)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: 5,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
