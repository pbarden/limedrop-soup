import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { getComponentById } from '../data/componentLibrary'
import { useApp } from '../contexts/AppContext'
import styles from '../styles/LivePreview.module.css'

const DEVICE_PRESETS = {
  desktop: { width: 1200, height: 800, name: 'Desktop', icon: 'fas fa-desktop' },
  tablet: { width: 768, height: 1024, name: 'Tablet', icon: 'fas fa-tablet-alt' },
  mobile: { width: 375, height: 667, name: 'Mobile', icon: 'fas fa-mobile-alt' },
  ultrawide: { width: 1440, height: 900, name: 'Ultrawide', icon: 'fas fa-tv' }
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]

function LivePreview({ 
  app, 
  isVisible = true, 
  onError, 
  onInteraction,
  enableHotReload = true 
}) {
  const [device, setDevice] = useState('desktop')
  const [zoom, setZoom] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const [isInteractive, setIsInteractive] = useState(true)
  const [componentStates, setComponentStates] = useState({})
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    componentCount: 0,
    memoryUsage: 0
  })

  const previewRef = useRef(null)
  const hotReloadTimeoutRef = useRef(null)
  const performanceObserverRef = useRef(null)
  const { showNotification } = useApp()

  // Performance monitoring
  useEffect(() => {
    if (!previewRef.current) return

    // Monitor performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (entry.entryType === 'measure' && entry.name.includes('preview-render')) {
          setPerformanceMetrics(prev => ({
            ...prev,
            renderTime: entry.duration
          }))
        }
      })
    })

    observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] })
    performanceObserverRef.current = observer

    return () => {
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect()
      }
    }
  }, [])

  // Hot reload system
  useEffect(() => {
    if (!enableHotReload || !app) return

    if (hotReloadTimeoutRef.current) {
      clearTimeout(hotReloadTimeoutRef.current)
    }

    hotReloadTimeoutRef.current = setTimeout(() => {
      handleHotReload()
    }, 300) // Debounce hot reload

    return () => {
      if (hotReloadTimeoutRef.current) {
        clearTimeout(hotReloadTimeoutRef.current)
      }
    }
  }, [app, enableHotReload])

  // Hot reload implementation
  const handleHotReload = useCallback(async () => {
    if (!app?.components?.length) return

    try {
      setIsLoading(true)
      performance.mark('preview-render-start')

      // Simulate hot reload delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 100))

      // Update performance metrics
      setPerformanceMetrics(prev => ({
        ...prev,
        componentCount: app.components.length,
        memoryUsage: performance.memory ? 
          Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0
      }))

      performance.mark('preview-render-end')
      performance.measure('preview-render', 'preview-render-start', 'preview-render-end')

      setPreviewError(null)
    } catch (error) {
      console.error('Hot reload error:', error)
      setPreviewError(error.message)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [app, onError])

  // Generate preview content
  const previewContent = useMemo(() => {
    if (!app?.components?.length) {
      return (
        <div className={styles.emptyPreview}>
          <i className="fas fa-eye-slash"></i>
          <h3>No Preview Available</h3>
          <p>Add components to your workflow to see the live preview</p>
        </div>
      )
    }

    return app.components.map((component, index) => 
      renderComponentPreview(component, index)
    )
  }, [app, componentStates])

  // Render individual component preview
  const renderComponentPreview = useCallback((component, index) => {
    const meta = getComponentById(component.type)
    if (!meta) return null

    const componentState = componentStates[component.id] || {}

    try {
      return (
        <div 
          key={component.id} 
          className={styles.previewComponent}
          data-component-type={component.type}
          style={{
            order: index,
            '--component-color': meta.category ? 
              `var(--category-${meta.category}-color, var(--primary-button-color))` : 
              'var(--primary-button-color)'
          }}
        >
          <div className={styles.componentHeader}>
            <div className={styles.componentMeta}>
              <i className={meta.icon}></i>
              <span className={styles.componentName}>{component.name}</span>
              <span className={styles.componentType}>{meta.name}</span>
            </div>
            
            {isInteractive && (
              <div className={styles.componentControls}>
                <button 
                  className={styles.controlButton}
                  onClick={() => handleComponentInteraction(component.id, 'configure')}
                  title="Configure Component"
                >
                  <i className="fas fa-cog"></i>
                </button>
                <button 
                  className={styles.controlButton}
                  onClick={() => handleComponentInteraction(component.id, 'test')}
                  title="Test Component"
                >
                  <i className="fas fa-play"></i>
                </button>
              </div>
            )}
          </div>

          <div className={styles.componentContent}>
            {renderComponentContent(component, meta, componentState)}
          </div>

          <div className={styles.componentFooter}>
            <div className={styles.componentConnections}>
              {meta.inputs && (
                <div className={styles.inputs}>
                  {meta.inputs.map(input => (
                    <div key={input} className={styles.connectionPoint}>
                      <span>←</span>
                      <small>{input}</small>
                    </div>
                  ))}
                </div>
              )}
              {meta.outputs && (
                <div className={styles.outputs}>
                  {meta.outputs.map(output => (
                    <div key={output} className={styles.connectionPoint}>
                      <small>{output}</small>
                      <span>→</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )
    } catch (error) {
      console.error(`Error rendering component ${component.id}:`, error)
      return (
        <div key={component.id} className={styles.componentError}>
          <i className="fas fa-exclamation-triangle"></i>
          <span>Error rendering {component.name}</span>
        </div>
      )
    }
  }, [componentStates, isInteractive])

  // Render component content based on type
  const renderComponentContent = useCallback((component, meta, state) => {
    const config = component.config || {}

    switch (component.type) {
      case 'smart-text-input':
        return (
          <div className={styles.mockInput}>
            <label>{config.label || 'Text Input'}</label>
            <input 
              type="text" 
              placeholder={config.placeholder || 'Enter text...'}
              disabled={!isInteractive}
              value={state.value || ''}
              onChange={(e) => updateComponentState(component.id, { value: e.target.value })}
            />
            {config.validation && config.validation !== 'none' && (
              <small className={styles.validationHint}>
                Validation: {config.validation}
              </small>
            )}
          </div>
        )

      case 'file-dropzone':
        return (
          <div className={styles.mockDropzone}>
            <div className={styles.dropzoneContent}>
              <i className="fas fa-cloud-upload-alt"></i>
              <p>Drag & drop files here</p>
              <small>
                Max {config.maxFiles || 1} files, 
                {config.maxFileSize || 10}MB each
              </small>
            </div>
            {config.allowedTypes && (
              <div className={styles.allowedTypes}>
                {config.allowedTypes.map(type => (
                  <span key={type} className={styles.fileType}>{type}</span>
                ))}
              </div>
            )}
          </div>
        )

      case 'ai-text-processor':
        return (
          <div className={styles.mockProcessor}>
            <div className={styles.processingFlow}>
              <div className={styles.flowStep}>
                <i className="fas fa-file-alt"></i>
                <span>Input Text</span>
              </div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}>
                <i className="fas fa-robot"></i>
                <span>AI Processing</span>
              </div>
              <div className={styles.flowArrow}>→</div>
              <div className={styles.flowStep}>
                <i className="fas fa-check-circle"></i>
                <span>Results</span>
              </div>
            </div>
            <div className={styles.processingOptions}>
              {config.operations && config.operations.map(op => (
                <span key={op} className={styles.processingTag}>{op}</span>
              ))}
            </div>
          </div>
        )

      case 'advanced-chart':
        return (
          <div className={styles.mockChart}>
            <div className={styles.chartHeader}>
              <span>Chart: {config.chartType || 'line'}</span>
              <span className={styles.chartTheme}>{config.theme || 'light'} theme</span>
            </div>
            <div className={styles.chartArea}>
              <svg className={styles.chartSvg}>
                {/* Simple mock chart visualization */}
                {config.chartType === 'line' && (
                  <polyline 
                    points="10,50 30,30 50,40 70,20 90,35"
                    stroke="var(--primary-button-color)"
                    strokeWidth="2"
                    fill="none"
                  />
                )}
                {config.chartType === 'bar' && (
                  <>
                    <rect x="10" y="30" width="15" height="20" fill="var(--primary-button-color)" />
                    <rect x="30" y="20" width="15" height="30" fill="var(--primary-button-color)" />
                    <rect x="50" y="35" width="15" height="15" fill="var(--primary-button-color)" />
                    <rect x="70" y="15" width="15" height="35" fill="var(--primary-button-color)" />
                  </>
                )}
              </svg>
            </div>
          </div>
        )

      default:
        return (
          <div className={styles.genericComponent}>
            <div className={styles.componentPlaceholder}>
              <i className={meta.icon}></i>
              <span>{meta.name}</span>
            </div>
            {Object.keys(config).length > 0 && (
              <div className={styles.configPreview}>
                <small>Configuration:</small>
                <ul>
                  {Object.entries(config).slice(0, 3).map(([key, value]) => (
                    <li key={key}>
                      <strong>{key}:</strong> {JSON.stringify(value).slice(0, 30)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
    }
  }, [isInteractive])

  // Update component state
  const updateComponentState = useCallback((componentId, updates) => {
    setComponentStates(prev => ({
      ...prev,
      [componentId]: { ...prev[componentId], ...updates }
    }))
  }, [])

  // Handle component interaction
  const handleComponentInteraction = useCallback((componentId, action) => {
    onInteraction?.(componentId, action)
    
    if (action === 'test') {
      showNotification(`Testing component ${componentId}`, 'info')
      // Simulate test action
      updateComponentState(componentId, { lastTested: Date.now() })
    }
  }, [onInteraction, showNotification])

  // Handle device change
  const handleDeviceChange = useCallback((newDevice) => {
    setDevice(newDevice)
    showNotification(`Preview switched to ${DEVICE_PRESETS[newDevice].name}`, 'success')
  }, [showNotification])

  // Handle zoom change
  const handleZoomChange = useCallback((direction) => {
    setZoom(prev => {
      const currentIndex = ZOOM_LEVELS.indexOf(prev)
      const newIndex = direction === 'in' ? 
        Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1) :
        Math.max(currentIndex - 1, 0)
      return ZOOM_LEVELS[newIndex]
    })
  }, [])

  if (!isVisible) return null

  const currentDevice = DEVICE_PRESETS[device]

  return (
    <div className={styles.livePreview}>
      {/* Preview Controls */}
      <div className={styles.previewControls}>
        <div className={styles.deviceSelector}>
          {Object.entries(DEVICE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className={`${styles.deviceButton} ${device === key ? styles.active : ''}`}
              onClick={() => handleDeviceChange(key)}
              title={preset.name}
            >
              <i className={preset.icon}></i>
            </button>
          ))}
        </div>

        <div className={styles.zoomControls}>
          <button 
            className={styles.zoomButton}
            onClick={() => handleZoomChange('out')}
            disabled={zoom <= ZOOM_LEVELS[0]}
          >
            <i className="fas fa-search-minus"></i>
          </button>
          <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
          <button 
            className={styles.zoomButton}
            onClick={() => handleZoomChange('in')}
            disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
          >
            <i className="fas fa-search-plus"></i>
          </button>
        </div>

        <div className={styles.previewActions}>
          <button
            className={`${styles.actionButton} ${isInteractive ? styles.active : ''}`}
            onClick={() => setIsInteractive(!isInteractive)}
            title={`${isInteractive ? 'Disable' : 'Enable'} Interactions`}
          >
            <i className="fas fa-hand-pointer"></i>
          </button>
          
          <button
            className={styles.actionButton}
            onClick={() => handleHotReload()}
            title="Refresh Preview"
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className={styles.performanceMetrics}>
        <div className={styles.metric}>
          <i className="fas fa-clock"></i>
          <span>{performanceMetrics.renderTime.toFixed(1)}ms</span>
        </div>
        <div className={styles.metric}>
          <i className="fas fa-cubes"></i>
          <span>{performanceMetrics.componentCount}</span>
        </div>
        {performanceMetrics.memoryUsage > 0 && (
          <div className={styles.metric}>
            <i className="fas fa-memory"></i>
            <span>{performanceMetrics.memoryUsage}MB</span>
          </div>
        )}
      </div>

      {/* Preview Viewport */}
      <div className={styles.previewViewport}>
        <div 
          className={styles.previewFrame}
          style={{
            width: currentDevice.width,
            height: currentDevice.height,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left'
          }}
        >
          {isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingSpinner}>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Hot reloading...</span>
              </div>
            </div>
          )}

          {previewError ? (
            <div className={styles.previewError}>
              <i className="fas fa-exclamation-triangle"></i>
              <h3>Preview Error</h3>
              <p>{previewError}</p>
              <button 
                className={styles.retryButton}
                onClick={() => handleHotReload()}
              >
                Retry
              </button>
            </div>
          ) : (
            <div ref={previewRef} className={styles.previewContent}>
              {previewContent}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LivePreview