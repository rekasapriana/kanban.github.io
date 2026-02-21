import { useState, useEffect } from 'react'
import { FiBell, FiCheck, FiX, FiMessageCircle, FiUser, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useBoard } from '../../context/BoardContext'
import { useToast } from '../../hooks/useToast'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getPendingInvitations,
  acceptTeamInvitation,
  declineTeamInvitation
} from '../../lib/api'
import type { Notification, TeamInvitation } from '../../types/database'
import styles from './NotificationBell.module.css'

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

export default function NotificationBell() {
  const { user } = useAuth()
  const { openDetailPanel, setViewMode } = useBoard()
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<CombinedNotification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadNotifications()
      // Poll every 30 seconds for new notifications
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const loadNotifications = async () => {
    if (!user) return

    // Load regular notifications
    const { data: notifData } = await getNotifications(user.id)

    // Load team invitations
    const { data: invitations } = await getPendingInvitations(user.email || '')

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
  }

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

  const handleAcceptInvitation = async (invitationId: string) => {
    setLoading(true)
    const { error } = await acceptTeamInvitation(invitationId)
    if (!error) {
      showToast('You joined the team!', 'success')
      loadNotifications()
    } else {
      showToast('Failed to accept invitation', 'error')
    }
    setLoading(false)
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    setLoading(true)
    const { error } = await declineTeamInvitation(invitationId)
    if (!error) {
      showToast('Invitation declined', 'info')
      setNotifications(notifications.filter(n => n.id !== invitationId))
    } else {
      showToast('Failed to decline invitation', 'error')
    }
    setLoading(false)
  }

  const handleNotificationClick = async (notification: CombinedNotification) => {
    // Mark as read
    if (!notification.isInvitation && !notification.is_read) {
      await handleMarkAsRead(notification.id)
    }

    // If it's a task notification, open the task detail
    if (!notification.isInvitation) {
      const taskNotif = notification as Notification
      if (taskNotif.task_id) {
        // Switch to board view first
        setViewMode('board')
        // Open the task detail panel
        openDetailPanel(taskNotif.task_id)
      }
    }

    setIsOpen(false)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return FiCheckCircle
      case 'reminder': return FiAlertCircle
      case 'mention': return FiUser
      case 'comment': return FiMessageCircle
      case 'invitation': return FiUser
      default: return FiBell
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <FiBell />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className={styles.overlay} onClick={() => setIsOpen(false)} />
          <div className={styles.dropdown}>
            <div className={styles.header}>
              <span>Notifications</span>
              {unreadCount > 0 && (
                <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                  Mark all read
                </button>
              )}
            </div>

            <div className={styles.list}>
              {notifications.length === 0 ? (
                <div className={styles.empty}>
                  <FiBell />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.slice(0, 10).map(notification => {
                  const Icon = getIcon(notification.type)

                  if (notification.isInvitation) {
                    return (
                      <div key={notification.id} className={`${styles.item} ${styles.invitation}`}>
                        <div className={styles.iconWrapper}>
                          <Icon />
                        </div>
                        <div className={styles.content}>
                          <strong>{notification.title}</strong>
                          <p>{notification.message}</p>
                          <div className={styles.invitationActions}>
                            <button
                              className={styles.acceptBtn}
                              onClick={() => handleAcceptInvitation(notification.id)}
                              disabled={loading}
                            >
                              <FiCheck /> Accept
                            </button>
                            <button
                              className={styles.declineBtn}
                              onClick={() => handleDeclineInvitation(notification.id)}
                              disabled={loading}
                            >
                              <FiX /> Decline
                            </button>
                          </div>
                        </div>
                        <span className={styles.time}>{formatTime(notification.created_at)}</span>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={notification.id}
                      className={`${styles.item} ${!notification.is_read ? styles.unread : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={styles.iconWrapper}>
                        <Icon />
                      </div>
                      <div className={styles.content}>
                        <strong>{notification.title}</strong>
                        <p>{notification.message}</p>
                      </div>
                      <span className={styles.time}>{formatTime(notification.created_at)}</span>
                      {!notification.is_read && (
                        <button
                          className={styles.readBtn}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                          title="Mark as read"
                        >
                          <FiCheck />
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <button
              className={styles.viewAllBtn}
              onClick={() => {
                setIsOpen(false)
                // Navigate to notifications view - this would need to be connected to routing
              }}
            >
              View all notifications
            </button>
          </div>
        </>
      )}
    </div>
  )
}
