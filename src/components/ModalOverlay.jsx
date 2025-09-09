import { useApp } from '../contexts/AppContext'
import styles from '../styles/ModalOverlay.module.css'

function ModalOverlay() {
  const { activeModal, closeModal } = useApp()

  if (!activeModal) return null

  return (
    <div 
      id="modal-overlay" 
      className={`${styles.modalOverlay} ${styles.active}`}
      onClick={closeModal}
    >
      <div className={`${styles.modal} ${activeModal.size === 'large' ? styles.modalLarge : ''}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>{activeModal.title}</div>
          <button className={styles.modalClose} onClick={closeModal}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          {activeModal.content}
        </div>
        <div className={styles.modalFooter}>
          {activeModal.actions}
        </div>
      </div>
    </div>
  )
}

export default ModalOverlay