import { useState, useEffect } from 'react'
import { FiEye, FiEyeOff, FiLoader } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useBoard } from '../../context/BoardContext'
import { getWatchedTasks, unwatchTask } from '../../lib/api'
import { useToast } from '../../hooks/useToast'
import styles from './Views.module.css'

interface WatchedTask {
  id: string
  title: string
  description?: string
  priority: string
  due_date?: string
  column_id: string
}

interface WatchedTaskItem {
  task_id: string
  tasks: WatchedTask | null
}

export default function WatchingView() {
  const { user } = useAuth()
  const { openDetailPanel } = useBoard()
  const { showToast } = useToast()
  const [tasks, setTasks] = useState<WatchedTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWatchedTasks()
  }, [user])

  const loadWatchedTasks = async () => {
    if (!user) return
    setLoading(true)

    const { data, error } = await getWatchedTasks(user.id)
    if (error) {
      console.error('Error loading watched tasks:', error)
    } else {
      // Transform the data to extract task details
      const taskList = (data as WatchedTaskItem[] || [])
        .filter((item) => item.tasks)
        .map((item) => item.tasks as WatchedTask)
      setTasks(taskList)
    }
    setLoading(false)
  }

  const handleUnwatch = async (taskId: string) => {
    if (!user) return

    const { error } = await unwatchTask(taskId, user.id)
    if (error) {
      showToast('Failed to stop watching', 'error')
    } else {
      setTasks(tasks.filter(t => t.id !== taskId))
      showToast('Stopped watching this task', 'info')
    }
  }

  const handleTaskClick = (taskId: string) => {
    openDetailPanel(taskId)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#22c55e'
      default: return '#6b7280'
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: 'Overdue', color: '#ef4444' }
    if (diffDays === 0) return { text: 'Today', color: '#f59e0b' }
    if (diffDays === 1) return { text: 'Tomorrow', color: '#3b82f6' }
    return { text: date.toLocaleDateString(), color: '#6b7280' }
  }

  if (loading) {
    return (
      <div className={styles.watchingView}>
        <div className={styles.loading}>
          <FiLoader className={styles.spinner} />
          <span>Loading watched tasks...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.watchingView}>
      {/* Header */}
      <div className={styles.watchingHeader}>
        <div className={styles.watchingTitle}>
          <div className={styles.watchingIcon}>
            <FiEye />
          </div>
          <div>
            <h1>Watching</h1>
            <p>{tasks.length} task{tasks.length !== 1 ? 's' : ''} you're following</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className={styles.watchingInfo}>
        <p>You'll receive notifications when these tasks are updated.</p>
      </div>

      {/* Tasks List */}
      <div className={styles.watchingList}>
        {tasks.length > 0 ? (
          tasks.map(task => {
            const dueInfo = formatDate(task.due_date)
            return (
              <div key={task.id} className={styles.watchingCard}>
                <div className={styles.watchingCardHeader}>
                  <span
                    className={styles.priorityBadge}
                    style={{ background: getPriorityColor(task.priority) }}
                  >
                    {task.priority}
                  </span>
                  {dueInfo && (
                    <span className={styles.dueBadge} style={{ color: dueInfo.color }}>
                      {dueInfo.text}
                    </span>
                  )}
                </div>
                <h3 className={styles.watchingCardTitle} onClick={() => handleTaskClick(task.id)}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className={styles.watchingCardDesc}>{task.description}</p>
                )}
                <div className={styles.watchingCardActions}>
                  <button
                    className={styles.unwatchBtn}
                    onClick={() => handleUnwatch(task.id)}
                  >
                    <FiEyeOff /> Stop Watching
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className={styles.emptyWatching}>
            <div className={styles.emptyWatchingIcon}>
              <FiEye />
            </div>
            <h3>No watched tasks</h3>
            <p>Click the "Watch" button on any task to follow its updates</p>
          </div>
        )}
      </div>
    </div>
  )
}
