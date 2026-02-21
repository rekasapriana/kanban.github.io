import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FiEdit2, FiTrash2, FiRotateCcw, FiMessageCircle, FiImage, FiCheckSquare, FiCalendar, FiFolder, FiStar, FiLock } from 'react-icons/fi'
import type { Task } from '../../types/database'
import { useBoard } from '../../context/BoardContext'
import { useAuth } from '../../context/AuthContext'
import { formatDateDisplay, getDateClass, isOverdue } from '../../utils/dateUtils'
import { getStarredTaskIds, toggleStarredTask } from '../../lib/api'
import { useTaskPermission } from '../../hooks/useTaskPermission'
import styles from './Board.module.css'

interface TaskCardProps {
  task: Task
  isArchived?: boolean
  isDragging?: boolean
  isDone?: boolean
}

export default function TaskCard({ task, isArchived = false, isDragging = false, isDone = false }: TaskCardProps) {
  const { openEditModal, deleteTask, restoreTask, openDetailPanel } = useBoard()
  const { user, profile } = useAuth()
  const [isStarred, setIsStarred] = useState(false)
  const { canMove, canEdit, canDelete, isOwner } = useTaskPermission(task)

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

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation()
    openDetailPanel(task.id)
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.task} ${taskOverdue ? styles.overdue : ''} ${isSortableDragging ? styles.dragging : ''} ${isStarred ? styles.starred : ''} ${!canMove ? styles.noDrag : ''}`}
      data-priority={task.priority}
      onClick={() => openDetailPanel(task.id)}
      {...attributes}
      {...(canMove ? listeners : {})}
    >
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
              <button className={styles.actionIcon} onClick={handleComment} title="Comment">
                <FiMessageCircle />
              </button>
              <button className={styles.actionIcon} onClick={handleComment} title="Add Image">
                <FiImage />
              </button>
              {canEdit && !isDone && (
                <>
                  <button className={styles.actionIcon} onClick={handleEdit} title="Edit">
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

      {/* Description Preview */}
      {task.description && (
        <p className={styles.taskDescription}>{task.description}</p>
      )}

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
  )
}
