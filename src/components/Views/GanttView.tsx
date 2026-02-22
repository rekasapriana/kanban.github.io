import { useState, useMemo, useRef, useEffect } from 'react'
import { useBoard } from '../../context/BoardContext'
import { FiChevronLeft, FiChevronRight, FiZoomIn, FiZoomOut, FiLayers, FiCalendar, FiClock, FiAlertCircle } from 'react-icons/fi'
import styles from './Views.module.css'

type ZoomLevel = 'day' | 'week' | 'month'

interface TaskWithDates {
  id: string
  title: string
  startDate: Date
  endDate: Date
  priority: 'low' | 'medium' | 'high'
  column_id: string
  dependencies: string[]
  progress: number
}

export default function GanttView() {
  const { state, selectTask, openDetailPanel } = useBoard()
  const [zoom, setZoom] = useState<ZoomLevel>('week')
  const [scrollOffset, setScrollOffset] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate date range based on tasks
  const dateRange = useMemo(() => {
    const today = new Date()
    const tasksWithDates: TaskWithDates[] = []

    state.tasks.forEach(task => {
      if (task.due_date) {
        const endDate = new Date(task.due_date)
        // Estimate start date as 3 days before due date if not available
        const startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 3)

        const completedSubtasks = task.subtasks?.filter(s => s.is_completed).length || 0
        const totalSubtasks = task.subtasks?.length || 1
        const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

        tasksWithDates.push({
          id: task.id,
          title: task.title,
          startDate,
          endDate,
          priority: task.priority,
          column_id: task.column_id,
          dependencies: [],
          progress
        })
      }
    })

    // Sort by start date
    tasksWithDates.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

    // Calculate visible range
    const rangeStart = new Date(today)
    rangeStart.setDate(rangeStart.getDate() - 7) // Start from a week ago

    const rangeEnd = new Date(today)
    rangeEnd.setDate(rangeEnd.getDate() + (zoom === 'day' ? 14 : zoom === 'week' ? 28 : 60))

    return { tasksWithDates, rangeStart, rangeEnd }
  }, [state.tasks, zoom])

  // Generate timeline headers
  const timelineHeaders = useMemo(() => {
    const headers: { date: Date; label: string; isToday: boolean }[] = []
    const current = new Date(dateRange.rangeStart)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    while (current <= dateRange.rangeEnd) {
      const isToday = current.getTime() === today.getTime()
      headers.push({
        date: new Date(current),
        label: current.getDate().toString(),
        isToday
      })
      current.setDate(current.getDate() + 1)
    }

    return headers
  }, [dateRange])

  // Generate month/year headers
  const monthHeaders = useMemo(() => {
    const months: { label: string; width: number; startIndex: number }[] = []
    let currentMonth = -1
    let monthStart = 0
    let count = 0

    timelineHeaders.forEach((header, index) => {
      const month = header.date.getMonth()
      if (month !== currentMonth) {
        if (currentMonth !== -1) {
          months.push({
            label: new Date(timelineHeaders[monthStart].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            width: count,
            startIndex: monthStart
          })
        }
        currentMonth = month
        monthStart = index
        count = 1
      } else {
        count++
      }
    })

    // Push last month
    if (count > 0) {
      months.push({
        label: new Date(timelineHeaders[monthStart].date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        width: count,
        startIndex: monthStart
      })
    }

    return months
  }, [timelineHeaders])

  // Calculate position for a task
  const getTaskPosition = (task: TaskWithDates) => {
    const dayWidth = zoom === 'day' ? 60 : zoom === 'week' ? 40 : 20
    const startOffset = Math.floor((task.startDate.getTime() - dateRange.rangeStart.getTime()) / (1000 * 60 * 60 * 24))
    const duration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    return {
      left: Math.max(0, startOffset * dayWidth),
      width: Math.max(dayWidth, duration * dayWidth)
    }
  }

  // Calculate task stats
  const ganttStats = useMemo(() => {
    const total = dateRange.tasksWithDates.length
    const completed = dateRange.tasksWithDates.filter(t => t.progress === 100).length
    const inProgress = dateRange.tasksWithDates.filter(t => t.progress > 0 && t.progress < 100).length
    const overdue = dateRange.tasksWithDates.filter(t => {
      return t.endDate < new Date() && t.progress < 100
    }).length

    return { total, completed, inProgress, overdue }
  }, [dateRange.tasksWithDates])

  const dayWidth = zoom === 'day' ? 60 : zoom === 'week' ? 40 : 20

  const scrollLeft = () => {
    if (containerRef.current) {
      const scrollAmount = dayWidth * 7
      containerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (containerRef.current) {
      const scrollAmount = dayWidth * 7
      containerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const scrollToToday = () => {
    if (containerRef.current) {
      const todayOffset = 7 * dayWidth // Account for -7 days offset
      containerRef.current.scrollLeft = todayOffset - containerRef.current.clientWidth / 2
    }
  }

  const getColumnTitle = (columnId: string) => {
    return state.columns.find(c => c.id === columnId)?.title || 'Unknown'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  const handleTaskClick = (taskId: string) => {
    selectTask(taskId)
    openDetailPanel(taskId)
  }

  return (
    <div className={styles.ganttView}>
      {/* Header */}
      <div className={styles.ganttHeader}>
        <div className={styles.ganttTitle}>
          <div className={styles.ganttIcon}>
            <FiLayers />
          </div>
          <div>
            <h1>Gantt Chart</h1>
            <p>Visualize task timeline and dependencies</p>
          </div>
        </div>
        <div className={styles.ganttControls}>
          <div className={styles.zoomControls}>
            <button
              className={styles.zoomBtn}
              onClick={() => setZoom('day')}
              title="Day view"
              disabled={zoom === 'day'}
            >
              <FiZoomIn />
            </button>
            <button
              className={styles.zoomBtn}
              onClick={() => setZoom('week')}
              title="Week view"
              disabled={zoom === 'week'}
            >
              <FiCalendar />
            </button>
            <button
              className={styles.zoomBtn}
              onClick={() => setZoom('month')}
              title="Month view"
              disabled={zoom === 'month'}
            >
              <FiZoomOut />
            </button>
          </div>
          <div className={styles.scrollControls}>
            <button className={styles.navBtn} onClick={scrollLeft}>
              <FiChevronLeft />
            </button>
            <button className={styles.todayBtn} onClick={scrollToToday}>Today</button>
            <button className={styles.navBtn} onClick={scrollRight}>
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.ganttStats}>
        <div className={`${styles.statCard} ${styles.blue}`}>
          <div className={styles.statIcon}><FiClock /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{ganttStats.total}</span>
            <span className={styles.statLabel}>Total Tasks</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.green}`}>
          <div className={styles.statIcon}><FiLayers /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{ganttStats.completed}</span>
            <span className={styles.statLabel}>Completed</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.yellow}`}>
          <div className={styles.statIcon}><FiCalendar /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{ganttStats.inProgress}</span>
            <span className={styles.statLabel}>In Progress</span>
          </div>
        </div>
        {ganttStats.overdue > 0 && (
          <div className={`${styles.statCard} ${styles.red}`}>
            <div className={styles.statIcon}><FiAlertCircle /></div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{ganttStats.overdue}</span>
              <span className={styles.statLabel}>Overdue</span>
            </div>
          </div>
        )}
      </div>

      {/* Gantt Chart */}
      <div className={styles.ganttContainer}>
        {dateRange.tasksWithDates.length > 0 ? (
          <>
            {/* Task List */}
            <div className={styles.ganttTaskList}>
              <div className={styles.ganttTaskListHeader}>
                <span>Task</span>
              </div>
              {dateRange.tasksWithDates.map(task => (
                <div
                  key={task.id}
                  className={styles.ganttTaskItem}
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div
                    className={styles.ganttTaskPriority}
                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                  />
                  <div className={styles.ganttTaskInfo}>
                    <span className={styles.ganttTaskTitle}>{task.title}</span>
                    <span className={styles.ganttTaskStatus}>{getColumnTitle(task.column_id)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div className={styles.ganttTimeline} ref={containerRef}>
              {/* Month Headers */}
              <div className={styles.ganttMonthHeaders}>
                {monthHeaders.map((month, index) => (
                  <div
                    key={index}
                    className={styles.ganttMonthHeader}
                    style={{ width: month.width * dayWidth }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>

              {/* Day Headers */}
              <div className={styles.ganttDayHeaders}>
                {timelineHeaders.map((header, index) => (
                  <div
                    key={index}
                    className={`${styles.ganttDayHeader} ${header.isToday ? styles.today : ''}`}
                    style={{ width: dayWidth }}
                  >
                    {header.label}
                  </div>
                ))}
              </div>

              {/* Task Bars */}
              <div className={styles.ganttTaskBars}>
                {dateRange.tasksWithDates.map(task => {
                  const position = getTaskPosition(task)
                  return (
                    <div key={task.id} className={styles.ganttTaskRow}>
                      <div
                        className={styles.ganttTaskBar}
                        style={{
                          left: position.left,
                          width: position.width,
                          backgroundColor: getPriorityColor(task.priority)
                        }}
                        onClick={() => handleTaskClick(task.id)}
                      >
                        {task.progress > 0 && (
                          <div
                            className={styles.ganttTaskProgress}
                            style={{ width: `${task.progress}%` }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Today Line */}
                <div
                  className={styles.ganttTodayLine}
                  style={{ left: 7 * dayWidth }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><FiCalendar /></div>
            <h3>No tasks with due dates</h3>
            <p>Add due dates to your tasks to see them in the Gantt chart</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className={styles.ganttLegend}>
        <div className={styles.ganttLegendItem}>
          <div className={styles.ganttLegendColor} style={{ backgroundColor: '#ef4444' }} />
          <span>High Priority</span>
        </div>
        <div className={styles.ganttLegendItem}>
          <div className={styles.ganttLegendColor} style={{ backgroundColor: '#f59e0b' }} />
          <span>Medium Priority</span>
        </div>
        <div className={styles.ganttLegendItem}>
          <div className={styles.ganttLegendColor} style={{ backgroundColor: '#10b981' }} />
          <span>Low Priority</span>
        </div>
        <div className={styles.ganttLegendItem}>
          <div className={styles.ganttTodayIndicator} />
          <span>Today</span>
        </div>
      </div>
    </div>
  )
}
