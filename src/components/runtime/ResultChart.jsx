import { useMemo } from 'react'
import styles from '../../styles/ResultChart.module.css'

const PALETTE = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ec4899', '#6366f1', '#14b8a6', '#ef4444'
]

/**
 * Coerce whatever the upstream node produced into { label, value } points.
 * Handles arrays of numbers, arrays of objects, and plain objects.
 */
function toPoints(data) {
  if (data == null) return []

  // Upstream nodes may hand over a JSON string rather than a parsed value.
  if (typeof data === 'string') {
    try {
      return toPoints(JSON.parse(data))
    } catch {
      return []
    }
  }

  if (!Array.isArray(data)) {
    if (typeof data === 'object') {
      return Object.entries(data)
        .filter(([, value]) => Number.isFinite(Number(value)))
        .map(([label, value]) => ({ label, value: Number(value) }))
    }
    return Number.isFinite(Number(data)) ? [{ label: 'value', value: Number(data) }] : []
  }

  return data
    .map((item, index) => {
      if (Number.isFinite(Number(item))) {
        return { label: String(index + 1), value: Number(item) }
      }
      if (item && typeof item === 'object') {
        const entries = Object.entries(item)
        const labelEntry = entries.find(([, v]) => typeof v === 'string')
        const valueEntry = entries.find(([, v]) => Number.isFinite(Number(v)))
        if (!valueEntry) return null
        return {
          label: labelEntry ? String(labelEntry[1]) : String(index + 1),
          value: Number(valueEntry[1])
        }
      }
      return null
    })
    .filter(Boolean)
}

function BarChart({ points, max }) {
  return (
    <div className={styles.bars}>
      {points.map((point, index) => (
        <div key={index} className={styles.barGroup}>
          <div className={styles.barTrack}>
            <div
              className={styles.bar}
              style={{
                height: `${max > 0 ? (point.value / max) * 100 : 0}%`,
                background: PALETTE[index % PALETTE.length]
              }}
              title={`${point.label}: ${point.value}`}
            />
          </div>
          <span className={styles.barLabel}>{point.label}</span>
        </div>
      ))}
    </div>
  )
}

function LineChart({ points, max }) {
  const width = 100
  const height = 100
  const step = points.length > 1 ? width / (points.length - 1) : width

  const path = points
    .map((point, index) => {
      const x = index * step
      const y = height - (max > 0 ? (point.value / max) * height : 0)
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={PALETTE[0]} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      {points.map((point, index) => (
        <circle
          key={index}
          cx={index * step}
          cy={height - (max > 0 ? (point.value / max) * height : 0)}
          r="1.5"
          fill={PALETTE[0]}
          vectorEffect="non-scaling-stroke"
        >
          <title>{`${point.label}: ${point.value}`}</title>
        </circle>
      ))}
    </svg>
  )
}

function PieChart({ points }) {
  const total = points.reduce((sum, point) => sum + point.value, 0)
  if (total <= 0) return null

  let angle = -Math.PI / 2

  return (
    <svg className={styles.svg} viewBox="0 0 100 100">
      {points.map((point, index) => {
        const slice = (point.value / total) * Math.PI * 2
        const start = angle
        angle += slice

        const large = slice > Math.PI ? 1 : 0
        const x1 = 50 + 45 * Math.cos(start)
        const y1 = 50 + 45 * Math.sin(start)
        const x2 = 50 + 45 * Math.cos(angle)
        const y2 = 50 + 45 * Math.sin(angle)

        return (
          <path
            key={index}
            d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${large} 1 ${x2} ${y2} Z`}
            fill={PALETTE[index % PALETTE.length]}
          >
            <title>{`${point.label}: ${point.value}`}</title>
          </path>
        )
      })}
    </svg>
  )
}

function ResultChart({ data, chartType = 'bar' }) {
  const points = useMemo(() => toPoints(data), [data])
  const max = useMemo(() => Math.max(0, ...points.map(p => p.value)), [points])

  if (points.length === 0) {
    return <div className={styles.empty}>No numeric data to chart</div>
  }

  return (
    <div className={styles.chart}>
      {chartType === 'pie' && <PieChart points={points} />}
      {(chartType === 'line' || chartType === 'scatter') && <LineChart points={points} max={max} />}
      {!['pie', 'line', 'scatter'].includes(chartType) && <BarChart points={points} max={max} />}

      {chartType === 'pie' && (
        <div className={styles.legend}>
          {points.map((point, index) => (
            <span key={index} className={styles.legendItem}>
              <i style={{ background: PALETTE[index % PALETTE.length] }} />
              {point.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default ResultChart
