import { useState, useEffect } from 'react'
import { FiBell, FiCheck, FiTrash2, FiUser, FiCheckCircle, FiAlertCircle, FiInfo, FiSearch } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../../lib/api'
import type { Notification } from '../../types/database'
import styles from './Views.module.css'

export default function NotificationsView() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadNotifications()
  }, [user])

  const loadNotifications = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await getNotifications(user.id)
    if (data) {
      setNotifications(data)
    }
    setLoading(false)
  }

  const filteredNotifications = notifications.filter(n => {
    const matchesRead = filter === 'all' || !n.is_read
    const matchesType = typeFilter === 'all' || n.type === typeFilter
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesRead && matchesType && matchesSearch
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id)
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, is_read: true } : n
    ))
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return
    await markAllNotificationsAsRead(user.id)
    setNotifications(notifications.map(n => ({ ...n, is_read: true })))
    showToast('All notifications marked as read!', 'success')
  }

  const handleDelete = async (id: string) => {
    await deleteNotification(id)
    setNotifications(notifications.filter(n => n.id !== id))
    showToast('Notification deleted!', 'success')
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task': return FiCheckCircle
      case 'reminder': return FiAlertCircle
      case 'mention': return FiUser
      default: return FiInfo
    }
  }

  const typeColors = {
    task: 'green',
    system: 'blue',
    mention: 'purple',
    reminder: 'yellow',
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
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

  if (loading) {
    return (
      <div className={styles.notificationsView}>
        <div className={styles.loading}>Loading notifications...</div>
      </div>
    )
  }

  return (
    <div className={styles.notificationsView}>
      {/* Header */}
      <div className={styles.notificationsHeader}>
        <div className={styles.notificationsTitle}>
          <div className={styles.notificationsIcon}>
            <FiBell />
            {unreadCount > 0 && (
              <span className={styles.notificationsBadge}>{unreadCount}</span>
            )}
          </div>
          <div>
            <h1>Notifications</h1>
            <p>{unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
            <FiCheck /> Mark all as read
          </button>
        )}
      </div>

      {/* Stats */}
      <div className={styles.notificationsStats}>
        <div className={styles.notifStatCard}>
          <span className={styles.notifStatValue}>{notifications.length}</span>
          <span className={styles.notifStatLabel}>Total</span>
        </div>
        <div className={styles.notifStatCard}>
          <span className={styles.notifStatValue}>{unreadCount}</span>
          <span className={styles.notifStatLabel}>Unread</span>
        </div>
        <div className={styles.notifStatCard}>
          <span className={styles.notifStatValue}>{notifications.filter(n => n.type === 'task').length}</span>
          <span className={styles.notifStatLabel}>Tasks</span>
        </div>
        <div className={styles.notifStatCard}>
          <span className={styles.notifStatValue}>{notifications.filter(n => n.type === 'reminder').length}</span>
          <span className={styles.notifStatLabel}>Reminders</span>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.notificationsFilters}>
        <div className={styles.notifSearch}>
          <FiSearch />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.notifFilterTabs}>
          <button
            className={`${styles.notifFilterTab} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`${styles.notifFilterTab} ${filter === 'unread' ? styles.active : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
        </div>
        <select
          className={styles.notifTypeFilter}
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="task">Tasks</option>
          <option value="reminder">Reminders</option>
          <option value="mention">Mentions</option>
          <option value="system">System</option>
        </select>
      </div>

      {/* Notifications List */}
      <div className={styles.notificationsList}>
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(notification => {
            const Icon = getIcon(notification.type)
            return (
              <div
                key={notification.id}
                className={`${styles.notifCard} ${!notification.is_read ? styles.unread : ''}`}
              >
                <div className={`${styles.notifIcon} ${styles[typeColors[notification.type]]}`}>
                  <Icon />
                </div>
                <div className={styles.notifContent}>
                  <h4>{notification.title}</h4>
                  <p>{notification.message}</p>
                  <span className={styles.notifTime}>{formatTime(notification.created_at)}</span>
                </div>
                <div className={styles.notifActions}>
                  {!notification.is_read && (
                    <button
                      className={styles.notifReadBtn}
                      onClick={() => handleMarkAsRead(notification.id)}
                      title="Mark as read"
                    >
                      <FiCheck />
                    </button>
                  )}
                  <button
                    className={styles.notifDeleteBtn}
                    onClick={() => handleDelete(notification.id)}
                    title="Delete"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className={styles.emptyNotifications}>
            <div className={styles.emptyNotifIcon}>
              <FiBell />
            </div>
            <h3>No notifications</h3>
            <p>{filter === 'unread' ? 'No unread notifications' : "You're all caught up!"}</p>
          </div>
        )}
      </div>
    </div>
  )
}
