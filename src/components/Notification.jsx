import { useEffect } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import styles from '../styles/Notification.module.css'

function Notification({ id, title, message, type, duration = 5000 }) {
  const { removeNotification } = useNotifications()

  useEffect(() => {
    const timer = setTimeout(() => {
      removeNotification(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, removeNotification])

  const getIcon = () => {
    switch (type) {
      case 'success': return 'fas fa-check-circle'
      case 'error': return 'fas fa-times-circle'
      case 'warning': return 'fas fa-exclamation-triangle'
      default: return 'fas fa-info-circle'
    }
  }

  return (
    <div className={`${styles.notification} ${styles[type]}`}>
      <div className={styles.notificationIcon}>
        <i className={getIcon()}></i>
      </div>
      <div className={styles.notificationContent}>
        <div className={styles.notificationTitle}>{title}</div>
        <div className={styles.notificationMessage}>{message}</div>
      </div>
      <button 
        className={styles.notificationClose}
        onClick={() => removeNotification(id)}
      >
        ×
      </button>
    </div>
  )
}

export default Notification