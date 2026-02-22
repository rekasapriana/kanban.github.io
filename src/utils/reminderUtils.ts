// Reminder utilities for browser notifications

// Check if browser notifications are supported
export const areNotificationsSupported = (): boolean => {
  return 'Notification' in window
}

// Check if notifications are enabled
export const areNotificationsEnabled = (): boolean => {
  if (!areNotificationsSupported()) return false
  return Notification.permission === 'granted'
}

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!areNotificationsSupported()) {
    console.log('Notifications not supported')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    console.log('Notifications denied')
    return false
  }

  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

// Show a notification
export const showNotification = (title: string, options?: NotificationOptions): Notification | null => {
  if (!areNotificationsEnabled()) {
    console.log('Notifications not enabled')
    return null
  }

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    return notification
  } catch (error) {
    console.error('Failed to show notification:', error)
    return null
  }
}

// Calculate reminder time before due date
export type ReminderOffset = '15min' | '30min' | '1hour' | '2hours' | '1day' | '2days' | '1week'

export const calculateReminderTime = (dueDate: string, offset: ReminderOffset): Date => {
  const due = new Date(dueDate)

  switch (offset) {
    case '15min':
      due.setMinutes(due.getMinutes() - 15)
      break
    case '30min':
      due.setMinutes(due.getMinutes() - 30)
      break
    case '1hour':
      due.setHours(due.getHours() - 1)
      break
    case '2hours':
      due.setHours(due.getHours() - 2)
      break
    case '1day':
      due.setDate(due.getDate() - 1)
      break
    case '2days':
      due.setDate(due.getDate() - 2)
      break
    case '1week':
      due.setDate(due.getDate() - 7)
      break
  }

  return due
}

// Format reminder offset for display
export const formatReminderOffset = (offset: ReminderOffset): string => {
  switch (offset) {
    case '15min': return '15 minutes before'
    case '30min': return '30 minutes before'
    case '1hour': return '1 hour before'
    case '2hours': return '2 hours before'
    case '1day': return '1 day before'
    case '2days': return '2 days before'
    case '1week': return '1 week before'
  }
}

// Get available reminder options
export const getReminderOptions = (): { value: ReminderOffset; label: string }[] => [
  { value: '15min', label: '15 minutes before' },
  { value: '30min', label: '30 minutes before' },
  { value: '1hour', label: '1 hour before' },
  { value: '2hours', label: '2 hours before' },
  { value: '1day', label: '1 day before' },
  { value: '2days', label: '2 days before' },
  { value: '1week', label: '1 week before' }
]

// Schedule a reminder (stores in localStorage for persistence)
export const scheduleReminder = (taskId: string, taskTitle: string, reminderAt: Date): void => {
  const reminders = getScheduledReminders()
  reminders[taskId] = {
    taskTitle,
    reminderAt: reminderAt.toISOString()
  }
  localStorage.setItem('taskReminders', JSON.stringify(reminders))
}

// Get all scheduled reminders
export const getScheduledReminders = (): Record<string, { taskTitle: string; reminderAt: string }> => {
  try {
    const stored = localStorage.getItem('taskReminders')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// Cancel a reminder
export const cancelReminder = (taskId: string): void => {
  const reminders = getScheduledReminders()
  delete reminders[taskId]
  localStorage.setItem('taskReminders', JSON.stringify(reminders))
}

// Check and trigger due reminders (call this periodically)
export const checkReminders = (): void => {
  if (!areNotificationsEnabled()) return

  const reminders = getScheduledReminders()
  const now = new Date()

  Object.entries(reminders).forEach(([taskId, reminder]) => {
    const reminderTime = new Date(reminder.reminderAt)

    if (reminderTime <= now) {
      // Trigger notification
      showNotification('Task Reminder', {
        body: `"${reminder.taskTitle}" is coming due!`,
        tag: `reminder-${taskId}`
      })

      // Remove triggered reminder
      cancelReminder(taskId)
    }
  })
}

// Start reminder checker interval
let reminderInterval: number | null = null

export const startReminderChecker = (): void => {
  if (reminderInterval) return

  // Check every minute
  reminderInterval = window.setInterval(checkReminders, 60000)

  // Also check immediately
  checkReminders()
}

export const stopReminderChecker = (): void => {
  if (reminderInterval) {
    clearInterval(reminderInterval)
    reminderInterval = null
  }
}
