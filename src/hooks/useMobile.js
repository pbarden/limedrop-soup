import { useState, useEffect } from 'react'

export function useMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768
    }
    return false
  })

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('resize', checkMobile)
    checkMobile() // Check on mount

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}