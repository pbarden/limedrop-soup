import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { runApp, validateApp, resolveConfig, NODE_STATUS } from '../../runtime/engine'
import { resolveType, SOURCE_TYPES } from '../../runtime/executors'
import { hasApiKey } from '../../runtime/aiClient'
import { getComponentById } from '../../data/componentLibrary'
import ResultChart from '../runtime/ResultChart'
import DataTableInput from '../runtime/DataTableInput'
import Dashboard from '../runtime/Dashboard'
import styles from '../../styles/BuiltAppRunner.module.css'

const TEXT_FILE_RE = /^(text\/|application\/(json|xml|x-yaml|yaml|csv))/

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.onload = () => resolve({
      name: file.name,
      size: file.size,
      type: file.type,
      content: reader.result
    })

    if (TEXT_FILE_RE.test(file.type) || file.name.match(/\.(txt|md|csv|json|ya?ml|xml)$/i)) {
      reader.readAsText(file)
    } else {
      reader.readAsDataURL(file)
    }
  })
}

function StatusPill({ status }) {
  const label = {
    [NODE_STATUS.RUNNING]: 'running',
    [NODE_STATUS.SUCCESS]: 'done',
    [NODE_STATUS.ERROR]: 'failed',
    [NODE_STATUS.SKIPPED]: 'skipped'
  }[status] || 'ready'

  return <span className={`${styles.componentStatus} ${styles[label] || ''}`}>{label}</span>
}

/** Read-only table used to show rows a node produced. */
function TableView({ rows }) {
  const headers = [...new Set(rows.flatMap(row => Object.keys(row ?? {})))]

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{headers.map(header => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, index) => (
            <tr key={index}>
              {headers.map(header => <td key={header}>{String(row?.[header] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Render whatever a node produced, based on the display hint its executor returned. */
function NodeDisplay({ display }) {
  if (!display) return null

  switch (display.kind) {
    case 'chart':
      return <ResultChart data={display.value} chartType={display.chartType} />

    case 'dashboard':
      return <Dashboard config={display.config} data={display.value} />

    case 'boolean':
      return (
        <div className={`${styles.gateResult} ${display.value ? styles.gatePass : styles.gateFail}`}>
          <i className={display.value ? 'fas fa-check' : 'fas fa-times'} />
          {display.value ? 'Condition passed' : 'Condition failed'}
        </div>
      )

    case 'table': {
      const rows = Array.isArray(display.value) ? display.value : []
      if (rows.length === 0) return <div className={styles.emptyOutput}>No rows</div>
      return (
        <>
          {display.errors?.length > 0 && (
            <ul className={styles.validationErrors}>
              {display.errors.map((error, index) => <li key={index}>{error}</li>)}
            </ul>
          )}
          <TableView rows={rows} />
        </>
      )
    }

    case 'files': {
      const files = display.value || []
      if (files.length === 0) return <div className={styles.emptyOutput}>No files selected</div>
      return (
        <ul className={styles.fileList}>
          {files.map((file, index) => (
            <li key={index}>
              <i className="fas fa-file" /> {file.name}
              <span className={styles.fileSize}>{Math.ceil(file.size / 1024)} KB</span>
            </li>
          ))}
        </ul>
      )
    }

    case 'export':
      return (
        <div className={styles.exportBlock}>
          <pre className={styles.pre}>{String(display.value).slice(0, 2000)}</pre>
          <button
            className="btn-secondary btn-small"
            onClick={() => {
              const blob = new Blob([display.value], { type: 'text/plain' })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = `${display.filename}.${display.format}`
              link.click()
              URL.revokeObjectURL(url)
            }}
          >
            <i className="fas fa-download" /> Download
          </button>
        </div>
      )

    case 'markdown':
    case 'text':
      return (
        <div className={styles.componentOutput}>
          {String(display.value ?? '') || <span className={styles.emptyOutput}>Empty</span>}
          {display.errors?.length > 0 && (
            <ul className={styles.validationErrors}>
              {display.errors.map((error, index) => <li key={index}>{error}</li>)}
            </ul>
          )}
        </div>
      )

    case 'json':
    default:
      return <pre className={styles.pre}>{JSON.stringify(display.value, null, 2)}</pre>
  }
}

function BuiltAppRunner({ appData }) {
  const [values, setValues] = useState({})
  const [results, setResults] = useState({})
  const [log, setLog] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const abortRef = useRef(null)

  const issues = useMemo(() => validateApp(appData), [appData])
  const blockingIssues = issues.filter(issue => issue.severity === 'error')

  const usesAi = useMemo(
    () => (appData.components || []).some(component => {
      const type = resolveType(component.type)
      return type === 'ai-text-processor' || type === 'ai-prompt'
    }),
    [appData]
  )

  const missingKey = usesAi && !hasApiKey()

  const addToLog = useCallback((message, level = 'info') => {
    setLog(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message,
      level
    }])
  }, [])

  useEffect(() => {
    setResults({})
    setValues({})
    setLog([{
      timestamp: new Date().toLocaleTimeString(),
      message: `Loaded "${appData.name}" — ${appData.components.length} components, ${(appData.connections || []).length} connections`,
      level: 'info'
    }])
  }, [appData])

  // Cancel any in-flight run when the window closes.
  useEffect(() => () => abortRef.current?.abort(), [])

  const handleRun = useCallback(async () => {
    if (isRunning) {
      abortRef.current?.abort()
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    setIsRunning(true)
    setResults({})

    const { results: finalResults } = await runApp(appData, {
      values,
      signal: controller.signal,
      onEvent: (event) => {
        switch (event.type) {
          case 'run-start':
            addToLog(`Running ${event.total} components…`)
            break
          case 'node-start':
            setResults(prev => ({ ...prev, [event.componentId]: { status: NODE_STATUS.RUNNING } }))
            addToLog(`→ ${event.name}`)
            break
          case 'node-success':
            addToLog(`✓ ${event.name} (${event.durationMs}ms)`, 'success')
            break
          case 'node-error':
            addToLog(`✗ ${event.name || event.componentId}: ${event.error}`, 'error')
            break
          case 'node-skipped':
            addToLog(`⊘ skipped — ${event.reason}`, 'warning')
            break
          case 'run-end':
            addToLog(
              event.status === 'succeeded'
                ? 'Run finished successfully'
                : `Run ${event.status}${event.failed ? ` — ${event.failed} failed` : ''}`,
              event.status === 'succeeded' ? 'success' : 'error'
            )
            break
          default:
            break
        }
      }
    })

    // runApp returns a Map of the final per-node state; flatten it for render.
    setResults(Object.fromEntries(finalResults))

    setIsRunning(false)
    abortRef.current = null
  }, [appData, values, isRunning, addToLog])

  const setValue = (componentId, value) => {
    setValues(prev => ({ ...prev, [componentId]: value }))
  }

  const renderInput = (component) => {
    const type = resolveType(component.type)
    const config = resolveConfig(component)

    if (type === 'smart-text-input') {
      const shared = {
        className: config.multiline ? styles.componentTextarea : styles.componentInput,
        placeholder: config.placeholder || 'Type here…',
        maxLength: config.maxLength || undefined,
        value: values[component.id] ?? '',
        onChange: (event) => setValue(component.id, event.target.value)
      }
      return config.multiline
        ? <textarea rows={5} {...shared} />
        : <input type="text" {...shared} />
    }

    if (type === 'file-dropzone') {
      return (
        <input
          type="file"
          className={styles.componentInput}
          multiple={Number(config.maxFiles) > 1}
          accept={Array.isArray(config.allowedTypes) ? config.allowedTypes.join(',') : undefined}
          onChange={async (event) => {
            const files = await Promise.all(Array.from(event.target.files).map(readFile))
            setValue(component.id, files)
          }}
        />
      )
    }

    if (type === 'data-table-input') {
      return (
        <DataTableInput
          config={config}
          rows={values[component.id] ?? []}
          onChange={(rows) => setValue(component.id, rows)}
        />
      )
    }

    return null
  }

  return (
    <div className={styles.builtAppRunner}>
      <div className={styles.appHeader}>
        <div className={styles.appInfo}>
          <i className={appData.icon} />
          <h2>{appData.name}</h2>
          <span className={styles.componentCount}>
            {appData.components.length} components · {(appData.connections || []).length} connections
          </span>
        </div>
        <div className={styles.appActions}>
          <button
            className="btn-primary"
            onClick={handleRun}
            disabled={blockingIssues.length > 0 || missingKey}
          >
            <i className={isRunning ? 'fas fa-stop' : 'fas fa-play'} />
            {isRunning ? ' Stop' : ' Run'}
          </button>
          <button className="btn-secondary" onClick={() => setLog([])} disabled={isRunning}>
            Clear Log
          </button>
        </div>
      </div>

      {missingKey && (
        <div className={`${styles.banner} ${styles.bannerWarning}`}>
          <i className="fas fa-key" />
          This app uses AI components. Add your Anthropic API key in <strong>Settings → AI</strong> to run it.
        </div>
      )}

      {issues.map((issue, index) => (
        <div
          key={index}
          className={`${styles.banner} ${issue.severity === 'error' ? styles.bannerError : styles.bannerWarning}`}
        >
          <i className={issue.severity === 'error' ? 'fas fa-circle-exclamation' : 'fas fa-triangle-exclamation'} />
          {issue.message}
        </div>
      ))}

      <div className={styles.appBody}>
        <div className={styles.componentsArea}>
          <h3>Components</h3>
          <div className={styles.componentsList}>
            {appData.components.map(component => {
              const type = resolveType(component.type)
              const definition = getComponentById(type)
              const result = results[component.id] || {}
              const isSource = type && SOURCE_TYPES.has(type)

              return (
                <div key={component.id} className={styles.componentRunner}>
                  <div className={styles.componentHeader}>
                    <div className={styles.componentInfo}>
                      <i className={definition?.icon || 'fas fa-cube'} />
                      <span className={styles.componentName}>{component.name}</span>
                      <span className={styles.componentType}>({component.type})</span>
                    </div>
                    <StatusPill status={result.status} />
                  </div>

                  <div className={styles.componentBody}>
                    {isSource && renderInput(component)}

                    {result.status === NODE_STATUS.ERROR && (
                      <div className={styles.nodeError}>
                        <i className="fas fa-circle-exclamation" /> {result.error}
                      </div>
                    )}

                    {result.status === NODE_STATUS.SKIPPED && (
                      <div className={styles.nodeSkipped}>Skipped — {result.reason}</div>
                    )}

                    {result.status === NODE_STATUS.SUCCESS && (
                      <>
                        <NodeDisplay display={result.display} />
                        {result.durationMs != null && (
                          <span className={styles.duration}>{result.durationMs}ms</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className={styles.executionArea}>
          <h3>Execution Log</h3>
          <div className={styles.executionLog}>
            {log.map((entry, index) => (
              <div key={index} className={`${styles.logEntry} ${styles[entry.level] || ''}`}>
                <span className={styles.logTime}>{entry.timestamp}</span>
                <span className={styles.logMessage}>{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuiltAppRunner
