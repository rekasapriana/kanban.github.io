import { useState, useMemo } from 'react'
import { useBoard } from '../../context/BoardContext'
import { FiChevronLeft, FiChevronRight, FiCalendar, FiClock, FiPlus } from 'react-icons/fi'
import styles from './Views.module.css'

export default function CalendarView() {
  const { state, openModal, selectTask } = useBoard()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  // Get tasks for a specific date
  const getTasksForDate = (date: string) => {
    return state.tasks.filter(t => t.due_date === date)
  }

  // Calendar stats
  const calendarStats = useMemo(() => {
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

    const monthTasks = state.tasks.filter(t => t.due_date && t.due_date >= monthStart && t.due_date <= monthEnd)
    const todayStr = new Date().toISOString().split('T')[0]
    const overdueTasks = state.tasks.filter(t => t.due_date && t.due_date < todayStr)

    return {
      monthTasks: monthTasks.length,
      overdueTasks: overdueTasks.length,
      thisWeekTasks: state.tasks.filter(t => {
        if (!t.due_date) return false
        const taskDate = new Date(t.due_date)
        const today = new Date()
        const weekEnd = new Date(today)
        weekEnd.setDate(today.getDate() + 7)
        return taskDate >= today && taskDate <= weekEnd
      }).length
    }
  }, [state.tasks, year, month, daysInMonth])

  // Generate calendar days
  const calendarDays = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    calendarDays.push({ day, dateStr })
  }

  const today = new Date().toISOString().split('T')[0]
  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : []

  const getColumnTitle = (columnId: string) => {
    return state.columns.find(c => c.id === columnId)?.title || 'Unknown'
  }

  return (
    <div className={styles.calendarView}>
      {/* Calendar Header */}
      <div className={styles.calendarHeaderSection}>
        <div className={styles.calendarTitle}>
          <div className={styles.calendarIcon}>
            <FiCalendar />
          </div>
          <div>
            <h1>{monthNames[month]} {year}</h1>
            <p>Manage your schedule and deadlines</p>
          </div>
        </div>
        <div className={styles.calendarNav}>
          <button className={styles.navBtn} onClick={prevMonth}>
            <FiChevronLeft />
          </button>
          <button className={styles.todayBtn} onClick={goToToday}>Today</button>
          <button className={styles.navBtn} onClick={nextMonth}>
            <FiChevronRight />
          </button>
        </div>
      </div>

      {/* Calendar Stats */}
      <div className={styles.calendarStats}>
        <div className={styles.calendarStatCard}>
          <div className={styles.calendarStatIcon}>
            <FiCalendar />
          </div>
          <div className={styles.calendarStatContent}>
            <span className={styles.calendarStatValue}>{calendarStats.thisWeekTasks}</span>
            <span className={styles.calendarStatLabel}>This Week</span>
          </div>
        </div>
        <div className={styles.calendarStatCard}>
          <div className={styles.calendarStatIcon}>
            <FiClock />
          </div>
          <div className={styles.calendarStatContent}>
            <span className={styles.calendarStatValue}>{calendarStats.monthTasks}</span>
            <span className={styles.calendarStatLabel}>This Month</span>
          </div>
        </div>
        {calendarStats.overdueTasks > 0 && (
          <div className={`${styles.calendarStatCard} ${styles.warning}`}>
            <div className={styles.calendarStatIcon}>
              <FiClock />
            </div>
            <div className={styles.calendarStatContent}>
              <span className={styles.calendarStatValue}>{calendarStats.overdueTasks}</span>
              <span className={styles.calendarStatLabel}>Overdue</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.calendarBody}>
        {/* Calendar Grid */}
        <div className={styles.calendarWrapper}>
          <div className={styles.calendarGridHeader}>
            {dayNames.map(day => (
              <div key={day} className={styles.calendarGridDayName}>{day}</div>
            ))}
          </div>
          <div className={styles.calendarGrid}>
            {calendarDays.map((item, index) => {
              if (!item) {
                return <div key={`empty-${index}`} className={styles.calendarEmptyDay} />
              }

              const tasks = getTasksForDate(item.dateStr)
              const isToday = item.dateStr === today
              const isSelected = item.dateStr === selectedDate
              const isPast = item.dateStr < today

              return (
                <div
                  key={item.dateStr}
                  className={`${styles.calendarDayCell} ${isToday ? styles.today : ''} ${isSelected ? styles.selected : ''} ${isPast ? styles.past : ''}`}
                  onClick={() => setSelectedDate(item.dateStr)}
                >
                  <span className={styles.calendarDayNumber}>{item.day}</span>
                  {tasks.length > 0 && (
                    <div className={styles.calendarDayTasks}>
                      {tasks.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          className={`${styles.calendarTaskDot} ${styles[task.priority]}`}
                        />
                      ))}
                      {tasks.length > 2 && (
                        <span className={styles.calendarMoreTasks}>+{tasks.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected Date Panel */}
        <div className={styles.calendarSidePanel}>
          {selectedDate ? (
            <>
              <div className={styles.selectedDateHeader}>
                <div className={styles.selectedDateNumber}>
                  {new Date(selectedDate + 'T00:00:00').getDate()}
                </div>
                <div className={styles.selectedDateInfo}>
                  <h3>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</h3>
                  <p>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              <div className={styles.selectedDateTasksList}>
                <div className={styles.tasksListHeader}>
                  <h4>Tasks ({selectedDateTasks.length})</h4>
                  <button className={styles.addTaskBtn} onClick={() => openModal()}>
                    <FiPlus />
                  </button>
                </div>

                {selectedDateTasks.length > 0 ? (
                  selectedDateTasks.map(task => (
                    <div
                      key={task.id}
                      className={styles.taskListItem}
                      onClick={() => {
                        selectTask(task.id)
                        openModal()
                      }}
                    >
                      <div className={`${styles.taskPriorityBar} ${styles[task.priority]}`} />
                      <div className={styles.taskListItemContent}>
                        <h5>{task.title}</h5>
                        <span className={styles.taskListItemStatus}>{getColumnTitle(task.column_id)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noTasksMessage}>
                    <FiCalendar />
                    <p>No tasks scheduled</p>
                    <button className={styles.scheduleTaskBtn} onClick={() => openModal()}>
                      <FiPlus /> Schedule a task
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.noDateSelected}>
              <div className={styles.noDateIcon}>
                <FiCalendar />
              </div>
              <h3>Select a Date</h3>
              <p>Click on any date to view scheduled tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
