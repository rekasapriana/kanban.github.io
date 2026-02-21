import { useAuth } from '../context/AuthContext'
import type { Task } from '../types/database'

interface TaskPermission {
  canMove: boolean
  canEdit: boolean
  canDelete: boolean
  isOwner: boolean
}

export function useTaskPermission(task: Task | null): TaskPermission {
  const { user } = useAuth()

  // Simple check - hanya owner yang bisa move/edit/delete
  // Untuk admin, akan dicek di level Board component
  const isOwner = task?.user_id === user?.id

  return {
    canMove: isOwner,
    canEdit: isOwner,
    canDelete: isOwner,
    isOwner
  }
}
