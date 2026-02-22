import { useState, useEffect } from 'react'
import { FiActivity, FiFilter, FiRefreshCw } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useBoard } from '../../context/BoardContext'
import ActivityFeed from '../Activity/ActivityFeed'
import styles from './Views.module.css'

export default function ActivityView() {
  const { user } = useAuth()
  const { state } = useBoard()
  const [filterType, setFilterType] = useState<string>('all')

  const boardId = state.board?.id

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div>
          <h1>Activity</h1>
          <p>Track all activities across your board</p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.blue}`}>
          <div className={styles.statIcon}><FiActivity /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{state.tasks.length}</span>
            <span className={styles.statLabel}>Total Tasks</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.green}`}>
          <div className={styles.statIcon}><FiActivity /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{state.tasks.filter(t => {
              const column = state.columns.find(c => c.id === t.column_id)
              return column?.title.toLowerCase() === 'done'
            }).length}</span>
            <span className={styles.statLabel}>Completed</span>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <FiActivity />
          <span>Recent Activity</span>
        </div>
        {boardId ? (
          <ActivityFeed boardId={boardId} limit={50} />
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><FiActivity /></div>
            <h3>No Activity Yet</h3>
            <p>Start creating tasks to see activity here</p>
          </div>
        )}
      </div>
    </div>
  )
}
