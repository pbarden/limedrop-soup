import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import styles from '../styles/Login.module.css'

function Login() {
  const { login, signup, loading, error, clearError } = useAuth()
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  })
  const [validationErrors, setValidationErrors] = useState({})

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
    
    // Clear auth error
    if (error) {
      clearError()
    }
  }

  const validateForm = () => {
    const errors = {}

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (!isLoginMode && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long'
    }

    // Signup-specific validation
    if (!isLoginMode) {
      if (!formData.name.trim()) {
        errors.name = 'Name is required'
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (isLoginMode) {
      const result = await login(formData.email, formData.password)
      if (!result.success) {
        console.log('Login failed:', result.error)
      }
    } else {
      const result = await signup(formData.email, formData.password, formData.name)
      if (!result.success) {
        console.log('Signup failed:', result.error)
      }
    }
  }

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode)
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: ''
    })
    setValidationErrors({})
    clearError()
  }

  const fillDemoCredentials = (userType = 'demo') => {
    if (userType === 'admin') {
      setFormData(prev => ({
        ...prev,
        email: 'admin@limedrop.com',
        password: 'admin123'
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        email: 'demo@limedrop.com',
        password: 'demo123'
      }))
    }
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.logo}>
            <i className="fas fa-desktop"></i>
          </div>
          <h1>LimeDrop Desktop OS</h1>
          <p>Welcome to your virtual desktop environment</p>
        </div>

        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <h2>{isLoginMode ? 'Sign In' : 'Create Account'}</h2>

          {error && (
            <div className={styles.errorMessage}>
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}

          {!isLoginMode && (
            <div className={styles.inputGroup}>
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={validationErrors.name ? styles.error : ''}
                placeholder="Enter your full name"
                disabled={loading}
              />
              {validationErrors.name && (
                <span className={styles.fieldError}>{validationErrors.name}</span>
              )}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={validationErrors.email ? styles.error : ''}
              placeholder="Enter your email address"
              disabled={loading}
            />
            {validationErrors.email && (
              <span className={styles.fieldError}>{validationErrors.email}</span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={validationErrors.password ? styles.error : ''}
              placeholder={isLoginMode ? "Enter your password" : "Create a password (min 6 characters)"}
              disabled={loading}
            />
            {validationErrors.password && (
              <span className={styles.fieldError}>{validationErrors.password}</span>
            )}
          </div>

          {!isLoginMode && (
            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={validationErrors.confirmPassword ? styles.error : ''}
                placeholder="Confirm your password"
                disabled={loading}
              />
              {validationErrors.confirmPassword && (
                <span className={styles.fieldError}>{validationErrors.confirmPassword}</span>
              )}
            </div>
          )}

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                {isLoginMode ? 'Signing In...' : 'Creating Account...'}
              </>
            ) : (
              <>
                <i className={isLoginMode ? "fas fa-sign-in-alt" : "fas fa-user-plus"}></i>
                {isLoginMode ? 'Sign In' : 'Create Account'}
              </>
            )}
          </button>

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.linkButton}
              onClick={toggleMode}
              disabled={loading}
            >
              {isLoginMode 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          {isLoginMode && (
            <div className={styles.demoSection}>
              <p className={styles.demoLabel}>Quick Demo Access:</p>
              <div className={styles.demoButtons}>
                <button
                  type="button"
                  className={styles.demoButton}
                  onClick={() => fillDemoCredentials('demo')}
                  disabled={loading}
                >
                  <i className="fas fa-user"></i>
                  Demo User
                </button>
                <button
                  type="button"
                  className={styles.demoButton}
                  onClick={() => fillDemoCredentials('admin')}
                  disabled={loading}
                >
                  <i className="fas fa-user-shield"></i>
                  Admin User
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className={styles.backgroundPattern}>
        <div className={styles.pattern}></div>
      </div>
    </div>
  )
}

export default Login