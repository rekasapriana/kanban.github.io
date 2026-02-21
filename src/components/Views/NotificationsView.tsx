import { useState, useEffect } from 'react'
import { FiBell, FiCheck, FiTrash2, FiUser, FiCheckCircle, FiAlertCircle, FiInfo, FiSearch, FiUserPlus } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getPendingInvitations,
  acceptTeamInvitation,
  declineTeamInvitation
} from '../../lib/api'
import type { Notification, TeamInvitation } from '../../types/database'
import styles from './Views.module.css'

type CombinedNotification = (Notification & { isInvitation?: false }) | {
  id: string
  type: 'invitation'
  title: string
  message: string
  is_read: boolean
  created_at: string
  isInvitation: true
  invitationData: TeamInvitation
}

export default function NotificationsView() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState<CombinedNotification[]>([])
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

    // Load regular notifications
    const { data: notifData, error: notifError } = await getNotifications(user.id)
    console.log('[Notifications] Loaded notifications:', notifData, notifError)

    // Load team invitations
    const { data: invitations, error: invError } = await getPendingInvitations(user.email || '')
    console.log('[Notifications] Loaded invitations:', invitations, invError)

    // Combine both
    const combined: CombinedNotification[] = [
      ...(notifData || []).map(n => ({ ...n, isInvitation: false as const })),
      ...(invitations || []).map(inv => ({
        id: inv.id,
        type: 'invitation' as const,
        title: 'Team Invitation',
        message: `${inv.name} invited you to join their team as ${inv.role}`,
        is_read: false,
        created_at: inv.invited_at,
        isInvitation: true as const,
        invitationData: inv
      }))
    ]

    // Sort by date
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setNotifications(combined)
    setLoading(false)
  }

  const handleAcceptInvitation = async (invitationId: string) => {
    const { error } = await acceptTeamInvitation(invitationId)
    if (!error) {
      showToast('You joined the team!', 'success')
      loadNotifications()
    } else {
      showToast('Failed to accept invitation', 'error')
    }
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    const { error } = await declineTeamInvitation(invitationId)
    if (!error) {
      showToast('Invitation declined', 'info')
      setNotifications(notifications.filter(n => n.id !== invitationId))
    } else {
      showToast('Failed to decline invitation', 'error')
    }
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

  const getIcon = (type: Notification['type'] | 'invitation') => {
    switch (type) {
      case 'task': return FiCheckCircle
      case 'reminder': return FiAlertCircle
      case 'mention': return FiUser
      case 'comment': return FiMessageCircle
      case 'invitation': return FiUserPlus
      default: return FiInfo
    }
  }

  const typeColors: Record<string, string> = {
    task: 'green',
    system: 'blue',
    mention: 'purple',
    reminder: 'yellow',
    invitation: 'indigo',
    comment: 'cyan',
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
          <option value="invitation">Invitations</option>
          <option value="task">Tasks</option>
          <option value="comment">Comments</option>
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

            // Special rendering for invitations
            if (notification.isInvitation) {
              return (
                <div
                  key={notification.id}
                  className={`${styles.notifCard} ${styles.invitationCard}`}
                >
                  <div className={`${styles.notifIcon} ${styles.indigo}`}>
                    <Icon />
                  </div>
                  <div className={styles.notifContent}>
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <span className={styles.notifTime}>{formatTime(notification.created_at)}</span>
                  </div>
                  <div className={styles.invitationActions}>
                    <button
                      className={styles.acceptBtn}
                      onClick={() => handleAcceptInvitation(notification.id)}
                      title="Accept"
                    >
                      <FiCheck /> Accept
                    </button>
                    <button
                      className={styles.declineBtn}
                      onClick={() => handleDeclineInvitation(notification.id)}
                      title="Decline"
                    >
                      <FiTrash2 /> Decline
                    </button>
                  </div>
                </div>
              )
            }

            // Regular notification
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
