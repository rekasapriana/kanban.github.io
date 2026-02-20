import { useMemo } from 'react'
import { useBoard } from '../../context/BoardContext'
import { useAuth } from '../../context/AuthContext'
import { useView } from '../../context/ViewContext'
import {
  FiCheckCircle, FiClock, FiAlertCircle, FiTrendingUp, FiCalendar,
  FiTarget, FiZap, FiActivity, FiArrowRight, FiPlus,
  FiLayers, FiBriefcase
} from 'react-icons/fi'
import styles from './Views.module.css'

export default function DashboardView() {
  const { state, openModal } = useBoard()
  const { user } = useAuth()
  const { setView } = useView()

  const tasks = state.tasks
  const columns = state.columns

  // Calculate statistics
  const stats = useMemo(() => {
    const total = tasks.length
    const todoColumn = columns.find(c => c.title.toLowerCase() === 'to do')
    const inProgressColumn = columns.find(c => c.title.toLowerCase() === 'in progress')
    const reviewColumn = columns.find(c => c.title.toLowerCase() === 'review')
    const doneColumn = columns.find(c => c.title.toLowerCase() === 'done')
    const archiveColumn = columns.find(c => c.title.toLowerCase() === 'archive')

    const todo = tasks.filter(t => t.column_id === todoColumn?.id).length
    const inProgress = tasks.filter(t => t.column_id === inProgressColumn?.id).length
    const review = tasks.filter(t => t.column_id === reviewColumn?.id).length
    const done = tasks.filter(t => t.column_id === doneColumn?.id).length
    const archived = tasks.filter(t => t.column_id === archiveColumn?.id).length

    const highPriority = tasks.filter(t => t.priority === 'high').length
    const mediumPriority = tasks.filter(t => t.priority === 'medium').length
    const lowPriority = tasks.filter(t => t.priority === 'low').length

    const today = new Date().toISOString().split('T')[0]
    const dueToday = tasks.filter(t => t.due_date === today)
    const overdue = tasks.filter(t => {
      if (!t.due_date) return false
      const taskColumn = columns.find(c => c.id === t.column_id)
      return t.due_date < today &&
        taskColumn?.title.toLowerCase() !== 'done' &&
        taskColumn?.title.toLowerCase() !== 'archive'
    })

    const completionRate = total > 0 ? Math.round(((done + archived) / total) * 100) : 0
    const productivity = total > 0 ? Math.round((done / total) * 100) : 0

    return {
      total, todo, inProgress, review, done, archived,
      highPriority, mediumPriority, lowPriority,
      dueToday, overdue,
      completionRate, productivity
    }
  }, [tasks, columns])

  // Recent tasks (last 5)
  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [tasks])

  // Upcoming deadlines
  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter(t => {
        if (!t.due_date) return false
        const taskColumn = columns.find(c => c.id === t.column_id)
        return taskColumn?.title.toLowerCase() !== 'done' &&
          taskColumn?.title.toLowerCase() !== 'archive'
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 4)
  }, [tasks, columns])

  // Weekly activity (mock data based on tasks)
  const weeklyActivity = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const currentDay = new Date().getDay()
    const adjustedToday = currentDay === 0 ? 6 : currentDay - 1

    return days.map((day, index) => {
      const isToday = index === adjustedToday
      const isPast = index < adjustedToday
      return {
        day,
        value: isPast ? Math.floor(Math.random() * 10) + 1 : (isToday ? stats.inProgress + stats.done : 0),
        isToday
      }
    })
  }, [stats])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  const getTimeOfDay = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (dateStr === today.toISOString().split('T')[0]) return 'Today'
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getColumnTitle = (columnId: string) => {
    return columns.find(c => c.id === columnId)?.title || 'Unknown'
  }

  return (
    <div className={styles.dashboard}>
      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.greeting}>
            <span className={styles.greetingIcon}>
              {getTimeOfDay() === 'morning' ? '🌅' : getTimeOfDay() === 'afternoon' ? '☀️' : '🌙'}
            </span>
            <div>
              <h1>{greeting()}, {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}!</h1>
              <p>Here's what's happening with your projects today.</p>
            </div>
          </div>
          <button className={styles.heroBtn} onClick={() => openModal()}>
            <FiPlus /> New Task
          </button>
        </div>

        {/* Quick Stats */}
        <div className={styles.quickStats}>
          <div className={styles.quickStatItem}>
            <div className={styles.quickStatValue}>{stats.total}</div>
            <div className={styles.quickStatLabel}>Total Tasks</div>
          </div>
          <div className={styles.quickStatDivider} />
          <div className={styles.quickStatItem}>
            <div className={styles.quickStatValue}>{stats.inProgress}</div>
            <div className={styles.quickStatLabel}>In Progress</div>
          </div>
          <div className={styles.quickStatDivider} />
          <div className={styles.quickStatItem}>
            <div className={styles.quickStatValue}>{stats.done}</div>
            <div className={styles.quickStatLabel}>Completed</div>
          </div>
          <div className={styles.quickStatDivider} />
          <div className={styles.quickStatItem}>
            <div className={styles.quickStatValue}>{stats.completionRate}%</div>
            <div className={styles.quickStatLabel}>Progress</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.dashboardGrid}>
        {/* Left Column */}
        <div className={styles.dashboardLeft}>
          {/* Productivity Score */}
          <div className={styles.productivityCard}>
            <div className={styles.productivityHeader}>
              <h2><FiZap /> Productivity Score</h2>
              <span className={styles.productivityBadge}>
                {stats.productivity >= 70 ? 'Excellent' : stats.productivity >= 40 ? 'Good' : 'Keep Going'}
              </span>
            </div>
            <div className={styles.productivityContent}>
              <div className={styles.scoreRing}>
                <svg viewBox="0 0 100 100">
                  <circle className={styles.scoreBg} cx="50" cy="50" r="45" />
                  <circle
                    className={styles.scoreFill}
                    cx="50" cy="50" r="45"
                    strokeDasharray={`${stats.productivity * 2.83} 283`}
                  />
                </svg>
                <div className={styles.scoreValue}>
                  <span className={styles.scoreNumber}>{stats.productivity}</span>
                  <span className={styles.scoreLabel}>Score</span>
                </div>
              </div>
              <div className={styles.productivityStats}>
                <div className={styles.productivityStat}>
                  <FiCheckCircle />
                  <span>{stats.done} completed this week</span>
                </div>
                <div className={styles.productivityStat}>
                  <FiClock />
                  <span>{stats.inProgress} in progress</span>
                </div>
                <div className={styles.productivityStat}>
                  <FiTarget />
                  <span>{stats.total - stats.done - stats.archived} remaining</span>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Activity */}
          <div className={styles.activityCard}>
            <h2><FiActivity /> Weekly Activity</h2>
            <div className={styles.activityChart}>
              {weeklyActivity.map((item, index) => (
                <div key={index} className={styles.activityBar}>
                  <div
                    className={`${styles.barFill} ${item.isToday ? styles.today : ''}`}
                    style={{ height: `${Math.max(item.value * 10, 5)}%` }}
                  />
                  <span className={styles.activityDay}>{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Distribution */}
          <div className={styles.priorityCard}>
            <h2><FiLayers /> Priority Distribution</h2>
            <div className={styles.priorityChart}>
              <div className={styles.priorityRow}>
                <div className={styles.priorityLabel}>
                  <span className={`${styles.priorityDot} ${styles.high}`} />
                  High Priority
                </div>
                <div className={styles.priorityBar}>
                  <div
                    className={styles.priorityFill}
                    style={{
                      width: `${stats.total > 0 ? (stats.highPriority / stats.total) * 100 : 0}%`,
                      background: '#ef4444'
                    }}
                  />
                </div>
                <span className={styles.priorityValue}>{stats.highPriority}</span>
              </div>
              <div className={styles.priorityRow}>
                <div className={styles.priorityLabel}>
                  <span className={`${styles.priorityDot} ${styles.medium}`} />
                  Medium Priority
                </div>
                <div className={styles.priorityBar}>
                  <div
                    className={styles.priorityFill}
                    style={{
                      width: `${stats.total > 0 ? (stats.mediumPriority / stats.total) * 100 : 0}%`,
                      background: '#f59e0b'
                    }}
                  />
                </div>
                <span className={styles.priorityValue}>{stats.mediumPriority}</span>
              </div>
              <div className={styles.priorityRow}>
                <div className={styles.priorityLabel}>
                  <span className={`${styles.priorityDot} ${styles.low}`} />
                  Low Priority
                </div>
                <div className={styles.priorityBar}>
                  <div
                    className={styles.priorityFill}
                    style={{
                      width: `${stats.total > 0 ? (stats.lowPriority / stats.total) * 100 : 0}%`,
                      background: '#10b981'
                    }}
                  />
                </div>
                <span className={styles.priorityValue}>{stats.lowPriority}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className={styles.dashboardRight}>
          {/* Upcoming Deadlines */}
          <div className={styles.deadlinesCard}>
            <div className={styles.cardHeader}>
              <h2><FiCalendar /> Upcoming Deadlines</h2>
              <button className={styles.viewAllBtn} onClick={() => setView('calendar')}>
                View All <FiArrowRight />
              </button>
            </div>
            {upcomingDeadlines.length > 0 ? (
              <div className={styles.deadlinesList}>
                {upcomingDeadlines.map(task => (
                  <div key={task.id} className={styles.deadlineItem}>
                    <div className={styles.deadlineDate}>
                      <span className={styles.deadlineDay}>
                        {task.due_date ? new Date(task.due_date).getDate() : '-'}
                      </span>
                      <span className={styles.deadlineMonth}>
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short' }) : ''}
                      </span>
                    </div>
                    <div className={styles.deadlineContent}>
                      <h4>{task.title}</h4>
                      <span className={styles.deadlineStatus}>{getColumnTitle(task.column_id)}</span>
                    </div>
                    <span className={`${styles.deadlineBadge} ${formatDate(task.due_date || '') === 'Today' ? styles.today : ''}`}>
                      {formatDate(task.due_date || '')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyDeadlines}>
                <FiCalendar />
                <p>No upcoming deadlines</p>
              </div>
            )}
          </div>

          {/* Alerts */}
          {(stats.dueToday.length > 0 || stats.overdue.length > 0) && (
            <div className={styles.alertsCard}>
              <h2><FiAlertCircle /> Alerts</h2>
              <div className={styles.alertsList}>
                {stats.overdue.length > 0 && (
                  <div className={`${styles.alertItem} ${styles.danger}`}>
                    <FiAlertCircle />
                    <span><strong>{stats.overdue.length}</strong> overdue tasks need attention</span>
                  </div>
                )}
                {stats.dueToday.length > 0 && (
                  <div className={`${styles.alertItem} ${styles.warning}`}>
                    <FiClock />
                    <span><strong>{stats.dueToday.length}</strong> tasks due today</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className={styles.recentCard}>
            <div className={styles.cardHeader}>
              <h2><FiActivity /> Recent Tasks</h2>
              <button className={styles.viewAllBtn} onClick={() => setView('board')}>
                View Board <FiArrowRight />
              </button>
            </div>
            {recentTasks.length > 0 ? (
              <div className={styles.recentList}>
                {recentTasks.map(task => (
                  <div key={task.id} className={styles.recentItem}>
                    <div className={`${styles.recentPriority} ${styles[task.priority]}`} />
                    <div className={styles.recentContent}>
                      <h4>{task.title}</h4>
                      <div className={styles.recentMeta}>
                        <span className={styles.recentStatus}>{getColumnTitle(task.column_id)}</span>
                        {task.due_date && (
                          <span className={styles.recentDue}>
                            <FiCalendar /> {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyRecent}>
                <FiBriefcase />
                <p>No tasks yet. Create your first task!</p>
                <button className={styles.createTaskBtn} onClick={() => openModal()}>
                  <FiPlus /> Create Task
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className={styles.quickActionsCard}>
            <h2><FiZap /> Quick Actions</h2>
            <div className={styles.quickActionsGrid}>
              <button className={styles.quickActionBtn} onClick={() => openModal()}>
                <FiPlus />
                <span>New Task</span>
              </button>
              <button className={styles.quickActionBtn} onClick={() => setView('board')}>
                <FiLayers />
                <span>Board</span>
              </button>
              <button className={styles.quickActionBtn} onClick={() => setView('calendar')}>
                <FiCalendar />
                <span>Calendar</span>
              </button>
              <button className={styles.quickActionBtn} onClick={() => setView('reports')}>
                <FiTrendingUp />
                <span>Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
