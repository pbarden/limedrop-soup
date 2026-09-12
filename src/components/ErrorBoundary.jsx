import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    }
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error caught by boundary:', error)
    console.error('Error info:', errorInfo)
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    })

    // You could also log the error to an error reporting service here
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      })
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    })
  }

  render() {
    if (this.state.hasError) {
      const { fallback, showDetails = false } = this.props
      
      // Custom fallback UI provided by parent
      if (fallback) {
        return fallback(this.state.error, this.handleReset, this.handleReload)
      }

      // Default error UI
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          borderRadius: '8px',
          background: 'rgba(220, 53, 69, 0.1)',
          border: '1px solid rgba(220, 53, 69, 0.3)',
          color: '#721c24'
        }}>
          <h2 style={{ 
            margin: '0 0 16px 0', 
            fontSize: '18px',
            color: '#721c24'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
            Something went wrong
          </h2>
          
          <p style={{ margin: '0 0 16px 0' }}>
            We&apos;re sorry, but something unexpected happened. You can try reloading the page or resetting this component.
          </p>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={this.handleReset}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-redo" style={{ marginRight: '4px' }}></i>
              Try Again
            </button>
            
            <button
              onClick={this.handleReload}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-refresh" style={{ marginRight: '4px' }}></i>
              Reload Page
            </button>
          </div>

          {showDetails && this.state.error && (
            <details style={{
              background: 'rgba(0, 0, 0, 0.1)',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                Technical Details
              </summary>
              <div>
                <strong>Error:</strong> {this.state.error.toString()}
              </div>
              {this.state.errorInfo && (
                <div style={{ marginTop: '8px' }}>
                  <strong>Stack Trace:</strong>
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    margin: '4px 0 0 0',
                    fontSize: '11px'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component wrapper for functional components
export function withErrorBoundary(WrappedComponent, errorBoundaryConfig = {}) {
  const WithErrorBoundaryComponent = (props) => (
    <ErrorBoundary {...errorBoundaryConfig}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )
  
  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return WithErrorBoundaryComponent
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState(null)

  const handleError = React.useCallback((error) => {
    console.error('Error handled by useErrorHandler:', error)
    setError(error)
  }, [])

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  if (error) {
    throw error // This will be caught by the nearest error boundary
  }

  return { handleError, resetError }
}

export default ErrorBoundary