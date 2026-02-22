import { useState, useEffect } from 'react'
import { FiActivity, FiRefreshCw, FiFilter, FiUser, FiCheck, FiEdit3, FiTrash2, FiMessageSquare, FiPaperclip, FiCalendar, FiClock } from 'react-icons/fi'
import * as api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import type { ActivityLog } from '../../types/database'
import styles from './ActivityFeed.module.css'

interface ActivityFeedProps {
  boardId?: string
  taskId?: string
  limit?: number
}

export default function ActivityFeed({ boardId, taskId, limit = 20 }: ActivityFeedProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    loadActivities()
  }, [boardId, taskId, limit])

  const loadActivities = async () => {
    setLoading(true)
    const { data, error } = await api.getActivityLog(boardId, taskId, undefined, limit)
    if (data) {
      setActivities(data)
    }
    setLoading(false)
  }

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'task_created':
        return <FiPlus />
      case 'task_updated':
      case 'priority_changed':
      case 'due_date_changed':
        return <FiEdit3 />
      case 'task_completed':
        return <FiCheck />
      case 'task_deleted':
        return <FiTrash2 />
      case 'task_moved':
        return <FiArrowRight />
      case 'comment_added':
        return <FiMessageSquare />
      case 'attachment_added':
        return <FiPaperclip />
      case 'assignee_added':
      case 'assignee_removed':
        return <FiUser />
      case 'label_added':
      case 'label_removed':
        return <FiTag />
      case 'time_logged':
        return <FiClock />
      default:
        return <FiActivity />
    }
  }

  const getActivityIconClass = (actionType: string) => {
    if (actionType.includes('created')) return styles.created
    if (actionType.includes('updated') || actionType.includes('changed')) return styles.updated
    if (actionType.includes('completed')) return styles.completed
    if (actionType.includes('deleted')) return styles.deleted
    if (actionType.includes('comment')) return styles.comment
    return styles.default
  }

  const formatActivityText = (activity: ActivityLog): string => {
    const userName = (activity as any).profiles?.full_name || 'Someone'
    const details = activity.action_details || {}
    const taskTitle = details.title || 'a task'

    switch (activity.action_type) {
      case 'task_created':
        return `<strong>${userName}</strong> created task "${taskTitle}"`
      case 'task_updated':
        return `<strong>${userName}</strong> updated task "${taskTitle}"`
      case 'task_completed':
        return `<strong>${userName}</strong> completed task "${taskTitle}"`
      case 'task_deleted':
        return `<strong>${userName}</strong> deleted task "${taskTitle}"`
      case 'task_moved':
        return `<strong>${userName}</strong> moved task "${taskTitle}"`
      case 'task_archived':
        return `<strong>${userName}</strong> archived task "${taskTitle}"`
      case 'task_restored':
        return `<strong>${userName}</strong> restored task "${taskTitle}"`
      case 'comment_added':
        return `<strong>${userName}</strong> added a comment`
      case 'attachment_added':
        return `<strong>${userName}</strong> added an attachment`
      case 'assignee_added':
        return `<strong>${userName}</strong> assigned task "${taskTitle}"`
      case 'priority_changed':
        return `<strong>${userName}</strong> changed priority to ${details.new_priority || 'unknown'}`
      case 'due_date_changed':
        return `<strong>${userName}</strong> changed due date`
      case 'time_logged':
        return `<strong>${userName}</strong> logged time`
      default:
        return `<strong>${userName}</strong> ${activity.action_type.replace(/_/g, ' ')}`
    }
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const filteredActivities = filter
    ? activities.filter(a => a.action_type.includes(filter))
    : activities

  const activityTypes = [
    { value: 'created', label: 'Created' },
    { value: 'updated', label: 'Updated' },
    { value: 'completed', label: 'Completed' },
    { value: 'comment', label: 'Comments' },
  ]

  return (
    <div className={styles.activityFeed}>
      <div className={styles.feedHeader}>
        <h3 className={styles.feedTitle}>
          <FiActivity /> Activity
        </h3>
        <div className={styles.feedActions}>
          <button
            className={styles.refreshBtn}
            onClick={loadActivities}
            disabled={loading}
            title="Refresh"
          >
            <FiRefreshCw className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className={styles.filterChips}>
        <button
          className={`${styles.filterChip} ${!filter ? styles.active : ''}`}
          onClick={() => setFilter(null)}
        >
          All
        </button>
        {activityTypes.map(type => (
          <button
            key={type.value}
            className={`${styles.filterChip} ${filter === type.value ? styles.active : ''}`}
            onClick={() => setFilter(type.value)}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Activity list */}
      <div className={styles.activityList}>
        {filteredActivities.length > 0 ? (
          filteredActivities.map(activity => (
            <div key={activity.id} className={styles.activityItem}>
              <div className={`${styles.activityIcon} ${getActivityIconClass(activity.action_type)}`}>
                {getActivityIcon(activity.action_type)}
              </div>
              <div className={styles.activityContent}>
                <p
                  className={styles.activityText}
                  dangerouslySetInnerHTML={{ __html: formatActivityText(activity) }}
                />
                <span className={styles.activityTime}>
                  {formatTimeAgo(activity.created_at)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.noActivity}>
            <FiActivity />
            <p>No activity yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Import missing icons
import { FiPlus, FiArrowRight, FiTag } from 'react-icons/fi'
