import { useNotifications } from '../hooks/useNotifications'
import Notification from './Notification'
import styles from '../styles/NotificationContainer.module.css'

function NotificationContainer() {
  const { notifications } = useNotifications()

  return (
    <div id="notification-container" className={styles.notificationContainer}>
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          {...notification}
        />
      ))}
    </div>
  )
}

export default NotificationContainer