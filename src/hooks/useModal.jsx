import { useState, useCallback } from 'react'

export function useModal() {
  const [activeModal, setActiveModal] = useState(null)

  const closeModal = useCallback(() => {
    setActiveModal(null)
  }, [])

  /**
   * Accepts either a fully-built modal ({ title, content, actions }) or the
   * declarative form ({ title, message, type: 'confirm', onConfirm, onCancel }),
   * building content and buttons for the latter.
   */
  const showModal = useCallback((modalConfig) => {
    if (modalConfig.content || modalConfig.actions) {
      setActiveModal(modalConfig)
      return
    }

    const { title, message, type, onConfirm, onCancel, confirmLabel, cancelLabel } = modalConfig
    const isConfirm = type === 'confirm'

    setActiveModal({
      ...modalConfig,
      title,
      content: <p>{message}</p>,
      actions: (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          {isConfirm && (
            <button
              className="btn-secondary"
              onClick={() => { onCancel?.(); closeModal() }}
            >
              {cancelLabel || 'Cancel'}
            </button>
          )}
          <button
            className="btn-primary"
            onClick={() => { onConfirm?.(); closeModal() }}
          >
            {confirmLabel || (isConfirm ? 'Confirm' : 'OK')}
          </button>
        </div>
      )
    })
  }, [closeModal])

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