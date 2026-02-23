import { useState, useMemo } from 'react'
import {
  FiTrendingUp,
  FiClock,
  FiZap,
  FiCheckCircle,
  FiArrowRight,
  FiCalendar,
  FiBarChart2,
  FiActivity
} from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import styles from './Board.module.css'

type TimeRange = '7d' | '14d' | '30d'

export default function KanbanMetricsView() {
  const { state } = useBoard()
  const [timeRange, setTimeRange] = useState<TimeRange>('14d')

  // Calculate date range
  const getDateRange = (range: TimeRange) => {
    const end = new Date()
    const start = new Date()
    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30
    start.setDate(start.getDate() - days)
    return { start, end }
  }

  // Get done column
  const doneColumn = state.columns.find(c => c.title.toLowerCase() === 'done')

  // Calculate metrics
  const metrics = useMemo(() => {
    const { start, end } = getDateRange(timeRange)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    // Get completed tasks in time range
    const completedTasks = state.tasks.filter(task => {
      if (!doneColumn || task.column_id !== doneColumn.id) return false
      const updatedAt = new Date(task.updated_at)
      return updatedAt >= start && updatedAt <= end
    })

    // Throughput: tasks completed per day
    const throughput = completedTasks.length / daysDiff

    // Calculate lead time (time from creation to done)
    const leadTimes = completedTasks.map(task => {
      const created = new Date(task.created_at)
      const completed = new Date(task.updated_at)
      return Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    }).filter(t => t >= 0)

    const avgLeadTime = leadTimes.length > 0
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      : 0

    // WIP (Work in Progress)
    const wipColumn = state.columns.find(c =>
      c.title.toLowerCase() === 'in progress' || c.title.toLowerCase() === 'doing'
    )
    const wipCount = wipColumn
      ? state.tasks.filter(t => t.column_id === wipColumn.id && !t.is_archived).length
      : 0

    // Tasks by priority
    const tasksByPriority = {
      high: state.tasks.filter(t => t.priority === 'high' && !t.is_archived).length,
      medium: state.tasks.filter(t => t.priority === 'medium' && !t.is_archived).length,
      low: state.tasks.filter(t => t.priority === 'low' && !t.is_archived).length
    }

    // Tasks by column
    const tasksByColumn = state.columns.map(col => ({
      name: col.title,
      count: state.tasks.filter(t => t.column_id === col.id && !t.is_archived).length,
      color: getColumnColor(col.title)
    }))

    // Completion rate (last period vs previous period)
    const prevStart = new Date(start)
    prevStart.setDate(prevStart.getDate() - daysDiff)
    const prevCompleted = state.tasks.filter(task => {
      if (!doneColumn || task.column_id !== doneColumn.id) return false
      const updatedAt = new Date(task.updated_at)
      return updatedAt >= prevStart && updatedAt < start
    }).length

    const completionRateChange = prevCompleted > 0
      ? ((completedTasks.length - prevCompleted) / prevCompleted) * 100
      : 0

    // Bottleneck (column with most tasks)
    const bottleneck = tasksByColumn.reduce((max, col) =>
      col.count > max.count ? col : max
    , { name: '', count: 0, color: '' })

    // Average age of tasks in progress
    const inProgressTasks = state.tasks.filter(t =>
      !t.is_archived &&
      doneColumn && t.column_id !== doneColumn.id
    )
    const avgTaskAge = inProgressTasks.length > 0
      ? inProgressTasks.reduce((sum, t) => {
          const created = new Date(t.created_at)
          const now = new Date()
          return sum + Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        }, 0) / inProgressTasks.length
      : 0

    // Daily completion data for chart
    const dailyData: { date: string; count: number }[] = []
    for (let i = daysDiff - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const count = state.tasks.filter(task => {
        if (!doneColumn || task.column_id !== doneColumn.id) return false
        const updated = new Date(task.updated_at)
        updated.setHours(0, 0, 0, 0)
        return updated.getTime() === date.getTime()
      }).length

      dailyData.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        count
      })
    }

    return {
      completedCount: completedTasks.length,
      throughput,
      avgLeadTime,
      wipCount,
      tasksByPriority,
      tasksByColumn,
      completionRateChange,
      bottleneck,
      avgTaskAge,
      dailyData,
      totalTasks: state.tasks.filter(t => !t.is_archived).length
    }
  }, [state.tasks, state.columns, timeRange, doneColumn])

  // Helper function
  function getColumnColor(title: string): string {
    const t = title.toLowerCase()
    if (t === 'to do') return '#4f46e5'
    if (t === 'in progress' || t === 'doing') return '#f59e0b'
    if (t === 'review') return '#06b6d4'
    if (t === 'done') return '#22c55e'
    return '#64748b'
  }

  // Get max count for chart scaling
  const maxDailyCount = Math.max(...metrics.dailyData.map(d => d.count), 1)

  return (
    <div className={styles.metricsView}>
      <div className={styles.metricsHeader}>
        <h2><FiBarChart2 /> Kanban Metrics</h2>
        <div className={styles.timeRangeSelector}>
          {(['7d', '14d', '30d'] as TimeRange[]).map(range => (
            <button
              key={range}
              className={`${styles.rangeBtn} ${timeRange === range ? styles.active : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <FiCheckCircle />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Completed</span>
            <span className={styles.metricValue}>{metrics.completedCount}</span>
            <span className={styles.metricChange + (metrics.completionRateChange >= 0 ? ' positive' : ' negative')}>
              {metrics.completionRateChange >= 0 ? '↑' : '↓'} {Math.abs(metrics.completionRateChange).toFixed(0)}% vs prev
            </span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
            <FiZap />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Throughput</span>
            <span className={styles.metricValue}>{metrics.throughput.toFixed(1)}</span>
            <span className={styles.metricSub}>tasks/day</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <FiClock />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Avg Lead Time</span>
            <span className={styles.metricValue}>{metrics.avgLeadTime.toFixed(1)}</span>
            <span className={styles.metricSub}>days</span>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
            <FiActivity />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>Work in Progress</span>
            <span className={styles.metricValue}>{metrics.wipCount}</span>
            <span className={styles.metricSub}>tasks</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        {/* Daily Completion Chart */}
        <div className={styles.chartCard}>
          <h3><FiTrendingUp /> Daily Completions</h3>
          <div className={styles.barChart}>
            {metrics.dailyData.map((day, i) => (
              <div key={i} className={styles.barColumn}>
                <div
                  className={styles.bar}
                  style={{
                    height: `${(day.count / maxDailyCount) * 100}%`,
                    background: day.count > 0 ? '#22c55e' : 'var(--bg-tertiary)'
                  }}
                >
                  {day.count > 0 && <span className={styles.barValue}>{day.count}</span>}
                </div>
                <span className={styles.barLabel}>{day.date.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks by Column */}
        <div className={styles.chartCard}>
          <h3><FiArrowRight /> Tasks by Column</h3>
          <div className={styles.columnStats}>
            {metrics.tasksByColumn.map((col, i) => (
              <div key={i} className={styles.columnStat}>
                <div className={styles.columnStatHeader}>
                  <span className={styles.columnDot} style={{ backgroundColor: col.color }} />
                  <span className={styles.columnName}>{col.name}</span>
                  <span className={styles.columnCount}>{col.count}</span>
                </div>
                <div className={styles.columnBar}>
                  <div
                    className={styles.columnBarFill}
                    style={{
                      width: `${metrics.totalTasks > 0 ? (col.count / metrics.totalTasks) * 100 : 0}%`,
                      backgroundColor: col.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights Row */}
      <div className={styles.insightsRow}>
        {/* Priority Distribution */}
        <div className={styles.insightCard}>
          <h3><FiZap /> Priority Distribution</h3>
          <div className={styles.priorityStats}>
            <div className={styles.priorityStat}>
              <span className={styles.priorityLabel}>High</span>
              <div className={styles.priorityBar}>
                <div
                  className={styles.priorityBarFill}
                  style={{
                    width: `${metrics.totalTasks > 0 ? (metrics.tasksByPriority.high / metrics.totalTasks) * 100 : 0}%`,
                    backgroundColor: '#ef4444'
                  }}
                />
              </div>
              <span className={styles.priorityCount}>{metrics.tasksByPriority.high}</span>
            </div>
            <div className={styles.priorityStat}>
              <span className={styles.priorityLabel}>Medium</span>
              <div className={styles.priorityBar}>
                <div
                  className={styles.priorityBarFill}
                  style={{
                    width: `${metrics.totalTasks > 0 ? (metrics.tasksByPriority.medium / metrics.totalTasks) * 100 : 0}%`,
                    backgroundColor: '#f59e0b'
                  }}
                />
              </div>
              <span className={styles.priorityCount}>{metrics.tasksByPriority.medium}</span>
            </div>
            <div className={styles.priorityStat}>
              <span className={styles.priorityLabel}>Low</span>
              <div className={styles.priorityBar}>
                <div
                  className={styles.priorityBarFill}
                  style={{
                    width: `${metrics.totalTasks > 0 ? (metrics.tasksByPriority.low / metrics.totalTasks) * 100 : 0}%`,
                    backgroundColor: '#22c55e'
                  }}
                />
              </div>
              <span className={styles.priorityCount}>{metrics.tasksByPriority.low}</span>
            </div>
          </div>
        </div>

        {/* Health Indicators */}
        <div className={styles.insightCard}>
          <h3><FiActivity /> Health Indicators</h3>
          <div className={styles.healthIndicators}>
            <div className={styles.healthItem}>
              <span className={styles.healthLabel}>Bottleneck</span>
              <span className={styles.healthValue}>
                {metrics.bottleneck.name || 'None'} ({metrics.bottleneck.count} tasks)
              </span>
            </div>
            <div className={styles.healthItem}>
              <span className={styles.healthLabel}>Avg Task Age</span>
              <span className={styles.healthValue}>
                {metrics.avgTaskAge.toFixed(1)} days
              </span>
            </div>
            <div className={styles.healthItem}>
              <span className={styles.healthLabel}>Flow Efficiency</span>
              <span className={styles.healthValue}>
                {metrics.avgLeadTime > 0
                  ? `${Math.max(0, 100 - (metrics.avgTaskAge / metrics.avgLeadTime) * 50).toFixed(0)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className={styles.healthItem}>
              <span className={styles.healthLabel}>Predicted Delivery</span>
              <span className={styles.healthValue}>
                {metrics.throughput > 0 && metrics.wipCount > 0
                  ? `${(metrics.wipCount / metrics.throughput).toFixed(1)} days`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
