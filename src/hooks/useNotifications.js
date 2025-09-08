import { useState, useCallback } from 'react'

export function useNotifications() {
  const [notifications, setNotifications] = useState([])

  const addNotification = useCallback((notification) => {
    const id = Date.now().toString()
    const newNotification = {
      id,
      type: 'info',
      duration: 5000,
      ...notification
    }

    setNotifications(prev => [...prev, newNotification])
    return id
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Convenience methods for different notification types
  const showSuccess = useCallback((title, message, options = {}) => {
    return addNotification({ 
      type: 'success', 
      title, 
      message, 
      ...options 
    })
  }, [addNotification])

  const showError = useCallback((title, message, options = {}) => {
    return addNotification({ 
      type: 'error', 
      title, 
      message, 
      ...options 
    })
  }, [addNotification])

  const showWarning = useCallback((title, message, options = {}) => {
    return addNotification({ 
      type: 'warning', 
      title, 
      message, 
      ...options 
    })
  }, [addNotification])

  const showInfo = useCallback((title, message, options = {}) => {
    return addNotification({ 
      type: 'info', 
      title, 
      message, 
      ...options 
    })
  }, [addNotification])

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}