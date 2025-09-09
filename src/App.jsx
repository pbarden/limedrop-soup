import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Desktop from './pages/Desktop'
import Login from './components/Login'
import ErrorBoundary from './components/ErrorBoundary'
import './styles/global.css'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '18px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '16px' }}></i>
          <div>Loading ChaiQ App Builder...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Desktop />} />
          <Route path="*" element={<Desktop />} />
        </Routes>
      </div>
    </Router>
  )
}

function App() {
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <AppContent />
    </ErrorBoundary>
  )
}

export default App