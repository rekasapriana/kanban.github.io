import { FiX, FiCommand } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import styles from './TaskModal.module.css'

const shortcutCategories = [
  {
    category: 'Tasks',
    shortcuts: [
      { key: 'N', description: 'Create new task' },
      { key: 'E', description: 'Edit selected task' },
      { key: 'Enter', description: 'Open task detail' },
      { key: 'Del', description: 'Delete selected task' },
      { key: 'Backspace', description: 'Delete selected task' },
      { key: 'A', description: 'Archive selected task' },
      { key: 'Space', description: 'Toggle task selection' },
    ]
  },
  {
    category: 'Navigation',
    shortcuts: [
      { key: '↑', description: 'Navigate to previous task' },
      { key: '↓', description: 'Navigate to next task' },
      { key: '/', description: 'Focus search' },
      { key: 'F', description: 'Focus search' },
      { key: 'Esc', description: 'Close modal/panel' },
      { key: 'V', description: 'Toggle view (Board/List/Swimlanes/Calendar)' },
    ]
  },
  {
    category: 'Quick Move',
    shortcuts: [
      { key: '1', description: 'Move task to first column' },
      { key: '2', description: 'Move task to second column' },
      { key: '3', description: 'Move task to third column' },
      { key: '4', description: 'Move task to fourth column' },
      { key: '5', description: 'Move task to fifth column' },
    ]
  },
  {
    category: 'Priority',
    shortcuts: [
      { key: 'H', description: 'Set high priority' },
      { key: 'M', description: 'Set medium priority' },
      { key: 'L', description: 'Set low priority' },
    ]
  },
  {
    category: 'View',
    shortcuts: [
      { key: 'S', description: 'Toggle statistics panel' },
      { key: 'T', description: 'Toggle dark mode' },
    ]
  },
  {
    category: 'History',
    shortcuts: [
      { key: 'Ctrl+Z', description: 'Undo last action' },
      { key: 'Ctrl+Y', description: 'Redo last undone action' },
      { key: 'Ctrl+Shift+Z', description: 'Redo last undone action' },
    ]
  },
  {
    category: 'Bulk Actions',
    shortcuts: [
      { key: 'Ctrl+A', description: 'Select all tasks' },
      { key: 'Esc', description: 'Clear selection' },
    ]
  },
  {
    category: 'Help',
    shortcuts: [
      { key: '?', description: 'Show keyboard shortcuts' },
    ]
  }
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
          {shortcutCategories.map((cat, catIndex) => (
            <div key={catIndex} className={styles.shortcutCategory}>
              <h4 className={styles.categoryTitle}>{cat.category}</h4>
              <div className={styles.shortcutsBody}>
                {cat.shortcuts.map((shortcut, i) => (
                  <div key={i} className={styles.shortcutItem}>
                    <kbd>{shortcut.key}</kbd>
                    <span>{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.modalFooter}>
          <p className={styles.shortcutsHint}>
            Press <kbd>?</kbd> anytime to see this help
          </p>
        </div>
      </div>
    </div>
  )
}
