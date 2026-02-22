import { useMemo } from 'react'
import { useBoard } from '../../context/BoardContext'
import { FiClock, FiCalendar, FiCheckCircle, FiAlertCircle, FiCircle } from 'react-icons/fi'
import styles from './Views.module.css'

interface TimelineTask {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  column_id: string
  progress: number
  created_at: string
}

interface TimelineGroup {
  date: string
  label: string
  tasks: TimelineTask[]
  isToday: boolean
  isPast: boolean
}

export default function TimelineView() {
  const { state, selectTask, openDetailPanel } = useBoard()

  // Group tasks by date
  const timelineGroups = useMemo(() => {
    const groups = new Map<string, TimelineGroup>()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Get all tasks with dates
    const tasksWithDates: TimelineTask[] = state.tasks
      .filter(t => !t.is_archived)
      .map(task => {
        const completedSubtasks = task.subtasks?.filter(s => s.is_completed).length || 0
        const totalSubtasks = task.subtasks?.length || 0
        const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

        return {
          id: task.id,
          title: task.title,
          priority: task.priority,
          due_date: task.due_date,
          column_id: task.column_id,
          progress,
          created_at: task.created_at
        }
      })

    // Group by due date
    tasksWithDates.forEach(task => {
      const dateKey = task.due_date || 'no-date'
      const taskDate = task.due_date ? new Date(task.due_date) : null

      if (!groups.has(dateKey)) {
        let label = 'No Due Date'
        let isToday = false
        let isPast = false

        if (taskDate) {
          if (dateKey === todayStr) {
            label = 'Today'
            isToday = true
          } else if (taskDate < today) {
            label = formatDate(taskDate)
            isPast = true
          } else {
            label = formatDate(taskDate)
          }
        }

        groups.set(dateKey, {
          date: dateKey,
          label,
          tasks: [],
          isToday,
          isPast
        })
      }

      groups.get(dateKey)!.tasks.push(task)
    })

    // Sort groups by date
    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      if (a.date === 'no-date') return 1
      if (b.date === 'no-date') return -1
      return a.date.localeCompare(b.date)
    })

    // Move overdue and today to top
    const overdue: TimelineGroup[] = []
    const todayGroup: TimelineGroup[] = []
    const upcoming: TimelineGroup[] = []
    const noDate: TimelineGroup[] = []

    sortedGroups.forEach(group => {
      if (group.date === 'no-date') {
        noDate.push(group)
      } else if (group.isPast && !group.isToday) {
        overdue.push(group)
      } else if (group.isToday) {
        todayGroup.push(group)
      } else {
        upcoming.push(group)
      }
    })

    return [...todayGroup, ...overdue, ...upcoming, ...noDate]
  }, [state.tasks])

  // Calculate stats
  const timelineStats = useMemo(() => {
    const total = state.tasks.filter(t => !t.is_archived).length
    const overdue = state.tasks.filter(t => {
      if (!t.due_date || t.is_archived) return false
      const dueDate = new Date(t.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return dueDate < today
    }).length
    const today = state.tasks.filter(t => {
      if (!t.due_date) return false
      const todayStr = new Date().toISOString().split('T')[0]
      return t.due_date === todayStr
    }).length
    const upcoming = state.tasks.filter(t => {
      if (!t.due_date) return false
      const dueDate = new Date(t.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      return dueDate > today && dueDate <= nextWeek
    }).length

    return { total, overdue, today, upcoming }
  }, [state.tasks])

  function formatDate(date: Date): string {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  function getColumnTitle(columnId: string): string {
    const column = state.columns.find(c => c.id === columnId)
    return column?.title || 'Unknown'
  }

  const handleTaskClick = (taskId: string) => {
    selectTask(taskId)
    openDetailPanel(taskId)
  }

  const isCompleted = (columnId: string) => {
    const column = state.columns.find(c => c.id === columnId)
    return column?.title.toLowerCase() === 'done'
  }

  return (
    <div className={styles.timelineView}>
      {/* Header */}
      <div className={styles.timelineHeader}>
        <div className={styles.timelineTitle}>
          <div className={styles.timelineIcon}>
            <FiClock />
          </div>
          <div>
            <h1>Timeline</h1>
            <p>View tasks organized by date</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.ganttStats}>
        <div className={`${styles.statCard} ${styles.blue}`}>
          <div className={styles.statIcon}><FiCalendar /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{timelineStats.today}</span>
            <span className={styles.statLabel}>Due Today</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.green}`}>
          <div className={styles.statIcon}><FiClock /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{timelineStats.upcoming}</span>
            <span className={styles.statLabel}>This Week</span>
          </div>
        </div>
        {timelineStats.overdue > 0 && (
          <div className={`${styles.statCard} ${styles.red}`}>
            <div className={styles.statIcon}><FiAlertCircle /></div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{timelineStats.overdue}</span>
              <span className={styles.statLabel}>Overdue</span>
            </div>
          </div>
        )}
        <div className={`${styles.statCard} ${styles.purple}`}>
          <div className={styles.statIcon}><FiCheckCircle /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{timelineStats.total}</span>
            <span className={styles.statLabel}>Total Tasks</span>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className={styles.timelineContent}>
        <div className={styles.timelineLine} />

        {timelineGroups.length > 0 ? (
          timelineGroups.map(group => (
            <div key={group.date} className={styles.timelineGroup}>
              <div className={styles.timelineGroupHeader}>
                <div className={`${styles.timelineGroupDot} ${group.isToday ? styles.today : ''} ${group.isPast ? styles.past : ''}`}>
                  {group.tasks.length}
                </div>
                <div className={styles.timelineGroupDate}>
                  {group.label}
                  {group.isPast && !group.isToday && (
                    <span className={styles.timelineGroupCount}> (Overdue)</span>
                  )}
                </div>
              </div>

              <div className={styles.timelineItems}>
                {group.tasks.map(task => (
                  <div
                    key={task.id}
                    className={`${styles.timelineItem} ${isCompleted(task.column_id) ? styles.completed : ''}`}
                    onClick={() => handleTaskClick(task.id)}
                  >
                    <div className={styles.timelineItemDot} />
                    <div
                      className={styles.timelineItemPriority}
                      style={{ backgroundColor: getPriorityColor(task.priority) }}
                    />
                    <div className={styles.timelineItemContent}>
                      <div className={styles.timelineItemTitle}>{task.title}</div>
                      <div className={styles.timelineItemMeta}>
                        <span className={styles.timelineItemStatus}>
                          {getColumnTitle(task.column_id)}
                        </span>
                        {task.due_date && (
                          <span className={`${styles.timelineItemDue} ${group.isPast && !group.isToday ? styles.overdue : ''}`}>
                            <FiCalendar />
                            {task.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                    {task.progress > 0 && (
                      <div className={styles.timelineItemProgress}>
                        <div
                          className={styles.timelineItemProgressFill}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><FiClock /></div>
            <h3>No tasks found</h3>
            <p>Create tasks with due dates to see them on the timeline</p>
          </div>
        )}
      </div>
    </div>
  )
}
