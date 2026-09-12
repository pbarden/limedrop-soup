import { useMemo, useState } from 'react'
import styles from '../../styles/DataTableInput.module.css'

const DEFAULT_COLUMNS = [
  { name: 'Name', type: 'text', editable: true },
  { name: 'Age', type: 'number', editable: true }
]

function emptyRow(columns) {
  const row = {}
  columns.forEach(column => {
    row[column.name] = column.type === 'number' ? 0 : ''
  })
  return row
}

function coerce(value, type) {
  if (type !== 'number') return value
  if (value === '' || value === null) return ''
  const number = Number(value)
  return Number.isNaN(number) ? value : number
}

/**
 * Editable grid used by the Interactive Data Table component.
 *
 * `rows` is the live value the runtime holds for this node; every edit calls
 * `onChange` with the full next array so the engine always sees current data.
 * Sorting and filtering are view-only and never reorder what is emitted.
 */
function DataTableInput({ config = {}, rows = [], onChange }) {
  const columns = Array.isArray(config.columns) && config.columns.length > 0
    ? config.columns
    : DEFAULT_COLUMNS

  const [sort, setSort] = useState({ column: null, direction: 'asc' })
  const [filter, setFilter] = useState('')

  const safeRows = Array.isArray(rows) ? rows : []

  // Keep the original index so edits write back to the right row even when the
  // view is sorted or filtered.
  const view = useMemo(() => {
    let indexed = safeRows.map((row, index) => ({ row, index }))

    if (config.filterable && filter.trim()) {
      const needle = filter.toLowerCase()
      indexed = indexed.filter(({ row }) =>
        columns.some(column =>
          String(row?.[column.name] ?? '').toLowerCase().includes(needle)
        )
      )
    }

    if (config.sortable && sort.column) {
      const direction = sort.direction === 'asc' ? 1 : -1
      indexed = [...indexed].sort((a, b) => {
        const left = a.row?.[sort.column]
        const right = b.row?.[sort.column]
        if (typeof left === 'number' && typeof right === 'number') {
          return (left - right) * direction
        }
        return String(left ?? '').localeCompare(String(right ?? '')) * direction
      })
    }

    return indexed
  }, [safeRows, columns, filter, sort, config.filterable, config.sortable])

  const updateCell = (rowIndex, columnName, value, type) => {
    const next = safeRows.map((row, index) =>
      index === rowIndex ? { ...row, [columnName]: coerce(value, type) } : row
    )
    onChange(next)
  }

  const addRow = () => onChange([...safeRows, emptyRow(columns)])

  const deleteRow = (rowIndex) =>
    onChange(safeRows.filter((_, index) => index !== rowIndex))

  const toggleSort = (columnName) => {
    if (!config.sortable) return
    setSort(prev => ({
      column: columnName,
      direction: prev.column === columnName && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  return (
    <div className={styles.dataTable}>
      <div className={styles.toolbar}>
        {config.filterable && (
          <input
            type="text"
            className={styles.filterInput}
            placeholder="Filter rows…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        )}
        <span className={styles.rowCount}>
          {view.length === safeRows.length
            ? `${safeRows.length} rows`
            : `${view.length} of ${safeRows.length} rows`}
        </span>
        {config.allowAdd !== false && (
          <button type="button" className="btn-secondary btn-small" onClick={addRow}>
            <i className="fas fa-plus" /> Add Row
          </button>
        )}
      </div>

      <div className={styles.gridWrap}>
        <table className={styles.grid}>
          <thead>
            <tr>
              {columns.map(column => (
                <th
                  key={column.name}
                  onClick={() => toggleSort(column.name)}
                  className={config.sortable ? styles.sortable : undefined}
                >
                  {column.name}
                  {sort.column === column.name && (
                    <i className={`fas fa-caret-${sort.direction === 'asc' ? 'up' : 'down'}`} />
                  )}
                </th>
              ))}
              {config.allowDelete !== false && <th className={styles.actionColumn} />}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className={styles.emptyRow}>
                  {safeRows.length === 0 ? 'No rows yet' : 'No rows match the filter'}
                </td>
              </tr>
            ) : (
              view.map(({ row, index }) => (
                <tr key={index}>
                  {columns.map(column => (
                    <td key={column.name}>
                      {column.editable === false ? (
                        <span className={styles.readOnlyCell}>{String(row?.[column.name] ?? '')}</span>
                      ) : (
                        <input
                          className={styles.cellInput}
                          type={column.type === 'number' ? 'number' : 'text'}
                          value={row?.[column.name] ?? ''}
                          onChange={(event) =>
                            updateCell(index, column.name, event.target.value, column.type)
                          }
                        />
                      )}
                    </td>
                  ))}
                  {config.allowDelete !== false && (
                    <td className={styles.actionColumn}>
                      <button
                        type="button"
                        className={styles.deleteRow}
                        title="Delete row"
                        onClick={() => deleteRow(index)}
                      >
                        <i className="fas fa-times" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTableInput
