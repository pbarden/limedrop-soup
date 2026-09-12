import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useApp } from '../../contexts/AppContext'
import SmartPropertyEditor from '../SmartPropertyEditor'
import LivePreview from '../LivePreview'
import WorkflowCanvas from '../workflow/WorkflowCanvas'
import { nextFreePosition } from '../workflow/geometry'
import { listApps, saveApp as persistApp, appWindowId } from '../../storage/appStore'
import { validateApp } from '../../runtime/engine'
import {
  advancedComponents,
  componentCategories,
  searchComponents,
  getComponentsByCategory,
  getRecommendedComponents
} from '../../data/componentLibrary'
import styles from '../../styles/EnhancedAppBuilder.module.css'

const PALETTE_MIN = 200
const PALETTE_MAX = 380
const PROPERTIES_MIN = 240
const PROPERTIES_MAX = 460

const emptyApp = () => ({
  id: `app-${Date.now()}`,
  name: 'Untitled App',
  description: '',
  icon: 'fas fa-rocket',
  version: '1.0.0',
  components: [],
  connections: [],
  metadata: {
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    author: 'Current User'
  }
})

/** True when the event came from somewhere the user is typing. */
function isTextEntry(target) {
  return /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName) || target?.isContentEditable
}

function EnhancedAppBuilder() {
  const [currentApp, setCurrentApp] = useState(emptyApp)

  // The selection is stored as an id, not a copy of the component. Holding a
  // copy meant the property editor kept showing a stale snapshot after the
  // node was moved or reconfigured from anywhere else.
  const [selectedId, setSelectedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [viewMode, setViewMode] = useState('designer') // designer | preview | split
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [panelSizes, setPanelSizes] = useState({ palette: 244, properties: 300 })

  const { showNotification, showModal, closeModal, openApp } = useApp()
  const bodyRef = useRef(null)

  const selectedComponent = useMemo(
    () => currentApp.components.find(component => component.id === selectedId) || null,
    [currentApp.components, selectedId]
  )

  const filteredComponents = useMemo(() => {
    if (searchQuery.trim()) {
      return searchComponents(searchQuery, selectedCategory ? [selectedCategory] : null)
    }
    if (selectedCategory) return getComponentsByCategory(selectedCategory)
    return Object.values(advancedComponents)
  }, [searchQuery, selectedCategory])

  const recommendedComponents = useMemo(
    () => getRecommendedComponents(currentApp.components),
    [currentApp.components]
  )

  const touch = useCallback((updater) => {
    setCurrentApp(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return {
        ...next,
        metadata: { ...next.metadata, modified: new Date().toISOString() }
      }
    })
    setHasUnsavedChanges(true)
  }, [])

  // ---- Graph edits -----------------------------------------------------

  const addComponent = useCallback((typeId, position) => {
    const definition = advancedComponents[typeId]
    if (!definition) return

    const id = `comp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

    setCurrentApp(prev => ({
      ...prev,
      components: [...prev.components, {
        id,
        type: definition.id,
        name: definition.name,
        config: {},
        position: nextFreePosition(prev.components, position)
      }],
      metadata: { ...prev.metadata, modified: new Date().toISOString() }
    }))

    setHasUnsavedChanges(true)
    setSelectedId(id)
  }, [])

  const removeComponent = useCallback((componentId) => {
    showModal({
      title: 'Remove Component',
      message: 'Remove this component and any connections attached to it?',
      type: 'confirm',
      onConfirm: () => {
        touch(prev => ({
          ...prev,
          components: prev.components.filter(component => component.id !== componentId),
          connections: prev.connections.filter(
            connection => connection.from !== componentId && connection.to !== componentId
          )
        }))
        setSelectedId(prev => (prev === componentId ? null : prev))
        showNotification('Component removed', 'success')
      }
    })
  }, [showModal, showNotification, touch])

  const updateComponentProperty = useCallback((componentId, propertyKey, value) => {
    touch(prev => ({
      ...prev,
      components: prev.components.map(component =>
        component.id === componentId
          ? { ...component, config: { ...component.config, [propertyKey]: value } }
          : component
      )
    }))
  }, [touch])

  const handleConnectionCreate = useCallback((connection) => {
    touch(prev => {
      // One value per input port: a new wire replaces whatever fed that port.
      const kept = prev.connections.filter(
        existing => !(existing.to === connection.to && existing.toPort === connection.toPort)
      )
      return { ...prev, connections: [...kept, connection] }
    })
  }, [touch])

  const handleConnectionDelete = useCallback((connectionId) => {
    touch(prev => ({
      ...prev,
      connections: prev.connections.filter(connection => connection.id !== connectionId)
    }))
  }, [touch])

  // Moves are frequent, so they bypass `touch` and its timestamp rewrite.
  const handleComponentMove = useCallback((componentId, position) => {
    setCurrentApp(prev => ({
      ...prev,
      components: prev.components.map(component =>
        component.id === componentId ? { ...component, position } : component
      )
    }))
    setHasUnsavedChanges(true)
  }, [])

  // ---- Validation ------------------------------------------------------

  const issues = useMemo(() => validateApp(currentApp), [currentApp])
  const blockingIssues = useMemo(
    () => issues.filter(issue => issue.severity === 'error'),
    [issues]
  )

  const issuesByComponent = useMemo(() => {
    const map = new Map()
    for (const issue of issues) {
      if (!issue.componentId) continue
      map.set(issue.componentId, [...(map.get(issue.componentId) || []), issue])
    }
    return map
  }, [issues])

  // ---- Persistence -----------------------------------------------------

  const saveApp = useCallback(async () => {
    try {
      setIsSaving(true)
      const saved = persistApp(currentApp)
      setCurrentApp(saved)
      setHasUnsavedChanges(false)
      showNotification(`"${saved.name}" saved`, 'success')
      return saved
    } catch (error) {
      console.error('Failed to save app:', error)
      showNotification('Failed to save app', 'error')
      return null
    } finally {
      setIsSaving(false)
    }
  }, [currentApp, showNotification])

  const runCurrentApp = useCallback(() => {
    const saved = persistApp(currentApp)
    setCurrentApp(saved)
    setHasUnsavedChanges(false)
    openApp(appWindowId(saved.id), { title: saved.name, builtAppData: saved })
  }, [currentApp, openApp])

  // Auto-save 30s after the last change: the callback identity changes with
  // currentApp, so each edit restarts the timer instead of saving mid-edit.
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const timeout = setTimeout(() => { saveApp() }, 30000)
    return () => clearTimeout(timeout)
  }, [hasUnsavedChanges, saveApp])

  const loadApp = useCallback(() => {
    const savedApps = listApps()

    if (savedApps.length === 0) {
      showNotification('No saved apps yet', 'warning')
      return
    }

    const open = (app) => {
      setCurrentApp(app)
      setSelectedId(null)
      setHasUnsavedChanges(false)
      showNotification(`Loaded "${app.name}"`, 'success')
      closeModal()
    }

    showModal({
      title: 'Open App',
      content: (
        <div className={styles.appPicker}>
          {savedApps.map(app => (
            <button key={app.id} className={styles.appPickerItem} onClick={() => open(app)}>
              <i className={app.icon} aria-hidden="true"></i>
              <span className={styles.appPickerName}>{app.name}</span>
              <small>
                {app.components.length} components ·{' '}
                {new Date(app.metadata.modified).toLocaleDateString()}
              </small>
            </button>
          ))}
        </div>
      ),
      actions: <button className="btn-secondary" onClick={closeModal}>Cancel</button>
    })
  }, [showNotification, showModal, closeModal])

  const createNewApp = useCallback(() => {
    setCurrentApp(emptyApp())
    setSelectedId(null)
    setHasUnsavedChanges(false)
    showNotification('New app created', 'success')
  }, [showNotification])

  const newApp = useCallback(() => {
    if (!hasUnsavedChanges) {
      createNewApp()
      return
    }

    showModal({
      title: 'Unsaved Changes',
      message: 'Save the current app before starting a new one?',
      type: 'confirm',
      onConfirm: async () => {
        await saveApp()
        createNewApp()
      },
      onCancel: createNewApp
    })
  }, [hasUnsavedChanges, saveApp, showModal, createNewApp])

  // ---- Panel resizing --------------------------------------------------

  const startPanelResize = useCallback((panel, event) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = panelSizes[panel]
    const [min, max] = panel === 'palette'
      ? [PALETTE_MIN, PALETTE_MAX]
      : [PROPERTIES_MIN, PROPERTIES_MAX]
    // The properties panel is on the right, so it grows as the pointer moves left.
    const direction = panel === 'palette' ? 1 : -1

    const handleMove = (moveEvent) => {
      const width = startWidth + (moveEvent.clientX - startX) * direction
      setPanelSizes(prev => ({ ...prev, [panel]: Math.min(max, Math.max(min, width)) }))
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }, [panelSizes])

  // ---- Keyboard --------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (event) => {
      const typing = isTextEntry(event.target)

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's': event.preventDefault(); saveApp(); break
          case 'n': event.preventDefault(); newApp(); break
          case 'o': event.preventDefault(); loadApp(); break
          default: break
        }
        return
      }

      // Delete only removes a node when the user is not typing — otherwise
      // pressing Delete in the app-name field wiped the selected component.
      if (!typing && (event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault()
        removeComponent(selectedId)
      }

      if (!typing && event.key === 'Escape') setSelectedId(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveApp, newApp, loadApp, selectedId, removeComponent])

  const showDesigner = viewMode === 'designer' || viewMode === 'split'
  const showPreview = viewMode === 'preview' || viewMode === 'split'

  return (
    <div className={styles.enhancedAppBuilder}>
      <header className={styles.builderHeader}>
        <div className={styles.appInfo}>
          <span className={styles.appIcon}>
            <i className={currentApp.icon} aria-hidden="true"></i>
          </span>
          <div className={styles.appDetails}>
            <input
              type="text"
              className={styles.appName}
              value={currentApp.name}
              onChange={(event) => touch(prev => ({ ...prev, name: event.target.value }))}
              placeholder="App name"
              aria-label="App name"
            />
            <input
              type="text"
              className={styles.appDescription}
              value={currentApp.description}
              onChange={(event) => touch(prev => ({ ...prev, description: event.target.value }))}
              placeholder="Add a description…"
              aria-label="App description"
            />
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.viewModeSelector} role="tablist" aria-label="Builder view">
            {[
              { id: 'designer', icon: 'fas fa-diagram-project', label: 'Designer' },
              { id: 'preview', icon: 'fas fa-play', label: 'Preview' },
              { id: 'split', icon: 'fas fa-table-columns', label: 'Split' }
            ].map(mode => (
              <button
                key={mode.id}
                role="tab"
                aria-selected={viewMode === mode.id}
                className={`${styles.viewModeButton} ${viewMode === mode.id ? styles.active : ''}`}
                onClick={() => setViewMode(mode.id)}
                title={`${mode.label} view`}
              >
                <i className={mode.icon} aria-hidden="true"></i>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.appActions}>
            <button className={styles.actionButton} onClick={newApp} title="New app (Ctrl+N)">
              <i className="fas fa-file-circle-plus" aria-hidden="true"></i>
              <span>New</span>
            </button>
            <button className={styles.actionButton} onClick={loadApp} title="Open app (Ctrl+O)">
              <i className="fas fa-folder-open" aria-hidden="true"></i>
              <span>Open</span>
            </button>
            <button
              className={`${styles.actionButton} ${styles.runButton}`}
              onClick={runCurrentApp}
              disabled={blockingIssues.length > 0}
              title={blockingIssues.length > 0
                ? blockingIssues.map(issue => issue.message).join('\n')
                : 'Save and run this app'}
            >
              <i className="fas fa-play" aria-hidden="true"></i>
              <span>Run</span>
            </button>
            <button
              className={`${styles.actionButton} ${styles.saveButton}`}
              onClick={saveApp}
              disabled={isSaving || !hasUnsavedChanges}
              title="Save app (Ctrl+S)"
            >
              <i
                className={isSaving ? 'fas fa-spinner fa-spin' : 'fas fa-floppy-disk'}
                aria-hidden="true"
              ></i>
              <span>{isSaving ? 'Saving…' : hasUnsavedChanges ? 'Save' : 'Saved'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className={styles.builderBody} ref={bodyRef}>
        {showDesigner && (
          <>
            <aside className={styles.componentPalette} style={{ width: panelSizes.palette }}>
              <div className={styles.paletteHeader}>
                <h3>Components</h3>
                <span className={styles.paletteCount}>{filteredComponents.length}</span>
              </div>

              <div className={styles.searchContainer}>
                <div className={styles.searchInput}>
                  <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
                  <input
                    type="search"
                    placeholder="Search components…"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    aria-label="Search components"
                  />
                  {searchQuery && (
                    <button
                      className={styles.clearSearch}
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <i className="fas fa-xmark" aria-hidden="true"></i>
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.categoryFilter}>
                <button
                  className={`${styles.categoryButton} ${!selectedCategory ? styles.active : ''}`}
                  onClick={() => setSelectedCategory(null)}
                  title="All components"
                >
                  <i className="fas fa-layer-group" aria-hidden="true"></i>
                  <span>All</span>
                </button>
                {Object.entries(componentCategories).map(([key, category]) => (
                  <button
                    key={key}
                    className={`${styles.categoryButton} ${selectedCategory === key ? styles.active : ''}`}
                    onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                    style={{ '--category-color': category.color }}
                    title={category.description}
                  >
                    <i className={category.icon} aria-hidden="true"></i>
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>

              <div className={styles.componentList}>
                {!searchQuery && !selectedCategory && recommendedComponents.length > 0 && (
                  <section className={styles.componentSection}>
                    <h4>
                      <i className="fas fa-wand-magic-sparkles" aria-hidden="true"></i>
                      Suggested next
                    </h4>
                    <div className={styles.componentGrid}>
                      {recommendedComponents.slice(0, 3).map(component => (
                        <PaletteItem
                          key={`rec-${component.id}`}
                          component={component}
                          onAdd={addComponent}
                        />
                      ))}
                    </div>
                  </section>
                )}

                <section className={styles.componentSection}>
                  {!searchQuery && !selectedCategory && recommendedComponents.length > 0 && (
                    <h4>
                      <i className="fas fa-cubes" aria-hidden="true"></i>
                      All components
                    </h4>
                  )}

                  {filteredComponents.length === 0 ? (
                    <div className={styles.noComponents}>
                      <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
                      <p>No components found</p>
                      <small>Try a different search or category</small>
                    </div>
                  ) : (
                    <div className={styles.componentGrid}>
                      {filteredComponents.map(component => (
                        <PaletteItem
                          key={component.id}
                          component={component}
                          onAdd={addComponent}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </aside>

            <div
              className={styles.resizer}
              onPointerDown={(event) => startPanelResize('palette', event)}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize component palette"
            />

            <section className={styles.workflowArea}>
              <div className={styles.workflowHeader}>
                <h3>Workflow</h3>
                <div className={styles.workflowStats}>
                  <span title="Components on the canvas">
                    <i className="fas fa-cube" aria-hidden="true"></i>
                    {currentApp.components.length}
                  </span>
                  <span title="Connections between components">
                    <i className="fas fa-code-branch" aria-hidden="true"></i>
                    {currentApp.connections.length}
                  </span>
                  {issues.length > 0 && (
                    <span
                      className={blockingIssues.length > 0
                        ? styles.issueCountError
                        : styles.issueCountWarning}
                      title={issues.map(issue => issue.message).join('\n')}
                    >
                      <i
                        className={blockingIssues.length > 0
                          ? 'fas fa-circle-exclamation'
                          : 'fas fa-triangle-exclamation'}
                        aria-hidden="true"
                      ></i>
                      {issues.length}
                    </span>
                  )}

                  <button
                    className={styles.propertiesToggle}
                    onClick={() => setIsPropertyPanelOpen(open => !open)}
                    title={isPropertyPanelOpen ? 'Hide properties panel' : 'Show properties panel'}
                    aria-pressed={isPropertyPanelOpen}
                  >
                    <i className="fas fa-sliders" aria-hidden="true"></i>
                  </button>
                </div>
              </div>

              <WorkflowCanvas
                components={currentApp.components}
                connections={currentApp.connections}
                selectedId={selectedId}
                issuesByComponent={issuesByComponent}
                onSelect={(component) => setSelectedId(component?.id ?? null)}
                onMove={handleComponentMove}
                onRemove={removeComponent}
                onConnectionCreate={handleConnectionCreate}
                onConnectionDelete={handleConnectionDelete}
                onDropComponent={addComponent}
              />
            </section>
          </>
        )}

        {showPreview && (
          <section className={styles.previewArea}>
            <LivePreview app={currentApp} isVisible />
          </section>
        )}

        {isPropertyPanelOpen && showDesigner && (
          <>
            <div
              className={styles.resizer}
              onPointerDown={(event) => startPanelResize('properties', event)}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize properties panel"
            />
            <aside className={styles.propertiesPanel} style={{ width: panelSizes.properties }}>
              <SmartPropertyEditor
                key={selectedId || 'none'}
                selectedComponent={selectedComponent}
                onPropertyChange={(key, value) =>
                  selectedId && updateComponentProperty(selectedId, key, value)}
                isLivePreview={viewMode === 'split'}
              />
            </aside>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * A component in the palette. Native HTML drag-and-drop carries the type id to
 * the canvas, which converts the drop point into canvas coordinates itself —
 * the previous custom ghost-drag handed the canvas raw screen coordinates, so
 * dropped nodes landed far outside the visible area.
 */
function PaletteItem({ component, onAdd }) {
  const category = componentCategories[component.category]

  return (
    <button
      type="button"
      className={styles.paletteItem}
      style={{ '--category-color': category?.color || 'var(--primary-button-color)' }}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('application/x-limedrop-component', component.id)
        event.dataTransfer.effectAllowed = 'copy'
      }}
      onClick={() => onAdd(component.id)}
      title={`${component.description}\n\nClick to add, or drag onto the canvas`}
    >
      <span className={styles.paletteItemIcon}>
        <i className={component.icon} aria-hidden="true"></i>
      </span>
      <span className={styles.paletteItemContent}>
        <span className={styles.paletteItemName}>{component.name}</span>
        <span className={styles.paletteItemDescription}>{component.description}</span>
      </span>
      <span className={styles.paletteItemAdd} aria-hidden="true">
        <i className="fas fa-plus"></i>
      </span>
    </button>
  )
}

export default EnhancedAppBuilder
