import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useAdvancedDragDrop } from '../../hooks/useAdvancedDragDrop'
import { useNotifications } from '../../hooks/useNotifications'
import { useModal } from '../../hooks/useModal.jsx'
import SmartPropertyEditor from '../SmartPropertyEditor'
import LivePreview from '../LivePreview'
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
  const [panelSizes, setPanelSizes] = useState({
    components: 280,
    workflow: 600,
    properties: 320,
    preview: 400
  })

  // Hooks
  const { showNotification } = useNotifications()
  const { showModal } = useModal()
  const workflowRef = useRef(null)

  // Advanced drag and drop
  const dragDrop = useAdvancedDragDrop({
    onDragStart: handleDragStart,
    onDrop: handleDrop,
    onDragEnd: handleDragEnd,
    gridSize: 20,
    magneticThreshold: 15
  })

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const autoSaveTimeout = setTimeout(() => {
      handleAutoSave()
    }, 30000) // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimeout)
  }, [currentApp, hasUnsavedChanges])

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
  function handleDragStart(item, position) {
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
  function handleDragEnd(item, dropZone, position) {
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
  const updateComponentProperty = useCallback((componentId, propertyKey, value, allValues) => {
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

  // Save app
  const saveApp = useCallback(async () => {
    try {
      setIsSaving(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const savedApps = JSON.parse(localStorage.getItem('limedrop-enhanced-apps') || '[]')
      const appIndex = savedApps.findIndex(app => app.id === currentApp.id)
      
      const appToSave = {
        ...currentApp,
        metadata: {
          ...currentApp.metadata,
          modified: new Date().toISOString()
        }
      }
      
      if (appIndex >= 0) {
        savedApps[appIndex] = appToSave
      } else {
        savedApps.push(appToSave)
      }
      
      localStorage.setItem('limedrop-enhanced-apps', JSON.stringify(savedApps))
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

  // Load app
  const loadApp = useCallback(() => {
    const savedApps = JSON.parse(localStorage.getItem('limedrop-enhanced-apps') || '[]')
    
    if (savedApps.length === 0) {
      showNotification('No saved apps found', 'warning')
      return
    }
    
    // For now, load the most recently modified app
    const latestApp = savedApps.reduce((latest, app) => 
      new Date(app.metadata.modified) > new Date(latest.metadata.modified) ? app : latest
    )
    
    setCurrentApp(latestApp)
    setSelectedComponent(null)
    setHasUnsavedChanges(false)
    showNotification(`Loaded "${latestApp.name}"`, 'success')
  }, [showNotification])

  // New app
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
  }, [hasUnsavedChanges, saveApp, showModal])

  const createNewApp = () => {
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
  }

  // Handle preview interaction
  const handlePreviewInteraction = useCallback((componentId, action) => {
    if (action === 'configure') {
      const component = currentApp.components.find(c => c.id === componentId)
      if (component) {
        setSelectedComponent(component)
        setViewMode('designer')
      }
    }
  }, [currentApp.components])

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
              </div>
            </div>

            <div 
              className={styles.workflowCanvas}
              ref={(el) => {
                if (el) {
                  dragDrop.registerDropZone(el, 'workflow', { accepts: 'component' })
                }
              }}
            >
              {currentApp.components.length === 0 ? (
                <div className={styles.emptyWorkflow}>
                  <i className="fas fa-plus-circle"></i>
                  <h4>Start Building</h4>
                  <p>Drag components from the palette or click to add them to your workflow</p>
                </div>
              ) : (
                currentApp.components.map(component => (
                  <WorkflowComponent
                    key={component.id}
                    component={component}
                    isSelected={selectedComponent?.id === component.id}
                    onSelect={setSelectedComponent}
                    onRemove={removeComponent}
                    onPropertyChange={updateComponentProperty}
                  />
                ))
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
            <LivePreview
              app={currentApp}
              isVisible={true}
              onInteraction={handlePreviewInteraction}
              enableHotReload={true}
            />
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
              onValidationChange={(state, errors) => {
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
  
  return (
    <div
      className={styles.paletteItem}
      draggable
      onDragStart={(e) => onDragStart(e, component)}
      onClick={() => onClick(component)}
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
function WorkflowComponent({ component, isSelected, onSelect, onRemove, onPropertyChange }) {
  const meta = advancedComponents[component.type]
  if (!meta) return null

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
      <div className={styles.componentHeader}>
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