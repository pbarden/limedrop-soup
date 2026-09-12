import { useState } from 'react'
import { useApp } from '../../contexts/AppContext'
import { listApps, saveApp as persistApp, normalizeApp } from '../../storage/appStore'
import styles from '../../styles/AppBuilder.module.css'

function AppBuilder() {
  const { showNotification, showModal, closeModal } = useApp()

  const [currentApp, setCurrentApp] = useState({
    name: 'New App',
    icon: 'fas fa-rocket',
    components: []
  })
  
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [draggingComponent, setDraggingComponent] = useState(null)
  const [draggingIndex, setDraggingIndex] = useState(null)

  const componentTypes = {
    input: [
      { id: 'text-input', name: 'Text Input', icon: 'fas fa-keyboard' },
      { id: 'file-upload', name: 'File Upload', icon: 'fas fa-upload' },
      { id: 'canvas', name: 'Canvas', icon: 'fas fa-paint-brush' }
    ],
    processing: [
      { id: 'ai-prompt', name: 'AI Prompt', icon: 'fas fa-robot' },
      { id: 'data-transform', name: 'Data Transform', icon: 'fas fa-exchange-alt' },
      { id: 'custom-buttons', name: 'Custom Buttons', icon: 'fas fa-mouse-pointer' }
    ],
    output: [
      { id: 'display', name: 'Display', icon: 'fas fa-desktop' },
      { id: 'chart', name: 'Chart', icon: 'fas fa-chart-bar' },
      { id: 'export', name: 'Export', icon: 'fas fa-download' }
    ]
  }

  const iconOptions = [
    'fas fa-rocket', 'fas fa-cog', 'fas fa-star', 'fas fa-heart',
    'fas fa-bolt', 'fas fa-fire', 'fas fa-magic', 'fas fa-diamond'
  ]

  const addComponent = (componentType) => {
    const newComponent = {
      id: Date.now().toString(),
      type: componentType.id,
      name: componentType.name,
      icon: componentType.icon,
      config: {}
    }
    
    setCurrentApp(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }))
  }

  const removeComponent = (componentId) => {
    setCurrentApp(prev => ({
      ...prev,
      components: prev.components.filter(c => c.id !== componentId)
    }))
    
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(null)
    }
  }

  const moveComponent = (fromIndex, toIndex) => {
    const newComponents = [...currentApp.components]
    const [movedComponent] = newComponents.splice(fromIndex, 1)
    newComponents.splice(toIndex, 0, movedComponent)
    
    setCurrentApp(prev => ({
      ...prev,
      components: newComponents
    }))
  }

  // Saves through the shared app store so apps built here show up in the App
  // Manager and run in the same runtime as everything else. normalizeApp turns
  // the ordered component list into a connected pipeline.
  const saveApp = () => {
    const existing = listApps().find(app => app.name === currentApp.name)
    const saved = persistApp(
      normalizeApp({ ...currentApp, id: existing?.id }, { chainIfUnconnected: true })
    )
    setCurrentApp(prev => ({ ...prev, id: saved.id }))
    showNotification(`"${saved.name}" saved`, 'success')
  }

  const loadApp = () => {
    const savedApps = listApps()
    if (savedApps.length === 0) {
      showNotification('No saved apps found', 'warning')
      return
    }

    showModal({
      title: 'Open App',
      content: (
        <div className={styles.appPicker}>
          {savedApps.map(app => (
            <button
              key={app.id}
              className={styles.appPickerItem}
              onClick={() => {
                setCurrentApp(app)
                setSelectedComponent(null)
                showNotification(`Loaded "${app.name}"`, 'success')
                closeModal()
              }}
            >
              <i className={app.icon}></i>
              <span>{app.name}</span>
              <small>{app.components.length} components</small>
            </button>
          ))}
        </div>
      ),
      actions: <button className="btn-secondary" onClick={closeModal}>Cancel</button>
    })
  }

  const newApp = () => {
    if (currentApp.components.length > 0 &&
        !confirm('Create a new app? Unsaved changes will be lost.')) {
      return
    }
    
    setCurrentApp({
      name: 'New App',
      icon: 'fas fa-rocket',
      components: []
    })
    setSelectedComponent(null)
  }

  return (
    <div className={styles.appBuilder}>
      <div className={styles.appBuilderHeader}>
        <div className={styles.appInfo}>
          <div className={styles.appIcon}>
            <i className={currentApp.icon}></i>
          </div>
          <input
            type="text"
            className={styles.appName}
            value={currentApp.name}
            onChange={(e) => setCurrentApp(prev => ({ ...prev, name: e.target.value }))}
            placeholder="App Name"
          />
        </div>
        
        <div className={styles.appActions}>
          <button className="btn-secondary" onClick={newApp}>New</button>
          <button className="btn-secondary" onClick={loadApp}>Load</button>
          <button className="btn-primary" onClick={saveApp}>Save</button>
        </div>
      </div>

      <div className={styles.appBuilderBody}>
        <div className={styles.componentsPalette}>
          <h3>Components</h3>
          
          <div className={styles.componentSection}>
            <h4>Input</h4>
            {componentTypes.input.map(component => (
              <div 
                key={component.id}
                className={styles.paletteItem}
                draggable
                onClick={() => addComponent(component)}
                onDragStart={() => setDraggingComponent(component)}
              >
                <i className={component.icon}></i>
                <span>{component.name}</span>
              </div>
            ))}
          </div>
          
          <div className={styles.componentSection}>
            <h4>Processing</h4>
            {componentTypes.processing.map(component => (
              <div 
                key={component.id}
                className={styles.paletteItem}
                draggable
                onClick={() => addComponent(component)}
                onDragStart={() => setDraggingComponent(component)}
              >
                <i className={component.icon}></i>
                <span>{component.name}</span>
              </div>
            ))}
          </div>
          
          <div className={styles.componentSection}>
            <h4>Output</h4>
            {componentTypes.output.map(component => (
              <div 
                key={component.id}
                className={styles.paletteItem}
                draggable
                onClick={() => addComponent(component)}
                onDragStart={() => setDraggingComponent(component)}
              >
                <i className={component.icon}></i>
                <span>{component.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className={styles.workflowArea}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (draggingComponent) {
              addComponent(draggingComponent)
              setDraggingComponent(null)
            }
          }}
        >
          <h3>App Workflow</h3>
          
          {currentApp.components.length === 0 ? (
            <div className={styles.emptyWorkflow}>
              <p>Drag components here or click on them to build your app</p>
            </div>
          ) : (
            <div className={styles.workflow}>
              {currentApp.components.map((component, index) => (
                <div 
                  key={component.id}
                  className={`${styles.workflowComponent} ${selectedComponent?.id === component.id ? styles.selected : ''}`}
                  onClick={() => setSelectedComponent(component)}
                  draggable
                  onDragStart={() => setDraggingIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (draggingIndex !== null && draggingIndex !== index) {
                      moveComponent(draggingIndex, index)
                    }
                    setDraggingIndex(null)
                    setDraggingComponent(null)
                  }}
                >
                  <div className={styles.componentHeader}>
                    <i className={component.icon}></i>
                    <span>{component.name}</span>
                    <button 
                      className={styles.removeBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeComponent(component.id)
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.componentBody}>
                    <small>{component.type}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.propertiesPanel}>
          <h3>Properties</h3>
          
          {selectedComponent ? (
            <div className={styles.componentProperties}>
              <h4>{selectedComponent.name}</h4>
              
              <div className={styles.propertyGroup}>
                <label>Component Name:</label>
                <input 
                  type="text"
                  value={selectedComponent.name}
                  onChange={(e) => {
                    const updatedComponents = currentApp.components.map(c =>
                      c.id === selectedComponent.id 
                        ? { ...c, name: e.target.value }
                        : c
                    )
                    setCurrentApp(prev => ({ ...prev, components: updatedComponents }))
                    setSelectedComponent({ ...selectedComponent, name: e.target.value })
                  }}
                />
              </div>
              
              <div className={styles.propertyGroup}>
                <label>Type:</label>
                <div className={styles.propertyValue}>{selectedComponent.type}</div>
              </div>
              
              <div className={styles.propertyGroup}>
                <label>Configuration:</label>
                <textarea 
                  rows={6}
                  placeholder="Component-specific configuration (JSON)"
                  value={JSON.stringify(selectedComponent.config, null, 2)}
                  onChange={(e) => {
                    try {
                      const config = JSON.parse(e.target.value || '{}')
                      const updatedComponents = currentApp.components.map(c =>
                        c.id === selectedComponent.id 
                          ? { ...c, config }
                          : c
                      )
                      setCurrentApp(prev => ({ ...prev, components: updatedComponents }))
                      setSelectedComponent({ ...selectedComponent, config })
                    } catch (err) {
                      // Invalid JSON, ignore for now
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div className={styles.noSelection}>
              <p>Select a component to edit its properties</p>
              
              <div className={styles.appSettings}>
                <h4>App Settings</h4>
                
                <div className={styles.propertyGroup}>
                  <label>App Icon:</label>
                  <div className={styles.iconGrid}>
                    {iconOptions.map(icon => (
                      <div 
                        key={icon}
                        className={`${styles.iconOption} ${currentApp.icon === icon ? styles.selected : ''}`}
                        onClick={() => setCurrentApp(prev => ({ ...prev, icon }))}
                      >
                        <i className={icon}></i>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AppBuilder