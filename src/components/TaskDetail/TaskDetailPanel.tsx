import { useState, useEffect, useRef } from 'react'
import { FiX, FiEdit2, FiTrash2, FiMessageCircle, FiImage, FiSend, FiFlag, FiCalendar, FiCheckSquare, FiTag, FiPaperclip, FiDownload, FiFile, FiAtSign, FiCornerDownLeft, FiCopy, FiStar, FiAward, FiSmile } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import { getTaskComments, createTaskComment, deleteTaskComment, uploadTaskAttachment, getTaskAttachments, deleteTaskAttachment, updateSubtask, getProfile, createNotification, getTeamMembers } from '../../lib/api'
import type { TaskComment, Profile, TaskAttachment, TeamMember } from '../../types/database'
import TimeTracker from './TimeTracker'
import TaskDependencies from './TaskDependencies'
import styles from './TaskDetailPanel.module.css'

interface MentionableUser {
  id: string
  name: string
  email: string
}

// Common emojis for picker
const EMOJIS = ['👍', '👎', '😊', '😂', '❤️', '🔥', '🎉', '👀', '🙏', '💪', '✅', '❌', '⭐', '💡', '🚀', '👋', '🤔', '😅', '🙌', '💯', '📌', '⚡', '🎯', '📝']

export default function TaskDetailPanel() {
  const { state, deleteTask, archiveTask, openEditModal, closeDetailPanel, loadTasks } = useBoard()
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [comments, setComments] = useState<TaskComment[]>([])
  const [commentProfiles, setCommentProfiles] = useState<Record<string, Profile>>({})
  const [commentInput, setCommentInput] = useState('')
  const [commentFiles, setCommentFiles] = useState<File[]>([])
  const [commentFilePreviews, setCommentFilePreviews] = useState<{name: string; preview?: string; size: number; type: string}[]>([])
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>([])
  const [showMentionList, setShowMentionList] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartPos, setMentionStartPos] = useState(-1)
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null) // Which comment shows reply input
  const [replyInputValues, setReplyInputValues] = useState<Record<string, string>>({})
  const [replyFiles, setReplyFiles] = useState<Record<string, File[]>>({})
  const [replyFilePreviews, setReplyFilePreviews] = useState<Record<string, {name: string; preview?: string; size: number; type: string}[]>>({})
  const [pinnedComments, setPinnedComments] = useState<Set<string>>(new Set())
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState<string | null>(null) // commentId
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)

  const task = state.selectedTaskId ? state.tasks.find(t => t.id === state.selectedTaskId) : null
  const column = task ? state.columns.find(c => c.id === task.column_id) : null

  // Check if user is the owner of the task (full access) or just assigned (limited access)
  const isTaskOwner = user?.id === task?.user_id

  // Load comments
  useEffect(() => {
    if (task) {
      loadComments(task.id)
      loadAttachments(task.id)
      loadMentionableUsers()
    } else {
      setComments([])
      setAttachments([])
      setMentionableUsers([])
    }
  }, [task])

  // Load users that can be mentioned
  const loadMentionableUsers = async () => {
    if (!user) return

    const users: MentionableUser[] = []

    // Add team members
    const { data: members } = await getTeamMembers(user.id)
    if (members) {
      members.forEach(m => {
        if (m.auth_user_id) {
          users.push({
            id: m.auth_user_id,
            name: m.name,
            email: m.email
          })
        }
      })
    }

    // Add task owner
    if (task?.user_id && task.user_id !== user.id) {
      const { data: ownerProfile } = await getProfile(task.user_id)
      if (ownerProfile && !users.find(u => u.id === task.user_id)) {
        users.push({
          id: task.user_id,
          name: ownerProfile.full_name || ownerProfile.email?.split('@')[0] || 'Owner',
          email: ownerProfile.email || ''
        })
      }
    }

    // Add assignees
    if (task?.task_assignees) {
      for (const assignee of task.task_assignees) {
        if (assignee.user_id && !users.find(u => u.id === assignee.user_id)) {
          const name = assignee.profiles?.full_name || assignee.profiles?.email?.split('@')[0] || 'User'
          users.push({
            id: assignee.user_id,
            name: name,
            email: assignee.profiles?.email || ''
          })
        }
      }
    }

    setMentionableUsers(users)
  }

  const loadAttachments = async (taskId: string) => {
    const { data } = await getTaskAttachments(taskId)
    if (data) {
      setAttachments(data)
    }
  }

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

  const handleCommentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles: File[] = []
    const newPreviews: {name: string; preview?: string; size: number; type: string}[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > 10 * 1024 * 1024) {
        showToast(`File ${file.name} is too large (max 10MB)`, 'error')
        continue
      }

      newFiles.push(file)
      const previewData: {name: string; preview?: string; size: number; type: string} = {
        name: file.name,
        size: file.size,
        type: file.type
      }

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setCommentFilePreviews(prev => {
            const updated = [...prev]
            const index = updated.findIndex(p => p.name === file.name && p.size === file.size)
            if (index >= 0) {
              updated[index] = { ...updated[index], preview: reader.result as string }
            }
            return updated
          })
        }
        reader.readAsDataURL(file)
      }

      newPreviews.push(previewData)
    }

    setCommentFiles([...commentFiles, ...newFiles])
    setCommentFilePreviews([...commentFilePreviews, ...newPreviews])

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeCommentFile = (index: number) => {
    setCommentFiles(commentFiles.filter((_, i) => i !== index))
    setCommentFilePreviews(commentFilePreviews.filter((_, i) => i !== index))
  }

  // Handle comment input with mention detection
  const handleCommentInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0
    setCommentInput(value)

    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      // Check if @ is at start or preceded by space
      if (lastAtIndex === 0 || value[lastAtIndex - 1] === ' ') {
        const query = textBeforeCursor.substring(lastAtIndex + 1).toLowerCase()
        // Check if query contains any space (which would end the mention)
        if (!query.includes(' ')) {
          setMentionQuery(query)
          setMentionStartPos(lastAtIndex)
          setShowMentionList(true)
        } else {
          setShowMentionList(false)
        }
      } else {
        setShowMentionList(false)
      }
    } else {
      setShowMentionList(false)
    }
  }

  // Insert mention
  const insertMention = (mentionedUser: MentionableUser) => {
    const beforeMention = commentInput.substring(0, mentionStartPos)
    const afterMention = commentInput.substring((commentInputRef.current?.selectionStart || 0))
    const newInput = `${beforeMention}@${mentionedUser.name} ${afterMention}`
    setCommentInput(newInput)
    setShowMentionList(false)

    // Focus back on input
    setTimeout(() => {
      if (commentInputRef.current) {
        const newPos = beforeMention.length + mentionedUser.name.length + 2
        commentInputRef.current.focus()
        commentInputRef.current.setSelectionRange(newPos, newPos)
      }
    }, 0)
  }

  // Filter mentionable users by query
  const filteredMentionUsers = mentionableUsers.filter(u =>
    u.name.toLowerCase().includes(mentionQuery) ||
    u.email.toLowerCase().includes(mentionQuery)
  )

  // Extract mentioned user IDs from comment text
  const extractMentions = (text: string): string[] => {
    const mentionedIds: string[] = []
    mentionableUsers.forEach(u => {
      if (text.toLowerCase().includes(`@${u.name.toLowerCase()}`)) {
        mentionedIds.push(u.id)
      }
    })
    return mentionedIds
  }

  // Render comment text with highlighted mentions
  const renderCommentText = (text: string) => {
    if (!text) return null

    // Create regex to match all mentions
    const parts: { text: string; isMention: boolean; userId?: string }[] = []
    let remaining = text

    // Sort users by name length (longest first) to avoid partial matches
    const sortedUsers = [...mentionableUsers].sort((a, b) => b.name.length - a.name.length)

    while (remaining.length > 0) {
      let foundMention = false

      for (const u of sortedUsers) {
        const mentionStr = `@${u.name}`
        const lowerRemaining = remaining.toLowerCase()
        const mentionIndex = lowerRemaining.indexOf(mentionStr.toLowerCase())

        if (mentionIndex === 0) {
          // Found mention at start of remaining text
          parts.push({ text: mentionStr, isMention: true, userId: u.id })
          remaining = remaining.slice(mentionStr.length)
          foundMention = true
          break
        }
      }

      if (!foundMention) {
        // No mention found at start, take one character
        parts.push({ text: remaining[0], isMention: false })
        remaining = remaining.slice(1)
      }
    }

    return (
      <span>
        {parts.map((part, index) => (
          part.isMention
            ? <span key={index} className={styles.mentionHighlight}>{part.text}</span>
            : <span key={index}>{part.text}</span>
        ))}
      </span>
    )
  }

  // Reply to comment - show input and add @mention
  const handleReply = (comment: TaskComment) => {
    const authorName = getCommentAuthorName(comment.user_id)
    setActiveReplyId(comment.id)
    setReplyInputValues(prev => ({
      ...prev,
      [comment.id]: `@${authorName} `
    }))
  }

  // Cancel reply - hide input and clear files
  const cancelReply = (commentId: string) => {
    setActiveReplyId(null)
    setReplyInputValues(prev => {
      const updated = { ...prev }
      delete updated[commentId]
      return updated
    })
    // Clear reply files
    setReplyFiles(prev => {
      const updated = { ...prev }
      delete updated[commentId]
      return updated
    })
    setReplyFilePreviews(prev => {
      const updated = { ...prev }
      delete updated[commentId]
      return updated
    })
  }

  // Update reply input value for a specific comment
  const updateReplyInput = (commentId: string, value: string) => {
    setReplyInputValues(prev => ({
      ...prev,
      [commentId]: value
    }))
  }

  // Handle file selection for reply
  const handleReplyFileSelect = (commentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const currentFiles = replyFiles[commentId] || []
    const currentPreviews = replyFilePreviews[commentId] || []

    const newFiles: File[] = [...currentFiles]
    const newPreviews: {name: string; preview?: string; size: number; type: string}[] = [...currentPreviews]

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > 10 * 1024 * 1024) {
        showToast(`File ${file.name} is too large (max 10MB)`, 'error')
        continue
      }

      newFiles.push(file)
      const previewData: {name: string; preview?: string; size: number; type: string} = {
        name: file.name,
        size: file.size,
        type: file.type
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setReplyFilePreviews(prev => {
            const updated = { ...prev }
            const previews = updated[commentId] || []
            const index = previews.findIndex(p => p.name === file.name && p.size === file.size)
            if (index >= 0) {
              previews[index] = { ...previews[index], preview: reader.result as string }
              updated[commentId] = previews
            }
            return updated
          })
        }
        reader.readAsDataURL(file)
      }

      newPreviews.push(previewData)
    }

    setReplyFiles(prev => ({ ...prev, [commentId]: newFiles }))
    setReplyFilePreviews(prev => ({ ...prev, [commentId]: newPreviews }))

    // Reset input
    e.target.value = ''
  }

  // Remove file from reply
  const removeReplyFile = (commentId: string, index: number) => {
    setReplyFiles(prev => {
      const files = prev[commentId] || []
      const updated = { ...prev }
      updated[commentId] = files.filter((_, i) => i !== index)
      return updated
    })
    setReplyFilePreviews(prev => {
      const previews = prev[commentId] || []
      const updated = { ...prev }
      updated[commentId] = previews.filter((_, i) => i !== index)
      return updated
    })
  }

  // Insert emoji to main comment
  const insertEmojiToComment = (emoji: string) => {
    const input = commentInputRef.current
    if (input) {
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const newComment = commentInput.substring(0, start) + emoji + commentInput.substring(end)
      setCommentInput(newComment)
      // Move cursor after emoji
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = start + emoji.length
        input.focus()
      }, 0)
    } else {
      setCommentInput(commentInput + emoji)
    }
    setShowEmojiPicker(false)
  }

  // Insert emoji to reply
  const insertEmojiToReply = (commentId: string, emoji: string) => {
    const currentValue = replyInputValues[commentId] || ''
    updateReplyInput(commentId, currentValue + emoji)
    setShowReplyEmojiPicker(null)
  }

  // Submit inline reply
  const handleInlineReplySubmit = async (parentComment: TaskComment) => {
    const inputValue = replyInputValues[parentComment.id] || ''
    const files = replyFiles[parentComment.id] || []
    if (!task || !user || (!inputValue.trim() && files.length === 0)) return

    setLoading(true)

    // Upload all files
    const uploadedUrls: string[] = []
    for (const file of files) {
      const { data: attachmentData, error: uploadError } = await uploadTaskAttachment(
        task.id,
        user.id,
        file
      )
      if (!uploadError && attachmentData) {
        uploadedUrls.push(attachmentData.file_url)
      }
    }

    // Create comment as reply
    const { data, error } = await createTaskComment({
      task_id: task.id,
      user_id: user.id,
      content: inputValue.trim() || (uploadedUrls.length > 0 ? '📎 Shared file(s)' : ''),
      image_url: uploadedUrls[0] || null,
      parent_id: parentComment.id,
      is_pinned: false
    })

    if (!error && data) {
      setComments([...comments, data])
      // Clear this comment's reply input, files and hide it
      setActiveReplyId(null)
      setReplyInputValues(prev => {
        const updated = { ...prev }
        delete updated[parentComment.id]
        return updated
      })
      setReplyFiles(prev => {
        const updated = { ...prev }
        delete updated[parentComment.id]
        return updated
      })
      setReplyFilePreviews(prev => {
        const updated = { ...prev }
        delete updated[parentComment.id]
        return updated
      })
      showToast('Reply sent!', 'success')

      // Send notifications to mentioned users and parent comment author
      const commenterName = profile?.full_name || user?.email?.split('@')[0] || 'Someone'
      const notifyUserIds = new Set<string>()

      // Add mentioned users
      const mentionedUserIds = extractMentions(inputValue)
      mentionedUserIds.forEach(id => {
        if (id !== user.id) {
          notifyUserIds.add(id)
        }
      })

      // Add parent comment author (if not commenter)
      if (parentComment.user_id !== user.id) {
        notifyUserIds.add(parentComment.user_id)
      }

      // Send notification to each user
      for (const notifyUserId of notifyUserIds) {
        const isMentioned = mentionedUserIds.includes(notifyUserId)
        await createNotification({
          user_id: notifyUserId,
          type: isMentioned ? 'mention' : 'comment',
          title: isMentioned ? 'You were mentioned' : 'New Reply',
          message: isMentioned
            ? `${commenterName} mentioned you on "${task.title}"`
            : `${commenterName} replied to your comment on "${task.title}"`,
          is_read: false,
          task_id: task.id,
          board_id: task.board_id
        })
      }
    } else {
      showToast('Failed to add reply', 'error')
    }

    setLoading(false)
  }

  // Copy comment text
  const handleCopyComment = async (comment: TaskComment) => {
    try {
      await navigator.clipboard.writeText(comment.content)
      showToast('Comment copied!', 'success')
    } catch (err) {
      showToast('Failed to copy', 'error')
    }
  }

  // Pin/Unpin comment
  const handlePinComment = (commentId: string) => {
    setPinnedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
        showToast('Comment unpinned', 'info')
      } else {
        newSet.add(commentId)
        showToast('Comment pinned', 'success')
      }
      return newSet
    })
  }

  // Check if user can pin (admin or task owner)
  const canPin = () => {
    return isTaskOwner
  }

  const handleAddComment = async () => {
    if (!task || !user || (!commentInput.trim() && commentFiles.length === 0)) return

    console.log('[Comment] Starting to add comment...')

    setLoading(true)

    // Upload all files
    const uploadedUrls: string[] = []
    for (const file of commentFiles) {
      const { data: attachmentData, error: uploadError } = await uploadTaskAttachment(
        task.id,
        user.id,
        file
      )

      if (uploadError) {
        showToast(`Failed to upload ${file.name}`, 'error')
        continue
      }

      if (attachmentData) {
        uploadedUrls.push(attachmentData.file_url)
      }
    }

    // Create comment with first file URL (for backward compatibility) and attachment URLs
    const { data, error } = await createTaskComment({
      task_id: task.id,
      user_id: user.id,
      content: commentInput.trim() || (uploadedUrls.length > 0 ? '📎 Shared file(s)' : ''),
      image_url: uploadedUrls[0] || null,
      parent_id: replyingTo?.id || null,
      is_pinned: false
    })

    if (!error && data) {
      setComments([...comments, data])
      setCommentInput('')
      setCommentFiles([])
      setCommentFilePreviews([])
      setShowMentionList(false)
      setReplyingTo(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      showToast(replyingTo ? 'Reply sent!' : 'Comment added!', 'success')

      // Send notifications to task owner, assignees, and mentioned users (except commenter)
      const commenterName = profile?.full_name || user?.email?.split('@')[0] || 'Someone'
      const notifyUserIds = new Set<string>()

      // Add mentioned users
      const mentionedUserIds = extractMentions(commentInput)
      mentionedUserIds.forEach(id => {
        if (id !== user.id) {
          notifyUserIds.add(id)
        }
      })

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

        // Check if this user was mentioned
        const isMentioned = mentionedUserIds.includes(notifyUserId)

        const { data: notifData, error: notifError } = await createNotification({
          user_id: notifyUserId,
          type: isMentioned ? 'mention' : 'comment',
          title: isMentioned ? 'You were mentioned' : 'New Comment',
          message: isMentioned
            ? `${commenterName} mentioned you on "${task.title}"`
            : `${commenterName} commented on "${task.title}"`,
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

  // Attachment handlers
  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !task || !user) return

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      showToast('File must be less than 10MB', 'error')
      return
    }

    setUploadingAttachment(true)
    const { data, error } = await uploadTaskAttachment(task.id, user.id, file)
    setUploadingAttachment(false)

    if (error) {
      showToast('Failed to upload file', 'error')
      return
    }

    if (data) {
      setAttachments([data, ...attachments])
      showToast('File uploaded!', 'success')
    }

    // Reset input
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = ''
    }
  }

  const handleDownloadAttachment = (attachment: TaskAttachment) => {
    // Create a temporary link and trigger download
    const link = window.document.createElement('a')
    link.href = attachment.file_url
    link.download = attachment.file_name
    link.target = '_blank'
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Delete this attachment?')) return

    const { error } = await deleteTaskAttachment(attachmentId)
    if (!error) {
      setAttachments(attachments.filter(a => a.id !== attachmentId))
      showToast('Attachment deleted', 'info')
    } else {
      showToast('Failed to delete attachment', 'error')
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FiImage />
    if (fileType.includes('pdf')) return <FiFile />
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return <FiPaperclip />
    if (fileType.includes('doc') || fileType.includes('word')) return <FiFile />
    if (fileType.includes('xls') || fileType.includes('excel')) return <FiFile />
    return <FiPaperclip />
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    // Just now (less than 1 minute)
    if (diffSeconds < 60) {
      return 'sekarang'
    }

    // Less than 1 hour
    if (diffMinutes < 60) {
      return `${diffMinutes} menit lalu`
    }

    // Less than 24 hours
    if (diffHours < 24) {
      return `${diffHours} jam lalu`
    }

    // Less than 7 days
    if (diffDays < 7) {
      return `${diffDays} hari lalu`
    }

    // More than 7 days - show date
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
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

          {/* Time Tracker */}
          <div className={styles.section}>
            <TimeTracker
              taskId={task.id}
              timerStartedAt={task.timer_started_at}
              timerUserId={task.timer_user_id}
              onTimerUpdate={loadTasks}
            />
          </div>

          {/* Task Dependencies */}
          <div className={styles.section}>
            <TaskDependencies
              taskId={task.id}
              boardId={task.board_id}
            />
          </div>

          {/* Attachments Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <FiPaperclip />
              <span>Attachments ({attachments.length})</span>
              <input
                ref={attachmentInputRef}
                type="file"
                onChange={handleAttachmentSelect}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z,.txt,.jpg,.jpeg,.png,.gif,.svg"
              />
              <button
                className={styles.uploadBtn}
                onClick={() => attachmentInputRef.current?.click()}
                disabled={uploadingAttachment}
                title="Upload file"
              >
                {uploadingAttachment ? 'Uploading...' : '+ Add File'}
              </button>
            </div>
            {attachments.length > 0 ? (
              <div className={styles.attachmentsList}>
                {attachments.map(attachment => (
                  <div key={attachment.id} className={styles.attachmentItem}>
                    <div className={styles.attachmentIcon}>
                      {getFileIcon(attachment.file_type)}
                    </div>
                    <div className={styles.attachmentInfo}>
                      <span className={styles.attachmentName}>{attachment.file_name}</span>
                      <span className={styles.attachmentSize}>{formatFileSize(attachment.file_size)}</span>
                    </div>
                    <div className={styles.attachmentActions}>
                      <button
                        className={styles.downloadBtn}
                        onClick={() => handleDownloadAttachment(attachment)}
                        title="Download"
                      >
                        <FiDownload />
                      </button>
                      {isTaskOwner && (
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noAttachments}>No attachments yet. Upload files to attach to this task.</p>
            )}
          </div>

          {/* Comments Section */}
          <div className={styles.commentsSection}>
            <div className={styles.sectionHeader}>
              <FiMessageCircle />
              <span>Comments ({comments.length})</span>
            </div>

            <div className={styles.comments}>
              {(() => {
                // Separate parent comments and replies
                const parentComments = comments.filter(c => !c.parent_id)

                // Sort parent comments: pinned first, others keep original order
                const sortedParents = [...parentComments].sort((a, b) => {
                  const aPinned = pinnedComments.has(a.id)
                  const bPinned = pinnedComments.has(b.id)
                  if (aPinned && !bPinned) return -1
                  if (!aPinned && bPinned) return 1
                  return 0
                })

                if (sortedParents.length === 0) return <p className={styles.noComments}>No comments yet</p>

                // Recursive function to render a comment and its replies
                const renderComment = (comment: TaskComment, depth: number = 0): JSX.Element => {
                  const authorName = getCommentAuthorName(comment.user_id)
                  const isPinned = pinnedComments.has(comment.id) && depth === 0
                  const isReply = depth > 0
                  const replyInputValue = replyInputValues[comment.id] || ''

                  // Get replies for this comment
                  const commentReplies = comments.filter(r => r.parent_id === comment.id)
                  const maxDepth = 3 // Limit nesting depth for readability

                  // Show reply input if: user clicked Reply OR comment already has replies
                  const showReplyInput = activeReplyId === comment.id || commentReplies.length > 0

                  return (
                    <div key={comment.id} className={styles.commentThread}>
                      <div className={`${isReply ? styles.reply : styles.comment} ${isPinned ? styles.pinned : ''}`}>
                        {isPinned && (
                          <div className={styles.pinBadge}>
                            <FiAward /> Pinned
                          </div>
                        )}
                        <div className={styles.commentAvatar}>
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.commentBody}>
                          <div className={styles.commentHeader}>
                            <span className={styles.commentAuthor}>{authorName}</span>
                            <span className={styles.commentTime}>{formatTime(comment.created_at)}</span>
                          </div>
                          {comment.content && (
                            <p className={styles.commentText}>{renderCommentText(comment.content)}</p>
                          )}
                          {comment.image_url && (
                            <img
                              src={comment.image_url}
                              alt="Comment image"
                              className={styles.commentImage}
                              onClick={() => window.open(comment.image_url!, '_blank')}
                            />
                          )}
                          {/* Comment Actions */}
                          <div className={styles.commentActions}>
                            <button
                              className={styles.commentActionBtn}
                              onClick={() => handleReply(comment)}
                              title="Reply"
                            >
                              <FiCornerDownLeft /> Reply
                            </button>
                            <button
                              className={styles.commentActionBtn}
                              onClick={() => handleCopyComment(comment)}
                              title="Copy"
                            >
                              <FiCopy /> Copy
                            </button>
                            {!isReply && canPin() && (
                              <button
                                className={`${styles.commentActionBtn} ${isPinned ? styles.pinnedAction : ''}`}
                                onClick={() => handlePinComment(comment.id)}
                                title={isPinned ? 'Unpin' : 'Pin'}
                              >
                                <FiAward /> {isPinned ? 'Unpin' : 'Pin'}
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>

                      {/* Nested Replies (recursive) */}
                      {commentReplies.length > 0 && depth < maxDepth && (
                        <div className={styles.replies}>
                          {commentReplies.map(reply => renderComment(reply, depth + 1))}
                        </div>
                      )}

                      {/* Inline Reply Input - Below the replies */}
                      {showReplyInput && (
                        <div className={styles.inlineReplyInput}>
                          <div className={styles.inlineReplyAvatar}>
                            {(profile?.full_name || user?.email?.split('@')[0] || 'Y').charAt(0).toUpperCase()}
                          </div>
                          <div className={styles.inlineReplyBody}>
                            {/* File Previews */}
                            {(replyFilePreviews[comment.id] || []).length > 0 && (
                              <div className={styles.inlineReplyFiles}>
                                {(replyFilePreviews[comment.id] || []).map((file, idx) => (
                                  <div key={idx} className={styles.inlineReplyFilePreview}>
                                    {file.preview ? (
                                      <img src={file.preview} alt={file.name} />
                                    ) : (
                                      <div className={styles.fileIconSmall}>
                                        <FiPaperclip />
                                      </div>
                                    )}
                                    <span>{file.name}</span>
                                    <button onClick={() => removeReplyFile(comment.id, idx)}>
                                      <FiX />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Input Row */}
                            <div className={styles.inlineReplyContent}>
                              <input
                                type="text"
                                value={replyInputValue}
                                onChange={(e) => updateReplyInput(comment.id, e.target.value)}
                                placeholder="Write a reply..."
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleInlineReplySubmit(comment)
                                  }
                                  if (e.key === 'Escape') {
                                    cancelReply(comment.id)
                                  }
                                }}
                              />
                              {/* Emoji Picker for Reply */}
                              <div className={styles.emojiPickerWrapper}>
                                <button
                                  className={styles.inlineReplyEmoji}
                                  onClick={() => setShowReplyEmojiPicker(showReplyEmojiPicker === comment.id ? null : comment.id)}
                                  title="Add emoji"
                                >
                                  <FiSmile />
                                </button>
                                {showReplyEmojiPicker === comment.id && (
                                  <div className={styles.emojiPicker}>
                                    {EMOJIS.map(emoji => (
                                      <button
                                        key={emoji}
                                        className={styles.emojiBtn}
                                        onClick={() => insertEmojiToReply(comment.id, emoji)}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <input
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z,.txt,.jpg,.jpeg,.png,.gif,.svg"
                                onChange={(e) => handleReplyFileSelect(comment.id, e)}
                                style={{ display: 'none' }}
                                id={`reply-file-${comment.id}`}
                              />
                              <button
                                className={styles.inlineReplyAttach}
                                onClick={() => document.getElementById(`reply-file-${comment.id}`)?.click()}
                                title="Attach file"
                              >
                                <FiPaperclip />
                              </button>
                              <button
                                className={styles.inlineReplySend}
                                onClick={() => handleInlineReplySubmit(comment)}
                                disabled={(!replyInputValue.trim() && (replyFiles[comment.id] || []).length === 0) || loading}
                              >
                                <FiSend />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                return sortedParents.map(comment => renderComment(comment, 0))
              })()}
            </div>
          </div>
        </div>

        {/* Bottom Input Area - For new comments only */}
        <div className={styles.inputArea}>
          {commentFilePreviews.length > 0 && (
            <div className={styles.filePreviews}>
              {commentFilePreviews.map((file, index) => (
                <div key={index} className={styles.filePreviewItem}>
                  {file.preview ? (
                    <img src={file.preview} alt={file.name} />
                  ) : (
                    <div className={styles.filePreviewIcon}>
                      <FiPaperclip />
                    </div>
                  )}
                  <div className={styles.filePreviewInfo}>
                    <span className={styles.filePreviewName}>{file.name}</span>
                    <span className={styles.filePreviewSize}>{formatFileSize(file.size)}</span>
                  </div>
                  <button onClick={() => removeCommentFile(index)}>
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className={styles.inputRowWrapper}>
            {/* Mention Dropdown */}
            {showMentionList && filteredMentionUsers.length > 0 && (
              <div className={styles.mentionDropdown}>
                {filteredMentionUsers.slice(0, 5).map(u => (
                  <button
                    key={u.id}
                    className={styles.mentionItem}
                    onClick={() => insertMention(u)}
                    type="button"
                  >
                    <FiAtSign />
                    <span>{u.name}</span>
                    <span className={styles.mentionEmail}>{u.email}</span>
                  </button>
                ))}
              </div>
            )}
            <div className={styles.inputRow}>
              <input
                ref={commentInputRef}
                type="text"
                value={commentInput}
                onChange={handleCommentInput}
                placeholder="Write a comment... (use @ to mention)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !showMentionList) {
                    handleAddComment()
                  }
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z,.txt,.jpg,.jpeg,.png,.gif,.svg"
                onChange={handleCommentFileSelect}
                style={{ display: 'none' }}
              />
              <div className={styles.inputActions}>
                {/* Emoji Picker */}
                <div className={styles.emojiPickerWrapper}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Add emoji"
                  >
                    <FiSmile />
                  </button>
                  {showEmojiPicker && (
                    <div className={styles.emojiPicker}>
                      {EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          className={styles.emojiBtn}
                          onClick={() => insertEmojiToComment(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className={styles.actionBtn}
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                >
                  <FiPaperclip />
                </button>
                <button
                  className={styles.sendBtn}
                  onClick={handleAddComment}
                  disabled={loading || (!commentInput.trim() && commentFiles.length === 0)}
                >
                  <FiSend />
                </button>
              </div>
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
