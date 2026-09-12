import { useMemo } from 'react'
import ResultChart from './ResultChart'
import styles from '../../styles/Dashboard.module.css'

/**
 * Turn whatever arrived on the dashboard's input into rows we can summarise.
 * Accepts an array of objects, a single object, or a JSON string of either.
 */
function toRows(data) {
  if (data == null) return []
  if (typeof data === 'string') {
    try {
      return toRows(JSON.parse(data))
    } catch {
      return []
    }
  }
  if (Array.isArray(data)) return data.filter(row => row && typeof row === 'object')
  if (typeof data === 'object') return [data]
  return []
}

/** Numeric fields present across the rows, in first-seen order. */
function numericFields(rows) {
  const fields = []
  rows.forEach(row => {
    Object.entries(row).forEach(([key, value]) => {
      if (Number.isFinite(Number(value)) && value !== '' && !fields.includes(key)) {
        fields.push(key)
      }
    })
  })
  return fields
}

function summarise(rows, field) {
  const values = rows
    .map(row => Number(row[field]))
    .filter(Number.isFinite)

  if (values.length === 0) return null

  const total = values.reduce((sum, value) => sum + value, 0)
  return {
    field,
    total,
    average: total / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length
  }
}

function format(value) {
  if (!Number.isFinite(value)) return '—'
  if (Number.isInteger(value)) return value.toLocaleString()
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function MetricTile({ title, value, sub }) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileTitle}>{title}</span>
      <span className={styles.tileValue}>{value}</span>
      {sub && <span className={styles.tileSub}>{sub}</span>}
    </div>
  )
}

/**
 * Renders the Adaptive Dashboard component. Widgets come from the component's
 * `widgets` config; when a widget names no field, the dashboard picks the first
 * numeric field it found, which is what "adaptive" means here.
 */
function Dashboard({ config = {}, data }) {
  const rows = useMemo(() => toRows(data), [data])
  const fields = useMemo(() => numericFields(rows), [rows])

  const widgets = Array.isArray(config.widgets) && config.widgets.length > 0
    ? config.widgets
    : [
        { type: 'metric', title: 'Records' },
        ...fields.slice(0, 2).map(field => ({ type: 'metric', title: field, field })),
        { type: 'chart', title: 'Overview', size: 'large' }
      ]

  if (rows.length === 0) {
    return <div className={styles.empty}>No data reached this dashboard yet</div>
  }

  return (
    <div className={`${styles.dashboard} ${styles[config.layout] || styles.adaptive}`}>
      {widgets.map((widget, index) => {
        const field = widget.field || fields[0]
        const stats = field ? summarise(rows, field) : null

        if (widget.type === 'chart') {
          const chartField = field || fields[0]
          return (
            <div
              key={index}
              className={`${styles.widget} ${widget.size === 'large' ? styles.wide : ''}`}
            >
              <span className={styles.widgetTitle}>{widget.title || 'Chart'}</span>
              <ResultChart
                data={rows.map(row => ({
                  label: String(
                    row.name ?? row.label ?? row.title ??
                    Object.values(row).find(v => typeof v === 'string') ?? ''
                  ),
                  value: Number(row[chartField]) || 0
                }))}
                chartType={widget.chartType || 'bar'}
              />
            </div>
          )
        }

        if (widget.type === 'table') {
          const headers = [...new Set(rows.flatMap(row => Object.keys(row)))]
          return (
            <div key={index} className={`${styles.widget} ${styles.wide}`}>
              <span className={styles.widgetTitle}>{widget.title || 'Rows'}</span>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 20).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {headers.map(h => <td key={h}>{String(row[h] ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }

        // Default: a metric tile.
        if (!stats) {
          return (
            <MetricTile
              key={index}
              title={widget.title || 'Records'}
              value={format(rows.length)}
              sub="rows received"
            />
          )
        }

        return (
          <MetricTile
            key={index}
            title={widget.title || stats.field}
            value={format(stats.total)}
            sub={`avg ${format(stats.average)} · min ${format(stats.min)} · max ${format(stats.max)}`}
          />
        )
      })}
    </div>
  )
}

export default Dashboard
