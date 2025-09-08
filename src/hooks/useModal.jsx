import { useState, useCallback } from 'react'

export function useModal() {
  const [activeModal, setActiveModal] = useState(null)

  const showModal = useCallback((modalConfig) => {
    setActiveModal(modalConfig)
  }, [])

  const closeModal = useCallback(() => {
    setActiveModal(null)
  }, [])

  const showConfirm = useCallback((title, message, onConfirm, onCancel) => {
    showModal({
      title,
      content: (
        <div>
          <p>{message}</p>
        </div>
      ),
      actions: (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            className="btn-secondary" 
            onClick={() => {
              onCancel?.()
              closeModal()
            }}
          >
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={() => {
              onConfirm?.()
              closeModal()
            }}
          >
            Confirm
          </button>
        </div>
      )
    })
  }, [showModal, closeModal])

  const showAlert = useCallback((title, message, onOk) => {
    showModal({
      title,
      content: (
        <div>
          <p>{message}</p>
        </div>
      ),
      actions: (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn-primary" 
            onClick={() => {
              onOk?.()
              closeModal()
            }}
          >
            OK
          </button>
        </div>
      )
    })
  }, [showModal, closeModal])

  return {
    activeModal,
    showModal,
    closeModal,
    showConfirm,
    showAlert
  }
}