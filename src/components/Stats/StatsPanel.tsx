import { useMemo } from 'react'
import { FiPieChart, FiX, FiClipboard, FiLoader, FiEye, FiCheckCircle } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import styles from './StatsPanel.module.css'

export default function StatsPanel() {
  const { state, toggleStatsPanel } = useBoard()

  const stats = useMemo(() => {
    const result = {
      todo: 0,
      inprogress: 0,
      review: 0,
      done: 0,
      archive: 0
    }

    const priorities = {
      high: 0,
      medium: 0,
      low: 0
    }

    state.columns.forEach(col => {
      const key = col.title.toLowerCase().replace(' ', '')
      result[key as keyof typeof result] = state.tasks.filter(t => t.column_id === col.id).length
    })

    state.tasks.forEach(t => {
      priorities[t.priority]++
    })

    const total = result.todo + result.inprogress + result.review + result.done
    const progress = total > 0 ? Math.round((result.done / total) * 100) : 0
    const maxP = Math.max(priorities.high, priorities.medium, priorities.low, 1)

    return { ...result, priorities, total, progress, maxP }
  }, [state.columns, state.tasks])

  if (!state.isStatsPanelOpen) return null

  return (
    <div className={`${styles.statsPanel} ${state.isStatsPanelOpen ? styles.active : ''}`}>
      <div className={styles.statsHeader}>
        <h3>
          <FiPieChart />
          Statistics
        </h3>
        <button className={styles.closeStats} onClick={toggleStatsPanel}>
          <FiX />
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.todo}`}>
            <FiClipboard />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statNumber}>{stats.todo}</span>
            <span className={styles.statLabel}>To Do</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.progress}`}>
            <FiLoader />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statNumber}>{stats.inprogress}</span>
            <span className={styles.statLabel}>In Progress</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.review}`}>
            <FiEye />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statNumber}>{stats.review}</span>
            <span className={styles.statLabel}>Review</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.done}`}>
            <FiCheckCircle />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statNumber}>{stats.done}</span>
            <span className={styles.statLabel}>Done</span>
          </div>
        </div>
      </div>

      <div className={styles.statsProgress}>
        <div className={styles.progressHeader}>
          <span>Overall Progress</span>
          <span>{stats.progress}%</span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${stats.progress}%` }}
          />
        </div>
      </div>

      <div className={styles.statsChart}>
        <h4>Tasks by Priority</h4>
        <div className={styles.priorityBars}>
          <div className={styles.priorityBar}>
            <span className={`${styles.priorityLabel} ${styles.high}`}>High</span>
            <div className={styles.barContainer}>
              <div
                className={`${styles.bar} ${styles.high}`}
                style={{ width: `${(stats.priorities.high / stats.maxP) * 100}%` }}
              />
            </div>
            <span className={styles.barCount}>{stats.priorities.high}</span>
          </div>

          <div className={styles.priorityBar}>
            <span className={`${styles.priorityLabel} ${styles.medium}`}>Medium</span>
            <div className={styles.barContainer}>
              <div
                className={`${styles.bar} ${styles.medium}`}
                style={{ width: `${(stats.priorities.medium / stats.maxP) * 100}%` }}
              />
            </div>
            <span className={styles.barCount}>{stats.priorities.medium}</span>
          </div>

          <div className={styles.priorityBar}>
            <span className={`${styles.priorityLabel} ${styles.low}`}>Low</span>
            <div className={styles.barContainer}>
              <div
                className={`${styles.bar} ${styles.low}`}
                style={{ width: `${(stats.priorities.low / stats.maxP) * 100}%` }}
              />
            </div>
            <span className={styles.barCount}>{stats.priorities.low}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
