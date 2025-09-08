import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import styles from '../styles/UserMenu.module.css'

function UserMenu() {
  const { user, logout, isAdmin } = useAuth()
  const { showNotification } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      showNotification('Logged out successfully', 'success')
    } else {
      showNotification('Failed to logout', 'error')
    }
    setIsOpen(false)
  }

  const formatUserInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatUserRole = (role) => {
    return role === 'admin' ? 'Administrator' : 'User'
  }

  return (
    <div className={styles.userMenu} ref={menuRef}>
      <button
        className={styles.userButton}
        onClick={() => setIsOpen(!isOpen)}
        title={`${user?.name} (${formatUserRole(user?.role)})`}
      >
        <div className={styles.userAvatar}>
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} />
          ) : (
            <span>{formatUserInitials(user?.name || 'U')}</span>
          )}
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.name}</span>
          {isAdmin && (
            <span className={styles.userRole}>
              <i className="fas fa-shield-alt"></i>
              Admin
            </span>
          )}
        </div>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} ${styles.chevron}`}></i>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.userProfile}>
            <div className={styles.profileAvatar}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{formatUserInitials(user?.name || 'U')}</span>
              )}
            </div>
            <div className={styles.profileInfo}>
              <div className={styles.profileName}>{user?.name}</div>
              <div className={styles.profileEmail}>{user?.email}</div>
              <div className={styles.profileRole}>
                {isAdmin && <i className="fas fa-shield-alt"></i>}
                {formatUserRole(user?.role)}
              </div>
            </div>
          </div>

          <div className={styles.menuDivider}></div>

          <div className={styles.menuItems}>
            <button className={styles.menuItem} onClick={() => setIsOpen(false)}>
              <i className="fas fa-user"></i>
              <span>Profile Settings</span>
            </button>

            <button className={styles.menuItem} onClick={() => setIsOpen(false)}>
              <i className="fas fa-cog"></i>
              <span>System Preferences</span>
            </button>

            {isAdmin && (
              <button className={styles.menuItem} onClick={() => setIsOpen(false)}>
                <i className="fas fa-tools"></i>
                <span>Admin Panel</span>
              </button>
            )}

            <div className={styles.menuDivider}></div>

            <button className={styles.menuItem} onClick={() => setIsOpen(false)}>
              <i className="fas fa-question-circle"></i>
              <span>Help & Support</span>
            </button>

            <button className={styles.menuItem} onClick={() => setIsOpen(false)}>
              <i className="fas fa-info-circle"></i>
              <span>About LimeDrop</span>
            </button>

            <div className={styles.menuDivider}></div>

            <button 
              className={`${styles.menuItem} ${styles.logoutItem}`} 
              onClick={handleLogout}
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu