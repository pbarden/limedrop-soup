import { createContext, useContext, useMemo } from 'react'
import { useWindowManager } from '../hooks/useWindowManager'
import { useNotifications } from '../hooks/useNotifications'
import { useModal } from '../hooks/useModal.jsx'

const AppContext = createContext()

export function AppProvider({ children }) {
  const windowManager = useWindowManager()
  const notifications = useNotifications()
  const modal = useModal()

  const value = useMemo(() => ({
    ...windowManager,
    ...notifications,
    ...modal
  }), [windowManager, notifications, modal])

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

// Re-export individual hooks for convenience
export { useWindowManager } from '../hooks/useWindowManager'
export { useNotifications } from '../hooks/useNotifications'
export { useModal } from '../hooks/useModal.jsx'
