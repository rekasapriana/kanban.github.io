import { useState, useMemo } from 'react'
import { useBoard } from '../../context/BoardContext'
import {
  FiBarChart2, FiTrendingUp, FiCheckCircle, FiClock, FiTarget, FiAward,
  FiZap, FiUsers, FiCalendar, FiFlag, FiFolder, FiActivity
} from 'react-icons/fi'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts'
import styles from './Views.module.css'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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

    // Calculate overdue tasks
    const now = new Date()
    const overdue = tasks.filter(t => {
      if (!t.due_date) return false
      return new Date(t.due_date) < now && t.column_id !== doneColumn?.id
    }).length

    // Tasks with due dates
    const withDueDate = tasks.filter(t => t.due_date).length

    // Tasks by project
    const projectCounts: Record<string, number> = {}
    tasks.forEach(t => {
      if (t.project_id) {
        projectCounts[t.project_id] = (projectCounts[t.project_id] || 0) + 1
      }
    })

    return {
      total, todo, inProgress, review, done, high, medium, low,
      completionRate, overdue, withDueDate, projectCounts
    }
  }, [tasks, columns])

  // Real weekly data based on task creation dates
  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    const data = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dayName = days[date.getDay()]

      const dayStart = new Date(date.setHours(0, 0, 0, 0))
      const dayEnd = new Date(date.setHours(23, 59, 59, 999))

      const created = tasks.filter(t => {
        const createdDate = new Date(t.created_at)
        return createdDate >= dayStart && createdDate <= dayEnd
      }).length

      const completed = tasks.filter(t => {
        const doneColumn = columns.find(c => c.title.toLowerCase() === 'done')
        if (t.column_id !== doneColumn?.id) return false
        const updatedDate = new Date(t.updated_at)
        return updatedDate >= dayStart && updatedDate <= dayEnd
      }).length

      data.push({ day: dayName, created, completed })
    }

    return data
  }, [tasks, columns])

  // Status distribution data for pie chart
  const statusDistribution = useMemo(() => {
    return columns
      .filter(c => c.title.toLowerCase() !== 'archive')
      .map((column, index) => ({
        name: column.title,
        value: tasks.filter(t => t.column_id === column.id).length,
        color: column.color || COLORS[index % COLORS.length]
      }))
      .filter(d => d.value > 0)
  }, [columns, tasks])

  // Priority distribution data
  const priorityData = [
    { name: 'High', value: stats.high, color: '#ef4444' },
    { name: 'Medium', value: stats.medium, color: '#f59e0b' },
    { name: 'Low', value: stats.low, color: '#22c55e' }
  ].filter(d => d.value > 0)

  // Monthly trend data (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const today = new Date()
    const data = []

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthName = months[date.getMonth()]

      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)

      const created = tasks.filter(t => {
        const createdDate = new Date(t.created_at)
        return createdDate >= monthStart && createdDate <= monthEnd
      }).length

      const completed = tasks.filter(t => {
        const doneColumn = columns.find(c => c.title.toLowerCase() === 'done')
        if (t.column_id !== doneColumn?.id) return false
        const updatedDate = new Date(t.updated_at)
        return updatedDate >= monthStart && updatedDate <= monthEnd
      }).length

      data.push({ month: monthName, created, completed })
    }

    return data
  }, [tasks, columns])

  // Performance score
  const performanceScore = useMemo(() => {
    if (stats.total === 0) return 0
    const completionWeight = stats.completionRate * 0.4
    const progressWeight = ((stats.inProgress + stats.review) / stats.total) * 100 * 0.3
    const doneWeight = (stats.done / stats.total) * 100 * 0.3
    return Math.round(completionWeight + progressWeight + doneWeight)
  }, [stats])

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.chartTooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className={styles.tooltipValue} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

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

      {/* Quick Stats Row */}
      <div className={styles.quickStatsRow}>
        <div className={styles.quickStatCard}>
          <div className={styles.quickStatIcon} style={{ background: '#fef2f2', color: '#ef4444' }}>
            <FiCalendar />
          </div>
          <div className={styles.quickStatInfo}>
            <span className={styles.quickStatValue}>{stats.overdue}</span>
            <span className={styles.quickStatLabel}>Overdue Tasks</span>
          </div>
        </div>
        <div className={styles.quickStatCard}>
          <div className={styles.quickStatIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <FiFlag />
          </div>
          <div className={styles.quickStatInfo}>
            <span className={styles.quickStatValue}>{stats.high}</span>
            <span className={styles.quickStatLabel}>High Priority</span>
          </div>
        </div>
        <div className={styles.quickStatCard}>
          <div className={styles.quickStatIcon} style={{ background: '#f0fdf4', color: '#22c55e' }}>
            <FiActivity />
          </div>
          <div className={styles.quickStatInfo}>
            <span className={styles.quickStatValue}>{stats.review}</span>
            <span className={styles.quickStatLabel}>In Review</span>
          </div>
        </div>
        <div className={styles.quickStatCard}>
          <div className={styles.quickStatIcon} style={{ background: '#fefce8', color: '#eab308' }}>
            <FiFolder />
          </div>
          <div className={styles.quickStatInfo}>
            <span className={styles.quickStatValue}>{Object.keys(stats.projectCounts).length}</span>
            <span className={styles.quickStatLabel}>Active Projects</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className={styles.reportsGrid}>
        {/* Weekly Activity Chart - Recharts */}
        <div className={styles.reportCard}>
          <div className={styles.reportCardHeader}>
            <h3><FiTrendingUp /> Weekly Activity</h3>
            <span className={styles.reportBadge}>Last 7 Days</span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="created" name="Created" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution - Pie Chart */}
        <div className={styles.reportCard}>
          <div className={styles.reportCardHeader}>
            <h3><FiBarChart2 /> Task Distribution</h3>
            <span className={styles.reportBadge}>By Status</span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.pieLegend}>
              {statusDistribution.map((entry, index) => (
                <div key={index} className={styles.pieLegendItem}>
                  <span className={styles.pieLegendDot} style={{ background: entry.color }} />
                  <span>{entry.name}</span>
                  <span className={styles.pieLegendValue}>{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Trend - Line Chart */}
        <div className={styles.reportCard}>
          <div className={styles.reportCardHeader}>
            <h3><FiActivity /> Monthly Trend</h3>
            <span className={styles.reportBadge}>Last 6 Months</span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                <YAxis stroke="var(--text-muted)" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="Created"
                  stroke="#3b82f6"
                  fill="#3b82f620"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#22c55e"
                  fill="#22c55e20"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Breakdown - Pie Chart */}
        <div className={styles.reportCard}>
          <div className={styles.reportCardHeader}>
            <h3><FiTarget /> Priority Breakdown</h3>
            <span className={styles.reportBadge}>By Priority</span>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.pieLegend}>
              {priorityData.map((entry, index) => (
                <div key={index} className={styles.pieLegendItem}>
                  <span className={styles.pieLegendDot} style={{ background: entry.color }} />
                  <span>{entry.name} Priority</span>
                  <span className={styles.pieLegendValue}>{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
