import { useState, useEffect, useCallback } from 'react'
import { FiStar, FiClock, FiColumns } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import { useAuth } from '../../context/AuthContext'
import { getStarredTaskIds, toggleStarredTask } from '../../lib/api'
import { formatDateDisplay } from '../../utils/dateUtils'
import styles from './Views.module.css'

export default function StarredView() {
  const { state, openDetailPanel } = useBoard()
  const { user } = useAuth()
  const [starredTaskIds, setStarredTaskIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const loadStarredTasks = useCallback(async () => {
    if (!user) return
    console.log('[StarredView] Loading starred tasks for user:', user.id)
    setLoading(true)
    const { data, error } = await getStarredTaskIds(user.id)
    console.log('[StarredView] Result - data:', data, 'error:', error)
    if (!error && data) {
      setStarredTaskIds(data)
    }
    setLoading(false)
  }, [user])

  // Reload when component mounts or when we navigate to this view
  useEffect(() => {
    loadStarredTasks()
  }, [loadStarredTasks])

  // Also reload periodically to catch updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadStarredTasks()
    }, 3000)
    return () => clearInterval(interval)
  }, [loadStarredTasks])

  useEffect(() => {
    loadStarredTasks()
  }, [loadStarredTasks])

  const handleToggleStar = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return

    const { starred, error } = await toggleStarredTask(user.id, taskId)
    if (!error) {
      if (starred) {
        setStarredTaskIds([...starredTaskIds, taskId])
      } else {
        setStarredTaskIds(starredTaskIds.filter(id => id !== taskId))
      }
    }
  }

  const starredTasksList = state.tasks.filter(t => starredTaskIds.includes(t.id))
  console.log('[StarredView] All tasks:', state.tasks.length, 'Starred IDs:', starredTaskIds.length, 'Filtered:', starredTasksList.length)

  if (loading) {
    return (
      <div className={styles.viewContainer}>
        <div className={styles.loading}>Loading starred tasks...</div>
      </div>
    )
  }

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <h1><FiStar style={{ marginRight: 8, color: '#f59e0b' }} />Starred Tasks</h1>
        <p>Your important tasks in one place ({starredTasksList.length} tasks)</p>
      </div>

      {starredTasksList.length > 0 ? (
        <div className={styles.starredGrid}>
          {starredTasksList.map(task => (
            <div
              key={task.id}
              className={styles.starredCard}
              onClick={() => openDetailPanel(task.id)}
            >
              <button
                className={`${styles.starButton} ${styles.active}`}
                onClick={(e) => handleToggleStar(task.id, e)}
              >
                <FiStar />
              </button>
              <div className={styles.starredContent}>
                <h3>{task.title}</h3>
                {task.description && <p>{task.description}</p>}
                <div className={styles.starredMeta}>
                  <span className={`${styles.priorityBadge} ${styles[task.priority]}`}>
                    {task.priority}
                  </span>
                  <span className={styles.statusBadge}>
                    <FiColumns style={{ marginRight: 4 }} />
                    {state.columns.find(c => c.id === task.column_id)?.title || 'Unknown'}
                  </span>
                  {task.due_date && (
                    <span className={styles.dueInfo}>
                      <FiClock />
                      {formatDateDisplay(task.due_date)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <FiStar className={styles.emptyIcon} />
          <h3>No starred tasks</h3>
          <p>Star tasks from the Kanban board to keep track of your most important items</p>
        </div>
      )}
    </div>
  )
}
