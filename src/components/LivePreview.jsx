import { useMemo, useState } from 'react'
import BuiltAppRunner from './apps/BuiltAppRunner'
import { validateApp } from '../runtime/engine'
import styles from '../styles/LivePreview.module.css'

const DEVICE_PRESETS = {
  desktop: { width: 1200, height: 800, name: 'Desktop', icon: 'fas fa-desktop' },
  tablet: { width: 768, height: 1024, name: 'Tablet', icon: 'fas fa-tablet-alt' },
  mobile: { width: 375, height: 667, name: 'Mobile', icon: 'fas fa-mobile-alt' },
  ultrawide: { width: 1440, height: 900, name: 'Ultrawide', icon: 'fas fa-tv' }
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

/**
 * Runs the app being edited, at a chosen viewport size.
 *
 * This used to render static mock-ups of each component, which meant the
 * preview could look fine while the app itself was broken. It now mounts the
 * real runtime (the same component the App Manager launches), so what you see
 * here is exactly what the built app does - real inputs, real execution, real
 * results.
 */
function LivePreview({ app, isVisible = true }) {
  const [device, setDevice] = useState('desktop')
  const [zoom, setZoom] = useState(1)

  const issues = useMemo(() => (app ? validateApp(app) : []), [app])
  const blocking = issues.filter(issue => issue.severity === 'error')

  // Remounting on structural change gives the runner a clean slate, while
  // property edits keep whatever the user has typed into the inputs.
  const runnerKey = useMemo(() => {
    if (!app) return 'empty'
    const shape = (app.components || []).map(c => `${c.id}:${c.type}`).join('|')
    const wires = (app.connections || []).map(c => c.id).join('|')
    return `${app.id}::${shape}::${wires}`
  }, [app])

  const preset = DEVICE_PRESETS[device]
  const zoomIndex = ZOOM_LEVELS.indexOf(zoom)

  const changeZoom = (direction) => {
    const next = direction === 'in' ? zoomIndex + 1 : zoomIndex - 1
    if (next >= 0 && next < ZOOM_LEVELS.length) setZoom(ZOOM_LEVELS[next])
  }

  if (!isVisible) return null

  const hasComponents = Boolean(app?.components?.length)

  return (
    <div className={styles.livePreview}>
      <div className={styles.previewControls}>
        <div className={styles.deviceSelector}>
          {Object.entries(DEVICE_PRESETS).map(([key, value]) => (
            <button
              key={key}
              className={`${styles.deviceButton} ${device === key ? styles.active : ''}`}
              onClick={() => setDevice(key)}
              title={`${value.name} — ${value.width}×${value.height}`}
            >
              <i className={value.icon}></i>
            </button>
          ))}
        </div>

        <div className={styles.zoomControls}>
          <button
            className={styles.zoomButton}
            onClick={() => changeZoom('out')}
            disabled={zoomIndex <= 0}
            title="Zoom out"
          >
            <i className="fas fa-minus"></i>
          </button>
          <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
          <button
            className={styles.zoomButton}
            onClick={() => changeZoom('in')}
            disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
            title="Zoom in"
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>

        <div className={styles.previewActions}>
          <span className={styles.previewMeta}>
            {preset.width}×{preset.height}
          </span>
        </div>
      </div>

      {blocking.length > 0 && (
        <div className={styles.previewError}>
          <i className="fas fa-circle-exclamation"></i>
          <div>
            {blocking.map((issue, index) => (
              <div key={index}>{issue.message}</div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.previewViewport}>
        {!hasComponents ? (
          <div className={styles.emptyPreview}>
            <i className="fas fa-eye"></i>
            <h4>Nothing to preview yet</h4>
            <p>Add components to the workflow and they will run here.</p>
          </div>
        ) : (
          <div
            className={styles.previewFrame}
            style={{
              width: preset.width,
              height: preset.height,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left'
            }}
          >
            <div className={styles.previewContent}>
              <BuiltAppRunner key={runnerKey} appData={app} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LivePreview
