import { useState, useMemo } from 'react'
import { useBoard } from '../../context/BoardContext'
import type { Task } from '../../types/database'
import styles from './CalendarView.module.css'

interface CalendarViewProps {
  onTaskClick: (taskId: string) => void
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return '#ef4444'
    case 'medium': return '#f59e0b'
    case 'low': return '#22c55e'
    default: return '#6b7280'
  }
}

const getColumnColor = (task: Task, columns: { id: string; title: string; color: string }[]) => {
  const column = columns.find(c => c.id === task.column_id)
  const titleLower = column?.title.toLowerCase() || ''

  if (titleLower === 'to do') return '#4f46e5'
  if (titleLower === 'in progress' || titleLower === 'doing') return '#f59e0b'
  if (titleLower === 'review') return '#06b6d4'
  if (titleLower === 'done') return '#22c55e'
  return '#64748b'
}

export default function CalendarView({ onTaskClick }: CalendarViewProps) {
  const { state } = useBoard()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')

  // Get tasks with due dates
  const tasksWithDueDates = useMemo(() => {
    return state.tasks.filter(task => task.due_date && !task.deleted_at)
  }, [state.tasks])

  // Get calendar days for the current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const days: { date: Date; isCurrentMonth: boolean; tasks: Task[] }[] = []

    // Add days from previous month
    const startDay = firstDay.getDay()
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      const dateStr = date.toISOString().split('T')[0]
      const dayTasks = tasksWithDueDates.filter(t => t.due_date?.split('T')[0] === dateStr)
      days.push({ date, isCurrentMonth: false, tasks: dayTasks })
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i)
      const dateStr = date.toISOString().split('T')[0]
      const dayTasks = tasksWithDueDates.filter(t => t.due_date?.split('T')[0] === dateStr)
      days.push({ date, isCurrentMonth: true, tasks: dayTasks })
    }

    // Add days from next month to fill the grid
    const remainingDays = 42 - days.length // 6 rows x 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i)
      const dateStr = date.toISOString().split('T')[0]
      const dayTasks = tasksWithDueDates.filter(t => t.due_date?.split('T')[0] === dateStr)
      days.push({ date, isCurrentMonth: false, tasks: dayTasks })
    }

    return days
  }, [currentDate, tasksWithDueDates])

  const navigateMonth = (direction: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + direction)
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(dateStr) < today
  }

  const columnsWithColor = state.columns.map(c => ({
    id: c.id,
    title: c.title,
    color: c.color
  }))

  return (
    <div className={styles.container}>
      {/* Calendar Header */}
      <div className={styles.header}>
        <div className={styles.navigation}>
          <button className={styles.navBtn} onClick={() => navigateMonth(-1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h2 className={styles.currentMonth}>
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button className={styles.navBtn} onClick={() => navigateMonth(1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.todayBtn} onClick={goToToday}>
            Today
          </button>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'month' ? styles.active : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'week' ? styles.active : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Day Headers */}
      <div className={styles.dayHeaders}>
        {DAYS.map(day => (
          <div key={day} className={styles.dayHeader}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className={styles.calendarGrid}>
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`${styles.calendarDay} ${!day.isCurrentMonth ? styles.otherMonth : ''} ${isToday(day.date) ? styles.today : ''}`}
          >
            <div className={styles.dayNumber}>
              {day.date.getDate()}
            </div>

            <div className={styles.taskList}>
              {day.tasks.slice(0, 3).map(task => (
                <div
                  key={task.id}
                  className={`${styles.taskItem} ${isOverdue(task.due_date) ? styles.overdue : ''}`}
                  style={{ borderLeftColor: getPriorityColor(task.priority) }}
                  onClick={() => onTaskClick(task.id)}
                >
                  <span className={styles.taskTitle}>{task.title}</span>
                </div>
              ))}
              {day.tasks.length > 3 && (
                <div className={styles.moreTasks}>
                  +{day.tasks.length - 3} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ backgroundColor: '#ef4444' }} />
          High Priority
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ backgroundColor: '#f59e0b' }} />
          Medium Priority
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ backgroundColor: '#22c55e' }} />
          Low Priority
        </div>
      </div>
    </div>
  )
}
