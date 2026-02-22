import { useState, useEffect } from 'react'
import { useBoard } from '../../context/BoardContext'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../lib/api'
import type { Task } from '../../types/database'
import styles from './TrashView.module.css'

export default function TrashView() {
  const { state, restoreTask, permanentDeleteTask } = useBoard()
  const { user } = useAuth()
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])

  useEffect(() => {
    loadDeletedTasks()
  }, [state.board?.id])

  const loadDeletedTasks = async () => {
    if (!state.board?.id) return

    setLoading(true)
    const { data } = await api.getDeletedTasks(state.board.id)
    setDeletedTasks(data || [])
    setLoading(false)
  }

  const handleRestore = async (taskId: string) => {
    await restoreTask(taskId)
    await loadDeletedTasks()
  }

  const handlePermanentDelete = async (taskId: string) => {
    await permanentDeleteTask(taskId)
    await loadDeletedTasks()
  }

  const handleBulkRestore = async () => {
    if (selectedTasks.length === 0) return

    for (const taskId of selectedTasks) {
      await restoreTask(taskId)
    }
    setSelectedTasks([])
    await loadDeletedTasks()
  }

  const handleBulkPermanentDelete = async () => {
    if (selectedTasks.length === 0) return
    if (!confirm(`Permanently delete ${selectedTasks.length} tasks? This cannot be undone.`)) return

    for (const taskId of selectedTasks) {
      await api.deleteTask(taskId)
    }
    setSelectedTasks([])
    await loadDeletedTasks()
  }

  const toggleSelect = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const selectAll = () => {
    if (selectedTasks.length === deletedTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(deletedTasks.map(t => t.id))
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#22c55e'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading trash...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2>Trash</h2>
          <span className={styles.count}>{deletedTasks.length} items</span>
        </div>

        {deletedTasks.length > 0 && (
          <div className={styles.actions}>
            <button className={styles.selectAllBtn} onClick={selectAll}>
              {selectedTasks.length === deletedTasks.length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedTasks.length > 0 && (
              <>
                <button className={styles.restoreBtn} onClick={handleBulkRestore}>
                  Restore ({selectedTasks.length})
                </button>
                <button className={styles.deleteBtn} onClick={handleBulkPermanentDelete}>
                  Delete Forever ({selectedTasks.length})
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {deletedTasks.length === 0 ? (
        <div className={styles.empty}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          <h3>Trash is empty</h3>
          <p>Deleted tasks will appear here for 30 days</p>
        </div>
      ) : (
        <div className={styles.taskList}>
          {deletedTasks.map(task => (
            <div
              key={task.id}
              className={`${styles.taskItem} ${selectedTasks.includes(task.id) ? styles.selected : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedTasks.includes(task.id)}
                onChange={() => toggleSelect(task.id)}
                className={styles.checkbox}
              />

              <div className={styles.taskContent}>
                <div className={styles.taskHeader}>
                  <span
                    className={styles.priorityDot}
                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                  />
                  <h4 className={styles.taskTitle}>{task.title}</h4>
                </div>

                {task.description && (
                  <p className={styles.taskDescription}>
                    {task.description.substring(0, 100)}
                    {task.description.length > 100 ? '...' : ''}
                  </p>
                )}

                <div className={styles.taskMeta}>
                  <span className={styles.metaItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    Deleted: {formatDate(task.deleted_at)}
                  </span>
                </div>
              </div>

              <div className={styles.taskActions}>
                <button
                  className={styles.restoreBtn}
                  onClick={() => handleRestore(task.id)}
                  title="Restore task"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  Restore
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => handlePermanentDelete(task.id)}
                  title="Delete forever"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
