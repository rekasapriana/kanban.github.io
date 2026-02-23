import { useState, useEffect, useRef, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FiEdit2, FiTrash2, FiRotateCcw, FiCheckSquare, FiCalendar, FiFolder, FiStar, FiLock, FiCheck, FiClock } from 'react-icons/fi'
import type { Task } from '../../types/database'
import { useBoard } from '../../context/BoardContext'
import { useAuth } from '../../context/AuthContext'
import { formatDateDisplay, getDateClass, isOverdue } from '../../utils/dateUtils'
import { getStarredTaskIds, toggleStarredTask } from '../../lib/api'
import { useTaskPermission } from '../../hooks/useTaskPermission'
import QuickEdit from './QuickEdit'
import styles from './Board.module.css'

interface TaskCardProps {
  task: Task
  isArchived?: boolean
  isDragging?: boolean
  isDone?: boolean
}

// Get task age indicator color based on time in column
const getTaskAgeInfo = (updatedAt: string, isDone: boolean) => {
  if (isDone) return null // Don't show age for done tasks

  const now = new Date()
  const updated = new Date(updatedAt)
  const ageHours = (now.getTime() - updated.getTime()) / (1000 * 60 * 60)
  const ageDays = ageHours / 24

  if (ageDays < 1) {
    return { color: '#22c55e', label: '< 1 day', class: 'fresh' } // Green - fresh
  } else if (ageDays < 2) {
    return { color: '#84cc16', label: '1 day', class: 'good' } // Light green
  } else if (ageDays < 3) {
    return { color: '#eab308', label: '2 days', class: 'aging' } // Yellow
  } else if (ageDays < 5) {
    return { color: '#f97316', label: '3-4 days', class: 'old' } // Orange
  } else if (ageDays < 7) {
    return { color: '#ef4444', label: '5-6 days', class: 'stale' } // Red
  } else {
    return { color: '#991b1b', label: '1+ week', class: 'rotten' } // Dark red
  }
}

export default function TaskCard({ task, isArchived = false, isDragging = false, isDone = false }: TaskCardProps) {
  const { openEditModal, deleteTask, restoreTask, openDetailPanel, toggleSelectedTask, state } = useBoard()
  const { user, profile } = useAuth()
  const [isStarred, setIsStarred] = useState(false)
  const [showQuickEdit, setShowQuickEdit] = useState(false)
  const [quickEditPosition, setQuickEditPosition] = useState({ top: 0, left: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const { canMove, canEdit, canDelete, isOwner } = useTaskPermission(task)

  const isSelected = state.selectedTaskIds.includes(task.id)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
    disabled: !canMove // Disable drag if user can't move
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Load starred status
  useEffect(() => {
    const checkStarred = async () => {
      if (!user) return
      const { data } = await getStarredTaskIds(user.id)
      if (data) {
        setIsStarred(data.includes(task.id))
      }
    }
    checkStarred()
  }, [user, task.id])

  const taskOverdue = isOverdue(task.due_date)
  const tags = task.tags || []
  const subtasks = task.subtasks || []
  const completedSubtasks = subtasks.filter(s => s.is_completed).length
  const taskLabels = task.task_labels || []
  const project = task.projects

  // Get display name for avatar
  const displayName = profile?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'U'
  const avatarInitial = displayName.charAt(0).toUpperCase()

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    openEditModal(task)
  }

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation()
    restoreTask(task)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteTask(task.id)
  }

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return

    console.log('[TaskCard] ========== TOGGLING STAR ==========')
    console.log('[TaskCard] User ID:', user.id)
    console.log('[TaskCard] Task ID:', task.id)
    console.log('[TaskCard] Current isStarred:', isStarred)

    const { starred, error } = await toggleStarredTask(user.id, task.id)

    console.log('[TaskCard] Result - starred:', starred, 'error:', error)
    console.log('[TaskCard] ========== END TOGGLE ==========')

    if (!error) {
      setIsStarred(starred)
    } else {
      alert('Failed to star task: ' + (error as any).message)
    }
  }

  const handleQuickEdit = (e: React.MouseEvent) => {
    if (!canEdit) return
    e.stopPropagation()

    // Calculate position for the popover
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) {
      // Position below the card
      let top = rect.bottom + 8
      let left = rect.left

      // Adjust if popover would go off screen
      if (left + 320 > window.innerWidth) {
        left = window.innerWidth - 320 - 16
      }
      if (top + 400 > window.innerHeight) {
        top = rect.top - 400 - 8 // Position above instead
      }

      setQuickEditPosition({ top, left: Math.max(16, left) })
      setShowQuickEdit(true)
    }
  }

  if (isDragging) {
    return (
      <div
        className={`${styles.task} ${taskOverdue ? styles.overdue : ''}`}
        data-priority={task.priority}
      >
        <div className={styles.taskHeader}>
          <span className={`${styles.priorityBadge} ${styles[task.priority]}`}>
            {task.priority}
          </span>
        </div>
        <p className={styles.taskText}>{task.title}</p>
      </div>
    )
  }

  // Callback ref to handle both refs
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      setNodeRef(node)
    }
  }, [setNodeRef])

  // Calculate task age
  const taskAge = getTaskAgeInfo(task.updated_at, isDone)

  return (
    <>
    <div
      ref={setRefs}
      style={style}
      className={`${styles.task} ${taskOverdue ? styles.overdue : ''} ${isSortableDragging ? styles.dragging : ''} ${isStarred ? styles.starred : ''} ${!canMove ? styles.noDrag : ''} ${isSelected ? styles.taskBulkSelected : ''} ${taskAge ? styles[taskAge.class] : ''}`}
      data-priority={task.priority}
      onClick={() => openDetailPanel(task.id)}
      {...attributes}
      {...(canMove ? listeners : {})}
    >
      {/* Task Age Indicator Bar */}
      {taskAge && (
        <div
          className={styles.taskAgeBar}
          style={{ backgroundColor: taskAge.color }}
          title={`In column for ${taskAge.label}`}
        />
      )}

      {/* Bulk Selection Checkbox */}
      <div
        className={`${styles.taskCheckbox} ${isSelected ? styles.checked : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          toggleSelectedTask(task.id, task.column_id)
        }}
      >
        {isSelected && <FiCheck />}
      </div>

      {/* Cover Image */}
      {task.cover_image_url && (
        <div className={styles.taskCover}>
          <img src={task.cover_image_url} alt="" />
        </div>
      )}

      {/* Lock indicator for non-movable tasks */}
      {!canMove && !isDragging && (
        <div className={styles.lockIndicator} title="Only task creator and admins can move this task">
          <FiLock />
        </div>
      )}

      {/* Task Header with Priority and Menu */}
      <div className={styles.taskHeader}>
        <div className={styles.taskHeaderLeft}>
          <span className={`${styles.priorityBadge} ${styles[task.priority]}`}>
            {task.priority}
          </span>
          {/* Project Badge */}
          {project && (
            <span className={styles.projectBadge} style={{ background: `${project.color}20`, color: project.color }}>
              <FiFolder />
              {project.name}
            </span>
          )}
        </div>

        {/* Menu Actions - Top Right */}
        <div className={styles.taskActions}>
          {/* Star Button */}
          <button
            className={`${styles.actionIcon} ${styles.starIcon} ${isStarred ? styles.starred : ''}`}
            onClick={handleToggleStar}
            title={isStarred ? 'Unstar' : 'Star'}
          >
            <FiStar />
          </button>

          {isArchived ? (
            <>
              <button className={styles.actionIcon} onClick={handleRestore} title="Restore">
                <FiRotateCcw />
              </button>
              {canDelete && (
                <button className={`${styles.actionIcon} ${styles.deleteIcon}`} onClick={handleDelete} title="Delete">
                  <FiTrash2 />
                </button>
              )}
            </>
          ) : (
            <>
              {canEdit && !isDone && (
                <>
                  <button className={styles.actionIcon} onClick={handleQuickEdit} title="Quick Edit">
                    <FiEdit2 />
                  </button>
                </>
              )}
              {canDelete && !isDone && (
                <button className={`${styles.actionIcon} ${styles.deleteIcon}`} onClick={handleDelete} title="Delete">
                  <FiTrash2 />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Task Title */}
      <p className={styles.taskText}>{task.title}</p>

      {/* Labels */}
      {taskLabels.length > 0 && (
        <div className={styles.labelsRow}>
          {taskLabels.slice(0, 3).map(tl => (
            <span
              key={tl.id}
              className={styles.labelBadge}
              style={{ background: tl.labels.color }}
            >
              {tl.labels.name}
            </span>
          ))}
          {taskLabels.length > 3 && (
            <span className={styles.labelMore}>+{taskLabels.length - 3}</span>
          )}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className={styles.taskTags}>
          {tags.slice(0, 3).map(tag => (
            <span key={tag.id} className={styles.tag}>
              {tag.name}
            </span>
          ))}
          {tags.length > 3 && (
            <span className={styles.tagMore}>+{tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Task Footer with Meta and Assignee */}
      <div className={styles.taskFooter}>
        <div className={styles.taskMeta}>
          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div className={styles.metaItem}>
              <FiCheckSquare />
              <span>{completedSubtasks}/{subtasks.length}</span>
            </div>
          )}

          {/* Due Date */}
          {task.due_date && (
            <div className={`${styles.metaItem} ${styles[getDateClass(task.due_date)]}`}>
              <FiCalendar />
              <span>{formatDateDisplay(task.due_date)}</span>
            </div>
          )}
        </div>

        {/* Assignee Avatars */}
        <div className={styles.taskAssignees}>
          {task.task_assignees && task.task_assignees.length > 0 ? (
            task.task_assignees.slice(0, 3).map((ta, index) => {
              const name = ta.profiles?.full_name || ta.profiles?.email?.split('@')[0] || 'U'
              const initial = name.charAt(0).toUpperCase()
              return (
                <div
                  key={ta.id}
                  className={styles.assigneeAvatar}
                  title={name}
                  style={{ marginLeft: index > 0 ? '-8px' : '0', zIndex: 10 - index }}
                >
                  {initial}
                </div>
              )
            })
          ) : (
            <div className={styles.assigneeAvatar} title={displayName}>
              {avatarInitial}
            </div>
          )}
          {task.task_assignees && task.task_assignees.length > 3 && (
            <span className={styles.moreAssignees}>+{task.task_assignees.length - 3}</span>
          )}
        </div>
      </div>
    </div>

    {/* Quick Edit Popover */}
    {showQuickEdit && (
      <QuickEdit
        task={task}
        position={quickEditPosition}
        onClose={() => setShowQuickEdit(false)}
      />
    )}
    </>
  )
}
