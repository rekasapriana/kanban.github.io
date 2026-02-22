// Browser Notification Service
export type NotificationPermissionState = 'granted' | 'denied' | 'default'

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  tag?: string
  data?: any
  requireInteraction?: boolean
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

class NotificationService {
  private permission: NotificationPermissionState = 'default'
  private isSupported: boolean = false

  constructor() {
    this.isSupported = 'Notification' in window
    if (this.isSupported) {
      this.permission = Notification.permission as NotificationPermissionState
    }
  }

  // Check if notifications are supported
  isNotificationSupported(): boolean {
    return this.isSupported
  }

  // Get current permission state
  getPermissionState(): NotificationPermissionState {
    return this.permission
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported) {
      console.log('[Notifications] Not supported in this browser')
      return 'denied'
    }

    try {
      const result = await Notification.requestPermission()
      this.permission = result as NotificationPermissionState
      return this.permission
    } catch (error) {
      console.error('[Notifications] Error requesting permission:', error)
      return 'denied'
    }
  }

  // Show a notification
  async show(options: NotificationOptions): Promise<Notification | null> {
    if (!this.isSupported) {
      console.log('[Notifications] Not supported')
      return null
    }

    if (this.permission !== 'granted') {
      const newPermission = await this.requestPermission()
      if (newPermission !== 'granted') {
        console.log('[Notifications] Permission not granted')
        return null
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction || false,
      })

      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()
        notification.close()

        // Handle click action if data contains URL
        if (options.data?.url) {
          window.location.href = options.data.url
        }
      }

      return notification
    } catch (error) {
      console.error('[Notifications] Error showing notification:', error)
      return null
    }
  }

  // Show task reminder notification
  async showTaskReminder(task: {
    id: string
    title: string
    due_date?: string
    description?: string
  }): Promise<Notification | null> {
    return this.show({
      title: `Task Reminder: ${task.title}`,
      body: task.description || `Don't forget about this task!`,
      tag: `task-reminder-${task.id}`,
      data: { taskId: task.id, url: `/board?task=${task.id}` },
      requireInteraction: true,
    })
  }

  // Show due date notification
  async showDueDateNotification(task: {
    id: string
    title: string
    due_date: string
  }): Promise<Notification | null> {
    const dueDate = new Date(task.due_date)
    const now = new Date()
    const diffMs = dueDate.getTime() - now.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))

    let body: string
    if (diffMs < 0) {
      body = `This task is overdue!`
    } else if (diffHours < 1) {
      body = `Due within the next hour!`
    } else if (diffHours < 24) {
      body = `Due in ${diffHours} hours`
    } else {
      const diffDays = Math.round(diffHours / 24)
      body = `Due in ${diffDays} days`
    }

    return this.show({
      title: `Due Soon: ${task.title}`,
      body,
      tag: `due-date-${task.id}`,
      data: { taskId: task.id, url: `/board?task=${task.id}` },
      requireInteraction: true,
    })
  }

  // Show comment notification
  async showCommentNotification(data: {
    taskId: string
    taskTitle: string
    commenterName: string
    commentPreview: string
  }): Promise<Notification | null> {
    return this.show({
      title: `${data.commenterName} commented on "${data.taskTitle}"`,
      body: data.commentPreview,
      tag: `comment-${data.taskId}`,
      data: { taskId: data.taskId, url: `/board?task=${data.taskId}` },
    })
  }

  // Show mention notification
  async showMentionNotification(data: {
    taskId: string
    taskTitle: string
    mentionerName: string
    context: string
  }): Promise<Notification | null> {
    return this.show({
      title: `${data.mentionerName} mentioned you`,
      body: `In "${data.taskTitle}": ${data.context}`,
      tag: `mention-${data.taskId}`,
      data: { taskId: data.taskId, url: `/board?task=${data.taskId}` },
      requireInteraction: true,
    })
  }

  // Show task assigned notification
  async showTaskAssignedNotification(data: {
    taskId: string
    taskTitle: string
    assignerName: string
  }): Promise<Notification | null> {
    return this.show({
      title: `New Task Assigned`,
      body: `${data.assignerName} assigned you to "${data.taskTitle}"`,
      tag: `assigned-${data.taskId}`,
      data: { taskId: data.taskId, url: `/board?task=${data.taskId}` },
    })
  }

  // Show invitation notification
  async showInvitationNotification(data: {
    teamName: string
    inviterName: string
  }): Promise<Notification | null> {
    return this.show({
      title: `Team Invitation`,
      body: `${data.inviterName} invited you to join "${data.teamName}"`,
      tag: `invitation`,
      data: { url: `/notifications` },
      requireInteraction: true,
    })
  }
}

// Export singleton instance
export const notificationService = new NotificationService()

// Due Date Reminder Manager
export class DueDateReminderManager {
  private checkInterval: NodeJS.Timeout | null = null
  private notifiedTasks: Set<string> = new Set()

  // Start checking for due dates
  start(tasks: Array<{
    id: string
    title: string
    due_date?: string
    column_id: string
  }>, doneColumnId: string | null) {
    // Check immediately
    this.checkDueDates(tasks, doneColumnId)

    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkDueDates(tasks, doneColumnId)
    }, 60000)
  }

  // Stop checking
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.notifiedTasks.clear()
  }

  // Check due dates and send notifications
  private async checkDueDates(
    tasks: Array<{
      id: string
      title: string
      due_date?: string
      column_id: string
    }>,
    doneColumnId: string | null
  ) {
    const now = new Date()
    const notificationSettings = this.getNotificationSettings()

    if (!notificationSettings.pushNotifications) {
      return
    }

    for (const task of tasks) {
      // Skip tasks without due dates or completed tasks
      if (!task.due_date) continue
      if (doneColumnId && task.column_id === doneColumnId) continue

      const dueDate = new Date(task.due_date)
      const diffMs = dueDate.getTime() - now.getTime()
      const diffMins = Math.round(diffMs / (1000 * 60))

      // Notify for:
      // - Overdue tasks (just became overdue)
      // - Due in 15 mins
      // - Due in 1 hour
      // - Due in 1 day

      const notificationKey = this.getNotificationKey(task.id, diffMins)
      if (this.notifiedTasks.has(notificationKey)) continue

      let shouldNotify = false

      if (diffMs < 0 && diffMins > -1) {
        // Just became overdue (within 1 minute)
        shouldNotify = true
      } else if (diffMins >= 14 && diffMins <= 16) {
        // Due in ~15 minutes
        shouldNotify = true
      } else if (diffMins >= 59 && diffMins <= 61) {
        // Due in ~1 hour
        shouldNotify = true
      } else if (diffMins >= 1439 && diffMins <= 1441) {
        // Due in ~1 day
        shouldNotify = true
      }

      if (shouldNotify) {
        await notificationService.showDueDateNotification(task)
        this.notifiedTasks.add(notificationKey)
      }
    }
  }

  // Generate notification key to prevent duplicate notifications
  private getNotificationKey(taskId: string, diffMins: number): string {
    let bucket: string
    if (diffMins < 0) bucket = 'overdue'
    else if (diffMins < 30) bucket = '15min'
    else if (diffMins < 90) bucket = '1hour'
    else if (diffMins < 1500) bucket = '1day'
    else bucket = 'later'

    return `${taskId}-${bucket}`
  }

  // Get notification settings from localStorage
  private getNotificationSettings() {
    try {
      const stored = localStorage.getItem('notification_settings')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (e) {
      console.error('[DueDateReminder] Error reading settings:', e)
    }

    return {
      pushNotifications: true,
      emailNotifications: true,
      dueDateReminders: true,
    }
  }
}

// Export singleton instance
export const dueDateReminderManager = new DueDateReminderManager()
