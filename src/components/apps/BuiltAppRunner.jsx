import { useState, useEffect } from 'react'
import styles from '../../styles/BuiltAppRunner.module.css'

function BuiltAppRunner({ appData }) {
  const [appState, setAppState] = useState({})
  const [executionLog, setExecutionLog] = useState([])

  useEffect(() => {
    // Initialize app state based on components
    const initialState = {}
    appData.components.forEach(component => {
      initialState[component.id] = {
        value: '',
        data: null,
        status: 'ready'
      }
    })
    setAppState(initialState)
    addToLog('App initialized with ' + appData.components.length + ' components')
  }, [appData])

  const addToLog = (message) => {
    setExecutionLog(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message
    }])
  }

  const updateComponentState = (componentId, updates) => {
    setAppState(prev => ({
      ...prev,
      [componentId]: { ...prev[componentId], ...updates }
    }))
  }

  const executeComponent = (componentId) => {
    const component = appData.components.find(c => c.id === componentId)
    if (!component) return

    addToLog(`Executing ${component.name} (${component.type})`)
    updateComponentState(componentId, { status: 'executing' })

    // Simulate component execution based on type
    setTimeout(() => {
      switch (component.type) {
        case 'text-input':
          updateComponentState(componentId, { 
            status: 'completed',
            value: appState[componentId]?.value || ''
          })
          break
        
        case 'ai-prompt':
          // Simulate AI processing
          updateComponentState(componentId, { 
            status: 'completed',
            data: `AI Response: Processed "${appState[componentId]?.value || 'input'}"`
          })
          break
        
        case 'data-transform':
          // Simulate data transformation
          const input = appState[componentId]?.value || 'data'
          updateComponentState(componentId, { 
            status: 'completed',
            data: input.toUpperCase() + ' [TRANSFORMED]'
          })
          break
        
        case 'display':
          // Display component shows results
          updateComponentState(componentId, { 
            status: 'completed',
            data: 'Displaying results...'
          })
          break
        
        default:
          updateComponentState(componentId, { 
            status: 'completed',
            data: 'Component executed successfully'
          })
      }
      addToLog(`${component.name} completed`)
    }, Math.random() * 1000 + 500) // Random delay 0.5-1.5s
  }

  const runAllComponents = () => {
    addToLog('Running all components in sequence...')
    appData.components.forEach((component, index) => {
      setTimeout(() => {
        executeComponent(component.id)
      }, index * 1200) // Stagger execution
    })
  }

  const clearLog = () => {
    setExecutionLog([])
    addToLog('Execution log cleared')
  }

  const renderComponent = (component) => {
    const state = appState[component.id] || {}
    
    return (
      <div key={component.id} className={styles.componentRunner}>
        <div className={styles.componentHeader}>
          <div className={styles.componentInfo}>
            <i className={component.icon}></i>
            <span className={styles.componentName}>{component.name}</span>
            <span className={styles.componentType}>({component.type})</span>
          </div>
          <div className={`${styles.componentStatus} ${styles[state.status] || ''}`}>
            {state.status || 'ready'}
          </div>
        </div>
        
        <div className={styles.componentBody}>
          {component.type === 'text-input' && (
            <input
              type="text"
              placeholder="Enter text..."
              value={state.value || ''}
              onChange={(e) => updateComponentState(component.id, { value: e.target.value })}
              className={styles.componentInput}
            />
          )}
          
          {component.type === 'file-upload' && (
            <input
              type="file"
              onChange={(e) => updateComponentState(component.id, { value: e.target.files[0]?.name || '' })}
              className={styles.componentInput}
            />
          )}
          
          {(['ai-prompt', 'data-transform', 'display', 'export'].includes(component.type)) && (
            <div className={styles.componentOutput}>
              {state.data || 'No output yet'}
            </div>
          )}
          
          <button
            className={`btn-primary btn-small ${styles.executeBtn}`}
            onClick={() => executeComponent(component.id)}
            disabled={state.status === 'executing'}
          >
            {state.status === 'executing' ? 'Running...' : 'Execute'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.builtAppRunner}>
      <div className={styles.appHeader}>
        <div className={styles.appInfo}>
          <i className={appData.icon}></i>
          <h2>{appData.name}</h2>
          <span className={styles.componentCount}>
            {appData.components.length} components
          </span>
        </div>
        <div className={styles.appActions}>
          <button className="btn-primary" onClick={runAllComponents}>
            Run All
          </button>
          <button className="btn-secondary" onClick={clearLog}>
            Clear Log
          </button>
        </div>
      </div>

      <div className={styles.appBody}>
        <div className={styles.componentsArea}>
          <h3>Components</h3>
          <div className={styles.componentsList}>
            {appData.components.map(renderComponent)}
          </div>
        </div>

        <div className={styles.executionArea}>
          <h3>Execution Log</h3>
          <div className={styles.executionLog}>
            {executionLog.map((entry, index) => (
              <div key={index} className={styles.logEntry}>
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