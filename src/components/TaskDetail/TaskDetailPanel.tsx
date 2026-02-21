import { useState, useEffect, useRef } from 'react'
import { FiX, FiEdit2, FiTrash2, FiMessageCircle, FiImage, FiSend, FiFlag, FiCalendar, FiCheckSquare, FiTag } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import { getTaskComments, createTaskComment, deleteTaskComment, uploadTaskAttachment, updateSubtask, getProfile, createNotification } from '../../lib/api'
import type { TaskComment, Profile } from '../../types/database'
import styles from './TaskDetailPanel.module.css'

export default function TaskDetailPanel() {
  const { state, deleteTask, archiveTask, openEditModal, closeDetailPanel, loadTasks } = useBoard()
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [comments, setComments] = useState<TaskComment[]>([])
  const [commentProfiles, setCommentProfiles] = useState<Record<string, Profile>>({})
  const [commentInput, setCommentInput] = useState('')
  const [commentImage, setCommentImage] = useState<File | null>(null)
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const task = state.selectedTaskId ? state.tasks.find(t => t.id === state.selectedTaskId) : null
  const column = task ? state.columns.find(c => c.id === task.column_id) : null

  // Check if user is the owner of the task (full access) or just assigned (limited access)
  const isTaskOwner = user?.id === task?.user_id

  // Load comments
  useEffect(() => {
    if (task) {
      loadComments(task.id)
    } else {
      setComments([])
    }
  }, [task])

  const loadComments = async (taskId: string) => {
    const { data } = await getTaskComments(taskId)
    console.log('[loadComments] Comments loaded:', data?.length)

    if (data) {
      setComments(data)

      // Fetch profiles for all comment authors
      const userIds = [...new Set(data.map(c => c.user_id))]
      console.log('[loadComments] User IDs to fetch:', userIds)

      const profiles: Record<string, Profile> = {}

      for (const userId of userIds) {
        console.log('[loadComments] Fetching profile for:', userId)
        const { data: profileData, error } = await getProfile(userId)
        console.log('[loadComments] Profile result:', {
          userId,
          hasData: !!profileData,
          fullName: profileData?.full_name,
          email: profileData?.email,
          error: error?.message || error
        })

        if (profileData) {
          profiles[userId] = profileData
        }
      }

      console.log('[loadComments] All profiles loaded:', Object.keys(profiles).length, 'profiles')
      setCommentProfiles(profiles)
    }
  }

  // Get display name for a comment author
  const getCommentAuthorName = (userId: string) => {
    const authorProfile = commentProfiles[userId]

    // If profile found, use it
    if (authorProfile?.full_name) return authorProfile.full_name
    if (authorProfile?.email) return authorProfile.email.split('@')[0]

    // Fallback: if this is the current user, use their info
    if (user?.id === userId) {
      return profile?.full_name || user?.email?.split('@')[0] || 'You'
    }

    // Last resort: use short user ID
    return `User ${userId.slice(0, 6)}`
  }

  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error')
      return
    }

    setCommentImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setCommentImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeCommentImage = () => {
    setCommentImage(null)
    setCommentImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAddComment = async () => {
    if (!task || !user || (!commentInput.trim() && !commentImage)) return

    console.log('[Comment] Starting to add comment...')
    console.log('[Comment] Task:', task.id, 'Title:', task.title)
    console.log('[Comment] Task owner:', task.user_id)
    console.log('[Comment] Current user:', user.id)
    console.log('[Comment] Assigned to:', task.assigned_to)

    setLoading(true)

    let imageUrl: string | null = null

    // Upload image if selected
    if (commentImage) {
      const { data: attachmentData, error: uploadError } = await uploadTaskAttachment(
        task.id,
        user.id,
        commentImage
      )

      if (uploadError) {
        showToast('Failed to upload image', 'error')
        setLoading(false)
        return
      }

      if (attachmentData) {
        imageUrl = attachmentData.file_url
      }
    }

    // Create comment with image URL
    const { data, error } = await createTaskComment({
      task_id: task.id,
      user_id: user.id,
      content: commentInput.trim() || (imageUrl ? '📷 Shared an image' : ''),
      image_url: imageUrl
    })

    if (!error && data) {
      setComments([...comments, data])
      setCommentInput('')
      setCommentImage(null)
      setCommentImagePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      showToast('Comment added!', 'success')

      // Send notifications to task owner and assignees (except commenter)
      const commenterName = profile?.full_name || user?.email?.split('@')[0] || 'Someone'
      const notifyUserIds = new Set<string>()

      // Add task owner (if not commenter)
      if (task.user_id && task.user_id !== user.id) {
        notifyUserIds.add(task.user_id)
      }

      // Add assignees (if not commenter)
      if (task.task_assignees) {
        task.task_assignees.forEach(a => {
          if (a.user_id !== user.id) {
            notifyUserIds.add(a.user_id)
          }
        })
      }

      console.log('[Comment] Task owner:', task.user_id)
      console.log('[Comment] Current user:', user.id)
      console.log('[Comment] Task assignees:', task.task_assignees)
      console.log('[Comment] Assignees count:', task.task_assignees?.length)
      console.log('[Comment] Users to notify:', Array.from(notifyUserIds), 'Commenter:', user.id)

      // Send notification to each user
      for (const notifyUserId of notifyUserIds) {
        console.log('[Comment] Creating notification for:', notifyUserId)
        const { data: notifData, error: notifError } = await createNotification({
          user_id: notifyUserId,
          type: 'mention',
          title: 'New Comment',
          message: `${commenterName} commented on "${task.title}"`,
          is_read: false,
          task_id: task.id,
          board_id: task.board_id
        })
        console.log('[Comment] Notification result:', { notifData, notifError })
      }
    } else {
      showToast('Failed to add comment', 'error')
    }

    setLoading(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return

    const { error } = await deleteTaskComment(commentId)
    if (!error) {
      setComments(comments.filter(c => c.id !== commentId))
      showToast('Comment deleted', 'info')
    }
  }

  const handleDeleteTask = async () => {
    if (!task || !confirm('Delete this task?')) return
    await deleteTask(task.id)
    closeDetailPanel()
  }

  const handleArchiveTask = async () => {
    if (!task) return
    await archiveTask(task)
    closeDetailPanel()
  }

  const handleEdit = () => {
    if (task) {
      closeDetailPanel()
      openEditModal(task)
    }
  }

  const handleToggleSubtask = async (subtaskId: string, currentStatus: boolean) => {
    if (!task) return

    const { error } = await updateSubtask(subtaskId, { is_completed: !currentStatus })

    if (!error) {
      // Reload tasks to refresh the data
      await loadTasks()
      showToast(!currentStatus ? 'Subtask completed!' : 'Subtask reopened', 'success')
    } else {
      showToast('Failed to update subtask', 'error')
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#22c55e'
      default: return '#888'
    }
  }

  const displayName = profile?.full_name || user?.user_metadata?.name || 'You'

  if (!state.isDetailPanelOpen || !task) return null

  return (
    <>
      {/* Overlay */}
      <div className={styles.overlay} onClick={closeDetailPanel} />

      {/* Panel */}
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <h2>{task.title}</h2>
          <button className={styles.closeBtn} onClick={closeDetailPanel}>
            <FiX />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Meta Info */}
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <FiFlag style={{ color: getPriorityColor(task.priority) }} />
              <span className={styles.priorityBadge} style={{ background: getPriorityColor(task.priority) }}>
                {task.priority}
              </span>
            </div>
            {column && (
              <div className={styles.metaItem}>
                <span className={styles.statusBadge} style={{ background: column.color }}>
                  {column.title}
                </span>
              </div>
            )}
            {task.due_date && (
              <div className={styles.metaItem}>
                <FiCalendar />
                <span>{new Date(task.due_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div className={styles.section}>
              <p className={styles.description}>{task.description}</p>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <FiTag />
                <span>Tags</span>
              </div>
              <div className={styles.tags}>
                {task.tags.map(tag => (
                  <span key={tag.id} className={styles.tag}>{tag.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <FiCheckSquare />
                <span>Subtasks ({task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length})</span>
              </div>
              <div className={styles.subtasks}>
                {task.subtasks.map(subtask => (
                  <div
                    key={subtask.id}
                    className={`${styles.subtask} ${subtask.is_completed ? styles.completed : ''} ${!isTaskOwner ? styles.readOnly : ''}`}
                    onClick={isTaskOwner ? () => handleToggleSubtask(subtask.id, subtask.is_completed) : undefined}
                    style={{ cursor: isTaskOwner ? 'pointer' : 'default' }}
                  >
                    <span className={styles.checkbox}>{subtask.is_completed ? '✓' : ''}</span>
                    <span>{subtask.title}</span>
                  </div>
                ))}
              </div>
              {!isTaskOwner && (
                <span className={styles.viewerHint}>View only - ask the task owner to update subtasks</span>
              )}
            </div>
          )}

          {/* Comments Section */}
          <div className={styles.commentsSection}>
            <div className={styles.sectionHeader}>
              <FiMessageCircle />
              <span>Comments ({comments.length})</span>
            </div>

            <div className={styles.comments}>
              {comments.length > 0 ? (
                comments.map(comment => {
                  const authorName = getCommentAuthorName(comment.user_id)
                  return (
                  <div key={comment.id} className={styles.comment}>
                    <div className={styles.commentAvatar}>
                      {authorName.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.commentBody}>
                      <div className={styles.commentHeader}>
                        <span className={styles.commentAuthor}>{authorName}</span>
                        <span className={styles.commentTime}>{formatTime(comment.created_at)}</span>
                      </div>
                      {comment.content && (
                        <p className={styles.commentText}>{comment.content}</p>
                      )}
                      {comment.image_url && (
                        <img
                          src={comment.image_url}
                          alt="Comment image"
                          className={styles.commentImage}
                          onClick={() => window.open(comment.image_url!, '_blank')}
                        />
                      )}
                    </div>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                  )
                })
              ) : (
                <p className={styles.noComments}>No comments yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Input Area */}
        <div className={styles.inputArea}>
          {commentImagePreview && (
            <div className={styles.imagePreview}>
              <img src={commentImagePreview} alt="Preview" />
              <button onClick={removeCommentImage}>
                <FiX />
              </button>
            </div>
          )}
          <div className={styles.inputRow}>
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Write a comment..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCommentImageSelect}
              style={{ display: 'none' }}
            />
            <div className={styles.inputActions}>
              <button
                className={styles.actionBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Add image"
              >
                <FiImage />
              </button>
              <button
                className={styles.sendBtn}
                onClick={handleAddComment}
                disabled={loading || (!commentInput.trim() && !commentImage)}
              >
                <FiSend />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Menu Bar - Only for task owner */}
        {isTaskOwner ? (
          <div className={styles.bottomMenu}>
            <button className={styles.menuBtn} onClick={handleEdit} title="Edit Task">
              <FiEdit2 />
              <span>Edit</span>
            </button>
            <button className={styles.menuBtn} onClick={handleArchiveTask} title="Archive">
              <FiTrash2 />
              <span>Archive</span>
            </button>
            <button className={`${styles.menuBtn} ${styles.deleteBtn}`} onClick={handleDeleteTask} title="Delete">
              <FiTrash2 />
              <span>Delete</span>
            </button>
          </div>
        ) : (
          <div className={styles.bottomMenu}>
            <span className={styles.viewOnlyBadge}>👁️ View Only - You can add comments</span>
          </div>
        )}
      </div>
    </>
  )
}
