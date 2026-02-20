import { useState, useMemo } from 'react'
import { useBoard } from '../../context/BoardContext'
import { FiBarChart2, FiTrendingUp, FiCheckCircle, FiClock, FiTarget, FiAward, FiZap } from 'react-icons/fi'
import styles from './Views.module.css'

export default function ReportsView() {
  const { state } = useBoard()
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')

  const tasks = state.tasks
  const columns = state.columns

  // Calculate all statistics
  const stats = useMemo(() => {
    const total = tasks.length
    const todoColumn = columns.find(c => c.title.toLowerCase() === 'to do')
    const inProgressColumn = columns.find(c => c.title.toLowerCase() === 'in progress')
    const reviewColumn = columns.find(c => c.title.toLowerCase() === 'review')
    const doneColumn = columns.find(c => c.title.toLowerCase() === 'done')

    const todo = tasks.filter(t => t.column_id === todoColumn?.id).length
    const inProgress = tasks.filter(t => t.column_id === inProgressColumn?.id).length
    const review = tasks.filter(t => t.column_id === reviewColumn?.id).length
    const done = tasks.filter(t => t.column_id === doneColumn?.id).length

    const high = tasks.filter(t => t.priority === 'high').length
    const medium = tasks.filter(t => t.priority === 'medium').length
    const low = tasks.filter(t => t.priority === 'low').length

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0

    return { total, todo, inProgress, review, done, high, medium, low, completionRate }
  }, [tasks, columns])

  // Weekly data
  const weeklyData = [
    { day: 'Mon', completed: 5, created: 3 },
    { day: 'Tue', completed: 8, created: 6 },
    { day: 'Wed', completed: 4, created: 7 },
    { day: 'Thu', completed: 12, created: 4 },
    { day: 'Fri', completed: 6, created: 8 },
    { day: 'Sat', completed: 3, created: 2 },
    { day: 'Sun', completed: 2, created: 1 },
  ]

  const maxCompleted = Math.max(...weeklyData.map(d => d.completed))

  // Performance score
  const performanceScore = useMemo(() => {
    if (stats.total === 0) return 0
    const completionWeight = stats.completionRate * 0.4
    const progressWeight = ((stats.inProgress + stats.review) / stats.total) * 100 * 0.3
    const doneWeight = (stats.done / stats.total) * 100 * 0.3
    return Math.round(completionWeight + progressWeight + doneWeight)
  }, [stats])

  return (
    <div className={styles.reportsView}>
      {/* Header */}
      <div className={styles.reportsHeader}>
        <div className={styles.reportsTitle}>
          <div className={styles.reportsIcon}>
            <FiBarChart2 />
          </div>
          <div>
            <h1>Reports & Analytics</h1>
            <p>Track your productivity and performance</p>
          </div>
        </div>
        <div className={styles.timeRangeSelector}>
          <button
            className={`${styles.rangeBtn} ${timeRange === 'week' ? styles.active : ''}`}
            onClick={() => setTimeRange('week')}
          >
            Week
          </button>
          <button
            className={`${styles.rangeBtn} ${timeRange === 'month' ? styles.active : ''}`}
            onClick={() => setTimeRange('month')}
          >
            Month
          </button>
          <button
            className={`${styles.rangeBtn} ${timeRange === 'year' ? styles.active : ''}`}
            onClick={() => setTimeRange('year')}
          >
            Year
          </button>
        </div>
      </div>

      {/* Performance Score Card */}
      <div className={styles.performanceCard}>
        <div className={styles.performanceContent}>
          <div className={styles.performanceInfo}>
            <h2>Performance Score</h2>
            <div className={styles.performanceBadge}>
              <FiAward />
              {performanceScore >= 70 ? 'Excellent' : performanceScore >= 40 ? 'Good' : 'Keep Going'}
            </div>
            <p>Based on task completion and productivity metrics</p>
          </div>
          <div className={styles.performanceRing}>
            <svg viewBox="0 0 100 100">
              <circle className={styles.ringBg} cx="50" cy="50" r="40" />
              <circle
                className={styles.ringFill}
                cx="50" cy="50" r="40"
                strokeDasharray={`${performanceScore * 2.51} 251`}
              />
            </svg>
            <div className={styles.performanceValue}>
              <span className={styles.performanceNumber}>{performanceScore}</span>
              <span className={styles.performanceLabel}>Score</span>
            </div>
          </div>
        </div>
        <div className={styles.performanceMetrics}>
          <div className={styles.metricItem}>
            <FiTarget />
            <div>
              <span className={styles.metricValue}>{stats.total}</span>
              <span className={styles.metricLabel}>Total Tasks</span>
            </div>
          </div>
          <div className={styles.metricItem}>
            <FiCheckCircle />
            <div>
              <span className={styles.metricValue}>{stats.done}</span>
              <span className={styles.metricLabel}>Completed</span>
            </div>
          </div>
          <div className={styles.metricItem}>
            <FiClock />
            <div>
              <span className={styles.metricValue}>{stats.inProgress}</span>
              <span className={styles.metricLabel}>In Progress</span>
            </div>
          </div>
          <div className={styles.metricItem}>
            <FiZap />
            <div>
              <span className={styles.metricValue}>{stats.completionRate}%</span>
              <span className={styles.metricLabel}>Rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className={styles.reportsGrid}>
        {/* Weekly Activity Chart */}
        <div className={styles.reportCard}>
          <div className={styles.reportCardHeader}>
            <h3><FiTrendingUp /> Weekly Activity</h3>
            <span className={styles.reportBadge}>Tasks Completed</span>
          </div>
          <div className={styles.barChart}>
            {weeklyData.map((data, index) => (
              <div key={index} className={styles.barChartItem}>
                <div className={styles.barChartBar}>
                  <div
                    className={styles.barChartFill}
                    style={{ height: `${(data.completed / maxCompleted) * 100}%` }}
                  />
                </div>
                <span className={styles.barChartLabel}>{data.day}</span>
                <span className={styles.barChartValue}>{data.completed}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Distribution */}
        <div className={styles.reportCard}>
          <div className={styles.reportCardHeader}>
            <h3><FiBarChart2 /> Task Distribution</h3>
            <span className={styles.reportBadge}>By Status</span>
          </div>
          <div className={styles.distributionChart}>
            {columns.filter(c => c.title.toLowerCase() !== 'archive').map(column => {
              const count = tasks.filter(t => t.column_id === column.id).length
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
              return (
                <div key={column.id} className={styles.distributionItem}>
                  <div className={styles.distributionInfo}>
                    <span className={styles.distributionLabel}>{column.title}</span>
                    <span className={styles.distributionCount}>{count}</span>
                  </div>
                  <div className={styles.distributionBar}>
                    <div
                      className={styles.distributionFill}
                      style={{
                        width: `${percentage}%`,
                        background: column.color
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className={styles.reportCard}>
          <div className={styles.reportCardHeader}>
            <h3><FiTarget /> Priority Breakdown</h3>
            <span className={styles.reportBadge}>By Priority</span>
          </div>
          <div className={styles.priorityChart}>
            <div className={styles.priorityVisual}>
              <svg viewBox="0 0 100 100" className={styles.priorityPie}>
                {/* High */}
                <circle
                  cx="50" cy="50" r="25"
                  fill="transparent"
                  stroke="#ef4444"
                  strokeWidth="50"
                  strokeDasharray={`${(stats.high / stats.total) * 157} 157`}
                  transform="rotate(-90 50 50)"
                />
                {/* Medium */}
                <circle
                  cx="50" cy="50" r="25"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="50"
                  strokeDasharray={`${(stats.medium / stats.total) * 157} 157`}
                  strokeDashoffset={`${-(stats.high / stats.total) * 157}`}
                  transform="rotate(-90 50 50)"
                />
                {/* Low */}
                <circle
                  cx="50" cy="50" r="25"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="50"
                  strokeDasharray={`${(stats.low / stats.total) * 157} 157`}
                  strokeDashoffset={`${-((stats.high + stats.medium) / stats.total) * 157}`}
                  transform="rotate(-90 50 50)"
                />
              </svg>
            </div>
            <div className={styles.priorityLegend}>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.high}`} />
                <span className={styles.legendLabel}>High Priority</span>
                <span className={styles.legendValue}>{stats.high}</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.medium}`} />
                <span className={styles.legendLabel}>Medium Priority</span>
                <span className={styles.legendValue}>{stats.medium}</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.low}`} />
                <span className={styles.legendLabel}>Low Priority</span>
                <span className={styles.legendValue}>{stats.low}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Progress */}
        <div className={styles.reportCard}>
          <div className={styles.reportCardHeader}>
            <h3><FiCheckCircle /> Completion Rate</h3>
            <span className={styles.reportBadge}>Overall</span>
          </div>
          <div className={styles.completionChart}>
            <div className={styles.completionCircle}>
              <svg viewBox="0 0 100 100">
                <circle className={styles.completionBg} cx="50" cy="50" r="40" />
                <circle
                  className={styles.completionFill}
                  cx="50" cy="50" r="40"
                  strokeDasharray={`${stats.completionRate * 2.51} 251`}
                />
              </svg>
              <div className={styles.completionValue}>
                <span className={styles.completionNumber}>{stats.completionRate}%</span>
                <span className={styles.completionLabel}>Complete</span>
              </div>
            </div>
            <div className={styles.completionStats}>
              <div className={styles.completionStat}>
                <span className={styles.completionStatValue}>{stats.done}</span>
                <span className={styles.completionStatLabel}>Done</span>
              </div>
              <div className={styles.completionStat}>
                <span className={styles.completionStatValue}>{stats.total - stats.done}</span>
                <span className={styles.completionStatLabel}>Remaining</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
