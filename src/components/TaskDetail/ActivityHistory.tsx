import { useState, useEffect } from 'react'
import * as api from '../../lib/api'
import type { ActivityLog, ActivityActionType } from '../../types/database'
import styles from './ActivityHistory.module.css'

interface ActivityHistoryProps {
  boardId?: string
  taskId?: string
  limit?: number
}

const getActivityIcon = (actionType: ActivityActionType) => {
  switch (actionType) {
    case 'task_created':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      )
    case 'task_updated':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      )
    case 'task_deleted':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      )
    case 'task_moved':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
        </svg>
      )
    case 'task_completed':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <path d="M22 4L12 14.01l-3-3" />
        </svg>
      )
    case 'comment_added':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      )
    case 'assignee_added':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <path d="M20 8v6M23 11h-6" />
        </svg>
      )
    case 'label_added':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      )
    case 'priority_changed':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      )
    case 'due_date_changed':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      )
  }
}

const getActivityColor = (actionType: ActivityActionType) => {
  switch (actionType) {
    case 'task_created':
      return '#22c55e'
    case 'task_deleted':
      return '#ef4444'
    case 'task_completed':
      return '#22c55e'
    case 'comment_added':
      return '#3b82f6'
    case 'assignee_added':
    case 'assignee_removed':
      return '#8b5cf6'
    case 'priority_changed':
      return '#f59e0b'
    default:
      return '#6b7280'
  }
}

const formatActivityMessage = (activity: ActivityLog) => {
  const userName = (activity as any).profiles?.full_name || (activity as any).profiles?.email?.split('@')[0] || 'Someone'
  const details = activity.action_details || {}

  switch (activity.action_type) {
    case 'task_created':
      return `${userName} created this task`
    case 'task_updated':
      return `${userName} updated the task`
    case 'task_deleted':
      return `${userName} deleted the task`
    case 'task_moved':
      return `${userName} moved the task to ${details.to_column || 'another column'}`
    case 'task_completed':
      return `${userName} completed the task`
    case 'task_archived':
      return `${userName} archived the task`
    case 'task_restored':
      return `${userName} restored the task`
    case 'comment_added':
      return `${userName} added a comment`
    case 'attachment_added':
      return `${userName} added an attachment`
    case 'assignee_added':
      return `${userName} assigned ${details.assignee_name || 'someone'}`
    case 'assignee_removed':
      return `${userName} removed ${details.assignee_name || 'an assignee'}`
    case 'label_added':
      return `${userName} added label "${details.label_name || ''}"`
    case 'label_removed':
      return `${userName} removed label "${details.label_name || ''}"`
    case 'due_date_changed':
      return `${userName} changed the due date`
    case 'priority_changed':
      return `${userName} changed priority to ${details.new_priority || 'unknown'}`
    case 'time_logged':
      return `${userName} logged time`
    default:
      return `${userName} performed an action`
  }
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

export default function ActivityHistory({ boardId, taskId, limit = 20 }: ActivityHistoryProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActivities()
  }, [boardId, taskId, limit])

  const loadActivities = async () => {
    setLoading(true)
    const { data } = await api.getActivityLog(boardId, taskId, undefined, limit)
    setActivities(data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading activity...</div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>No activity yet</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h4 className={styles.title}>Activity</h4>
      <div className={styles.timeline}>
        {activities.map((activity, index) => (
          <div key={activity.id} className={styles.activityItem}>
            <div
              className={styles.iconWrapper}
              style={{ backgroundColor: `${getActivityColor(activity.action_type)}20`, color: getActivityColor(activity.action_type) }}
            >
              {getActivityIcon(activity.action_type)}
            </div>
            <div className={styles.content}>
              <p className={styles.message}>{formatActivityMessage(activity)}</p>
              <span className={styles.time}>{formatTimeAgo(activity.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
