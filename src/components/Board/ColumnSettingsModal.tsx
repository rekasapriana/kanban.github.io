import { useState, useEffect } from 'react'
import { FiX, FiAlertCircle } from 'react-icons/fi'
import type { Column } from '../../types/database'
import { useBoard } from '../../context/BoardContext'
import styles from './ColumnSettingsModal.module.css'

interface ColumnSettingsModalProps {
  column: Column
  onClose: () => void
}

export default function ColumnSettingsModal({ column, onClose }: ColumnSettingsModalProps) {
  const { updateColumn, checkWipLimit } = useBoard()
  const [wipLimit, setWipLimit] = useState<string>(column.wip_limit?.toString() || '')
  const [loading, setLoading] = useState(false)

  const wipInfo = checkWipLimit(column.id)

  const handleSave = async () => {
    setLoading(true)
    try {
      const limitValue = wipLimit ? parseInt(wipLimit, 10) : null
      if (limitValue !== null && limitValue < 1) {
        alert('WIP limit must be at least 1')
        setLoading(false)
        return
      }

      await updateColumn(column.id, { wip_limit: limitValue })
      onClose()
    } catch (error) {
      console.error('Failed to save column settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Column Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <label className={styles.label}>Column Name</label>
            <input
              type="text"
              value={column.title}
              disabled
              className={styles.inputDisabled}
            />
          </div>

          <div className={styles.section}>
            <label className={styles.label}>
              WIP (Work In Progress) Limit
              <span className={styles.hint}>Maximum tasks allowed in this column</span>
            </label>
            <input
              type="number"
              min="1"
              value={wipLimit}
              onChange={(e) => setWipLimit(e.target.value)}
              placeholder="No limit"
              className={styles.input}
            />
            <p className={styles.currentCount}>
              Current tasks: <strong>{wipInfo.current}</strong>
              {wipInfo.limit && (
                <span className={wipInfo.atLimit ? styles.atLimit : ''}>
                  {' '} / Limit: {wipInfo.limit}
                </span>
              )}
            </p>
          </div>

          <div className={styles.infoBox}>
            <FiAlertCircle />
            <div>
              <strong>What is WIP Limit?</strong>
              <p>
                WIP limits help control workflow by limiting how many tasks can be in a column at once.
                When the limit is reached, new tasks cannot be added until existing ones are moved.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
