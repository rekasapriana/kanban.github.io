import { FiX, FiCommand } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import styles from './TaskModal.module.css'

const shortcuts = [
  { key: 'N', description: 'New Task' },
  { key: 'Esc', description: 'Close Modal' },
  { key: 'S', description: 'Toggle Statistics' },
  { key: 'T', description: 'Toggle Theme' },
  { key: '?', description: 'Show Shortcuts' },
  { key: 'Del', description: 'Delete Selected Task' },
]

export default function ShortcutsModal() {
  const { state, toggleShortcutsModal } = useBoard()

  const handleClose = () => {
    toggleShortcutsModal()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!state.isShortcutsModalOpen) return null

  return (
    <div
      className={`${styles.modalOverlay} ${state.isShortcutsModalOpen ? styles.active : ''}`}
      onClick={handleOverlayClick}
    >
      <div className={`${styles.modal} ${styles.modalSmall}`}>
        <div className={styles.modalHeader}>
          <h3>
            <FiCommand />
            Keyboard Shortcuts
          </h3>
          <button className={styles.modalClose} onClick={handleClose}>
            <FiX />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.shortcutsBody}>
            {shortcuts.map((shortcut, i) => (
              <div key={i} className={styles.shortcutItem}>
                <kbd>{shortcut.key}</kbd>
                <span>{shortcut.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
