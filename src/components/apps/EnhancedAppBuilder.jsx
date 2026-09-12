import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useAdvancedDragDrop } from '../../hooks/useAdvancedDragDrop'
import { useApp } from '../../contexts/AppContext'
import SmartPropertyEditor from '../SmartPropertyEditor'
import LivePreview from '../LivePreview'
import ConnectionSystem from '../ConnectionSystem'
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

function EnhancedAppBuilder() {
  // Core state
  const [currentApp, setCurrentApp] = useState({
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

  // UI state
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [viewMode, setViewMode] = useState('designer') // designer, preview, split
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [panelSizes] = useState({
    components: 280,
    workflow: 600,
    properties: 320,
    preview: 400
  })

  // Hooks
  const { showNotification, showModal, closeModal, openApp } = useApp()
  const workflowRef = useRef(null)

  // Advanced drag and drop
  const dragDrop = useAdvancedDragDrop({
    onDragStart: handleDragStart,
    onDrop: handleDrop,
    onDragEnd: handleDragEnd,
    gridSize: 20,
    magneticThreshold: 15
  })

  // Filtered components based on search and category
  const filteredComponents = React.useMemo(() => {
    let components = Object.values(advancedComponents)
    
    if (selectedCategory) {
      components = getComponentsByCategory(selectedCategory)
    }
    
    if (searchQuery.trim()) {
      components = searchComponents(searchQuery, selectedCategory ? [selectedCategory] : null)
    }
    
    return components
  }, [searchQuery, selectedCategory])

  // Recommended components
  const recommendedComponents = React.useMemo(() => {
    return getRecommendedComponents(currentApp.components)
  }, [currentApp.components])

  // Handle drag start
  function handleDragStart(item) {
    showNotification(`Dragging ${item.name}`, 'info')
  }

  // Handle drop
  function handleDrop(item, dropZone, position) {
    if (dropZone.metadata?.accepts === 'component') {
      addComponentToWorkflow(item, position)
      showNotification(`Added ${item.name} to workflow`, 'success')
    }
  }

  // Handle drag end
  function handleDragEnd() {
    // Cleanup or additional logic
  }

  // Add component to workflow
  const addComponentToWorkflow = useCallback((componentType, position) => {
    const newComponent = {
      id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: componentType.id,
      name: componentType.name,
      config: {},
      position: position || {
        x: Math.random() * 400 + 50,
        y: Math.random() * 200 + 50
      },
      size: componentType.preview || { width: 200, height: 100 }
    }

    setCurrentApp(prev => ({
      ...prev,
      components: [...prev.components, newComponent],
      metadata: {
        ...prev.metadata,
        modified: new Date().toISOString()
      }
    }))
    
    setHasUnsavedChanges(true)
    setSelectedComponent(newComponent)
  }, [])

  // Remove component
  const removeComponent = useCallback((componentId) => {
    showModal({
      title: 'Remove Component',
      message: 'Are you sure you want to remove this component? This action cannot be undone.',
      type: 'confirm',
      onConfirm: () => {
        setCurrentApp(prev => ({
          ...prev,
          components: prev.components.filter(c => c.id !== componentId),
          connections: prev.connections.filter(
            conn => conn.from !== componentId && conn.to !== componentId
          ),
          metadata: {
            ...prev.metadata,
            modified: new Date().toISOString()
          }
        }))
        
        if (selectedComponent?.id === componentId) {
          setSelectedComponent(null)
        }
        
        setHasUnsavedChanges(true)
        showNotification('Component removed', 'success')
      }
    })
  }, [selectedComponent, showModal, showNotification])

  // Update component property
  const updateComponentProperty = useCallback((componentId, propertyKey, value) => {
    setCurrentApp(prev => ({
      ...prev,
      components: prev.components.map(comp =>
        comp.id === componentId
          ? { ...comp, config: { ...comp.config, [propertyKey]: value } }
          : comp
      ),
      metadata: {
        ...prev.metadata,
        modified: new Date().toISOString()
      }
    }))
    
    setHasUnsavedChanges(true)
    
    // Update selected component if it's the one being edited
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(prev => ({
        ...prev,
        config: { ...prev.config, [propertyKey]: value }
      }))
    }
  }, [selectedComponent])

  // Stable ref callback: an inline arrow here would re-register the drop
  // zone on every render, which loops through setState.
  const registerWorkflowCanvas = useCallback((el) => {
    if (el) dragDrop.registerDropZone(el, 'workflow', { accepts: 'component' })
  }, [dragDrop])

  // Connections between components
  const handleConnectionCreate = useCallback((connection) => {
    setCurrentApp(prev => {
      // One value per input port: replace any existing wire into that port.
      const filtered = prev.connections.filter(
        existing => !(existing.to === connection.to && existing.toPort === connection.toPort)
      )
      return {
        ...prev,
        connections: [...filtered, connection],
        metadata: { ...prev.metadata, modified: new Date().toISOString() }
      }
    })
    setHasUnsavedChanges(true)
  }, [])

  const handleConnectionDelete = useCallback((connectionId) => {
    setCurrentApp(prev => ({
      ...prev,
      connections: prev.connections.filter(conn => conn.id !== connectionId),
      metadata: { ...prev.metadata, modified: new Date().toISOString() }
    }))
    setHasUnsavedChanges(true)
  }, [])

  // Move a component around the canvas
  const handleComponentMove = useCallback((componentId, position) => {
    setCurrentApp(prev => ({
      ...prev,
      components: prev.components.map(comp =>
        comp.id === componentId ? { ...comp, position } : comp
      )
    }))
    setHasUnsavedChanges(true)
  }, [])

  // Problems that would stop the app running
  const issues = React.useMemo(() => validateApp(currentApp), [currentApp])

  // Save, then open the app in its own window
  const runCurrentApp = useCallback(async () => {
    const saved = persistApp(currentApp)
    setCurrentApp(saved)
    setHasUnsavedChanges(false)
    openApp(appWindowId(saved.id), { title: saved.name, builtAppData: saved })
  }, [currentApp, openApp])

  // Save app
  const saveApp = useCallback(async () => {
    try {
      setIsSaving(true)

      const saved = persistApp(currentApp)
      setCurrentApp(saved)
      setHasUnsavedChanges(false)
      showNotification(`"${currentApp.name}" saved successfully`, 'success')
      
    } catch (error) {
      console.error('Failed to save app:', error)
      showNotification('Failed to save app', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [currentApp, showNotification])

  // Auto-save
  const handleAutoSave = useCallback(() => {
    if (!hasUnsavedChanges) return
    saveApp()
  }, [saveApp, hasUnsavedChanges])

  // Auto-save 30s after the last change. handleAutoSave changes identity with
  // currentApp, so edits restart the timer rather than saving mid-edit.
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const autoSaveTimeout = setTimeout(() => {
      handleAutoSave()
    }, 30000)

    return () => clearTimeout(autoSaveTimeout)
  }, [hasUnsavedChanges, handleAutoSave])

  // Load app
  const loadApp = useCallback(() => {
    const savedApps = listApps()

    if (savedApps.length === 0) {
      showNotification('No saved apps found', 'warning')
      return
    }

    const open = (app) => {
      setCurrentApp(app)
      setSelectedComponent(null)
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
              <i className={app.icon}></i>
              <span className={styles.appPickerName}>{app.name}</span>
              <small>
                {app.components.length} components ·{' '}
                {new Date(app.metadata.modified).toLocaleDateString()}
              </small>
            </button>
          ))}
        </div>
      ),
      actions: (
        <button className="btn-secondary" onClick={closeModal}>Cancel</button>
      )
    })
  }, [showNotification, showModal, closeModal])

  // New app
  const createNewApp = useCallback(() => {
    setCurrentApp({
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
    setSelectedComponent(null)
    setHasUnsavedChanges(false)
    showNotification('New app created', 'success')
  }, [showNotification])

  const newApp = useCallback(() => {
    if (hasUnsavedChanges) {
      showModal({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Do you want to save before creating a new app?',
        type: 'confirm',
        onConfirm: async () => {
          await saveApp()
          createNewApp()
        },
        onCancel: createNewApp
      })
    } else {
      createNewApp()
    }
  }, [hasUnsavedChanges, saveApp, showModal, createNewApp])


  // Handle preview interaction

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            saveApp()
            break
          case 'n':
            e.preventDefault()
            newApp()
            break
          case 'o':
            e.preventDefault()
            loadApp()
            break
          case 'z':
            if (e.shiftKey) {
              e.preventDefault()
              // Redo functionality would go here
            } else {
              e.preventDefault()
              // Undo functionality would go here
            }
            break
        }
      }
      
      if (e.key === 'Delete' && selectedComponent) {
        removeComponent(selectedComponent.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveApp, newApp, loadApp, selectedComponent, removeComponent])

  return (
    <div className={styles.enhancedAppBuilder}>
      {/* Header */}
      <div className={styles.builderHeader}>
        <div className={styles.appInfo}>
          <div className={styles.appIcon}>
            <i className={currentApp.icon}></i>
          </div>
          <div className={styles.appDetails}>
            <input
              type="text"
              className={styles.appName}
              value={currentApp.name}
              onChange={(e) => {
                setCurrentApp(prev => ({ ...prev, name: e.target.value }))
                setHasUnsavedChanges(true)
              }}
              placeholder="App Name"
            />
            <input
              type="text"
              className={styles.appDescription}
              value={currentApp.description}
              onChange={(e) => {
                setCurrentApp(prev => ({ ...prev, description: e.target.value }))
                setHasUnsavedChanges(true)
              }}
              placeholder="App description..."
            />
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.viewModeSelector}>
            <button
              className={`${styles.viewModeButton} ${viewMode === 'designer' ? styles.active : ''}`}
              onClick={() => setViewMode('designer')}
              title="Designer View"
            >
              <i className="fas fa-paint-brush"></i>
              Designer
            </button>
            <button
              className={`${styles.viewModeButton} ${viewMode === 'preview' ? styles.active : ''}`}
              onClick={() => setViewMode('preview')}
              title="Preview Mode"
            >
              <i className="fas fa-eye"></i>
              Preview
            </button>
            <button
              className={`${styles.viewModeButton} ${viewMode === 'split' ? styles.active : ''}`}
              onClick={() => setViewMode('split')}
              title="Split View"
            >
              <i className="fas fa-columns"></i>
              Split
            </button>
          </div>

          <div className={styles.appActions}>
            <button 
              className={styles.actionButton}
              onClick={newApp}
              title="New App (Ctrl+N)"
            >
              <i className="fas fa-file-plus"></i>
              New
            </button>
            <button 
              className={styles.actionButton}
              onClick={loadApp}
              title="Load App (Ctrl+O)"
            >
              <i className="fas fa-folder-open"></i>
              Load
            </button>
            <button
              className={`${styles.actionButton} ${styles.runButton}`}
              onClick={runCurrentApp}
              disabled={issues.some(i => i.severity === 'error')}
              title="Save and run this app"
            >
              <i className="fas fa-play"></i>
              Run
            </button>
            <button 
              className={`${styles.actionButton} ${styles.saveButton}`}
              onClick={saveApp}
              disabled={isSaving || !hasUnsavedChanges}
              title="Save App (Ctrl+S)"
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  {hasUnsavedChanges ? 'Save*' : 'Saved'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.builderBody}>
        {/* Component Palette */}
        {(viewMode === 'designer' || viewMode === 'split') && (
          <div 
            className={styles.componentPalette}
            style={{ width: panelSizes.components }}
          >
            <div className={styles.paletteHeader}>
              <h3>Components</h3>
              <button 
                className={styles.paletteToggle}
                onClick={() => setIsPropertyPanelOpen(!isPropertyPanelOpen)}
              >
                <i className="fas fa-cog"></i>
              </button>
            </div>

            {/* Search */}
            <div className={styles.searchContainer}>
              <div className={styles.searchInput}>
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search components..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    className={styles.clearSearch}
                    onClick={() => setSearchQuery('')}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter */}
            <div className={styles.categoryFilter}>
              <button
                className={`${styles.categoryButton} ${!selectedCategory ? styles.active : ''}`}
                onClick={() => setSelectedCategory(null)}
              >
                All
              </button>
              {Object.entries(componentCategories).map(([key, category]) => (
                <button
                  key={key}
                  className={`${styles.categoryButton} ${selectedCategory === key ? styles.active : ''}`}
                  onClick={() => setSelectedCategory(key)}
                  style={{ '--category-color': category.color }}
                >
                  <i className={category.icon}></i>
                  {category.name}
                </button>
              ))}
            </div>

            {/* Recommended Components */}
            {!searchQuery && !selectedCategory && recommendedComponents.length > 0 && (
              <div className={styles.componentSection}>
                <h4>
                  <i className="fas fa-magic"></i>
                  Recommended
                </h4>
                <div className={styles.componentGrid}>
                  {recommendedComponents.slice(0, 4).map(component => (
                    <ComponentPaletteItem
                      key={component.id}
                      component={component}
                      onDragStart={dragDrop.handleDragStart}
                      onClick={() => addComponentToWorkflow(component)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Component List */}
            <div className={styles.componentList}>
              {filteredComponents.length === 0 ? (
                <div className={styles.noComponents}>
                  <i className="fas fa-search"></i>
                  <p>No components found</p>
                  <small>Try adjusting your search or category filter</small>
                </div>
              ) : (
                <div className={styles.componentGrid}>
                  {filteredComponents.map(component => (
                    <ComponentPaletteItem
                      key={component.id}
                      component={component}
                      onDragStart={dragDrop.handleDragStart}
                      onClick={() => addComponentToWorkflow(component)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workflow Area */}
        {(viewMode === 'designer' || viewMode === 'split') && (
          <div 
            ref={workflowRef}
            className={styles.workflowArea}
            style={{ width: viewMode === 'split' ? panelSizes.workflow / 2 : panelSizes.workflow }}
          >
            <div className={styles.workflowHeader}>
              <h3>Workflow Designer</h3>
              <div className={styles.workflowStats}>
                <span>{currentApp.components.length} components</span>
                <span>{currentApp.connections.length} connections</span>
                {issues.length > 0 && (
                  <span
                    className={issues.some(i => i.severity === 'error')
                      ? styles.issueCountError
                      : styles.issueCountWarning}
                    title={issues.map(i => i.message).join(String.fromCharCode(10))}
                  >
                    <i className="fas fa-triangle-exclamation"></i>
                    {issues.length}
                  </span>
                )}
              </div>
            </div>

            <div 
              className={styles.workflowCanvas}
              ref={registerWorkflowCanvas}
            >
              {currentApp.components.length === 0 ? (
                <div className={styles.emptyWorkflow}>
                  <i className="fas fa-plus-circle"></i>
                  <h4>Start Building</h4>
                  <p>Drag components from the palette or click to add them to your workflow</p>
                </div>
              ) : (
                <>
                  {currentApp.components.map(component => (
                    <WorkflowComponent
                      key={component.id}
                      component={component}
                      isSelected={selectedComponent?.id === component.id}
                      onSelect={setSelectedComponent}
                      onRemove={removeComponent}
                      onMove={handleComponentMove}
                    />
                  ))}
                  <ConnectionSystem
                    components={currentApp.components}
                    connections={currentApp.connections}
                    onConnectionCreate={handleConnectionCreate}
                    onConnectionDelete={handleConnectionDelete}
                    workflowRef={workflowRef}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Live Preview */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div 
            className={styles.previewArea}
            style={{ width: viewMode === 'split' ? panelSizes.preview : '100%' }}
          >
            <LivePreview app={currentApp} isVisible={true} />
          </div>
        )}

        {/* Properties Panel */}
        {isPropertyPanelOpen && (viewMode === 'designer' || viewMode === 'split') && (
          <div 
            className={styles.propertiesPanel}
            style={{ width: panelSizes.properties }}
          >
            <SmartPropertyEditor
              selectedComponent={selectedComponent}
              onPropertyChange={updateComponentProperty}
              onValidationChange={() => {
                // Handle validation state changes
              }}
              isLivePreview={viewMode === 'split'}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Component Palette Item
function ComponentPaletteItem({ component, onDragStart, onClick }) {
  const category = componentCategories[component.category]
  const pressOrigin = useRef(null)

  // mousedown starts a drag, but the browser still fires click afterwards.
  // Only treat it as a click if the pointer barely moved, otherwise a drag
  // would add the component twice - once on drop and once on click.
  const handleClick = (e) => {
    const origin = pressOrigin.current
    const moved = origin && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 5
    if (!moved) onClick(component)
  }

  return (
    <div
      className={styles.paletteItem}
      onMouseDown={(e) => {
        pressOrigin.current = { x: e.clientX, y: e.clientY }
        onDragStart(e, component)
      }}
      onClick={handleClick}
      style={{ '--category-color': category?.color || 'var(--primary-button-color)' }}
    >
      <div className={styles.paletteItemIcon}>
        <i className={component.icon}></i>
      </div>
      <div className={styles.paletteItemContent}>
        <span className={styles.paletteItemName}>{component.name}</span>
        <small className={styles.paletteItemDescription}>
          {component.description}
        </small>
        <div className={styles.paletteItemMeta}>
          <span className={styles.difficulty}>{component.difficulty}</span>
          <span className={styles.setupTime}>{component.estimatedSetupTime}</span>
        </div>
      </div>
    </div>
  )
}

// Workflow Component
function WorkflowComponent({ component, isSelected, onSelect, onRemove, onMove }) {
  const meta = advancedComponents[component.type]
  if (!meta) return null

  // Drag the node around the canvas by its header.
  const handleDragStart = (event) => {
    if (event.button !== 0) return
    event.stopPropagation()

    const startX = event.clientX
    const startY = event.clientY
    const originX = component.position?.x || 0
    const originY = component.position?.y || 0

    const handleMove = (moveEvent) => {
      onMove?.(component.id, {
        x: Math.max(0, originX + moveEvent.clientX - startX),
        y: Math.max(0, originY + moveEvent.clientY - startY)
      })
    }

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  return (
    <div
      className={`${styles.workflowComponent} ${isSelected ? styles.selected : ''}`}
      style={{
        left: component.position?.x || 0,
        top: component.position?.y || 0,
        width: component.size?.width || 200,
        height: component.size?.height || 100
      }}
      onClick={() => onSelect(component)}
    >
      <div className={styles.componentHeader} onMouseDown={handleDragStart}>
        <div className={styles.componentIcon}>
          <i className={meta.icon}></i>
        </div>
        <span className={styles.componentName}>{component.name}</span>
        <button
          className={styles.removeButton}
          onClick={(e) => {
            e.stopPropagation()
            onRemove(component.id)
          }}
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      
      <div className={styles.componentBody}>
        <small>{meta.name}</small>
        {Object.keys(component.config || {}).length > 0 && (
          <div className={styles.configIndicator}>
            <i className="fas fa-cog"></i>
            Configured
          </div>
        )}
      </div>
    </div>
  )
}

export default EnhancedAppBuilder