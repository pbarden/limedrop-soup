import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

const DEMO_USERS = [
  {
    id: 1,
    email: 'demo@chaiq.com',
    password: 'demo123',
    name: 'Demo User',
    role: 'user',
    avatar: null
  },
  {
    id: 2,
    email: 'admin@chaiq.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin',
    avatar: null
  },
  {
    id: 3,
    email: 'user@example.com',
    password: 'password',
    name: 'Example User',
    role: 'user',
    avatar: null
  }
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession()
  }, [])

  const checkExistingSession = async () => {
    try {
      const savedSession = localStorage.getItem('chaiq-session')
      if (savedSession) {
        const session = JSON.parse(savedSession)
        
        // Check if session is still valid (7 days)
        const sessionAge = Date.now() - session.timestamp
        const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
        
        if (sessionAge < maxAge) {
          setUser(session.user)
        } else {
          localStorage.removeItem('chaiq-session')
        }
      }
    } catch (error) {
      console.warn('Failed to restore session:', error)
      localStorage.removeItem('chaiq-session')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    setLoading(true)
    setError(null)

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Find user in demo users
      const foundUser = DEMO_USERS.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && u.password === password
      )

      if (!foundUser) {
        throw new Error('Invalid email or password')
      }

      // Remove password from user object
      const { password: _, ...userWithoutPassword } = foundUser

      // Create session
      const session = {
        user: userWithoutPassword,
        timestamp: Date.now(),
        sessionId: generateSessionId()
      }

      // Save session
      localStorage.setItem('chaiq-session', JSON.stringify(session))
      setUser(userWithoutPassword)

      return { success: true, user: userWithoutPassword }
    } catch (error) {
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const signup = async (email, password, name) => {
    setLoading(true)
    setError(null)

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check if user already exists
      const existingUser = DEMO_USERS.find(u => 
        u.email.toLowerCase() === email.toLowerCase()
      )

      if (existingUser) {
        throw new Error('User already exists with this email')
      }

      // Basic validation
      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address')
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long')
      }

      if (!name.trim()) {
        throw new Error('Name is required')
      }

      // Create new user (in a real app, this would be sent to backend)
      const newUser = {
        id: Date.now(),
        email: email.toLowerCase(),
        name: name.trim(),
        role: 'user',
        avatar: null
      }

      // For demo purposes, add to demo users array
      DEMO_USERS.push({ ...newUser, password })

      // Create session
      const session = {
        user: newUser,
        timestamp: Date.now(),
        sessionId: generateSessionId()
      }

      // Save session
      localStorage.setItem('chaiq-session', JSON.stringify(session))
      setUser(newUser)

      return { success: true, user: newUser }
    } catch (error) {
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      localStorage.removeItem('chaiq-session')
      setUser(null)
      setError(null)
      return { success: true }
    } catch (error) {
      console.warn('Error during logout:', error)
      return { success: false, error: error.message }
    }
  }

  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: 'No user logged in' }

    try {
      setLoading(true)

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))

      const updatedUser = { ...user, ...updates }

      // Update session
      const session = JSON.parse(localStorage.getItem('chaiq-session'))
      session.user = updatedUser
      localStorage.setItem('chaiq-session', JSON.stringify(session))

      setUser(updatedUser)
      return { success: true, user: updatedUser }
    } catch (error) {
      setError(error.message)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError(null)

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    updateProfile,
    clearError,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}