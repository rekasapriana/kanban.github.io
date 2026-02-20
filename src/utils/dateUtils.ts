export function formatDateDisplay(date: string | null): string {
  if (!date) return 'No due date'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(date)
  due.setHours(0, 0, 0, 0)

  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < -1) return `Overdue (${Math.abs(diff)} days)`
  if (diff <= 7) return `${diff} days left`

  return due.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function getDateClass(date: string | null): 'overdue' | 'today' | '' {
  if (!date) return ''

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(date)
  due.setHours(0, 0, 0, 0)

  if (due < today) return 'overdue'
  if (due.getTime() === today.getTime()) return 'today'
  return ''
}

export function isOverdue(date: string | null): boolean {
  if (!date) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(date)
  due.setHours(0, 0, 0, 0)

  return due < today
}
