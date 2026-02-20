import { supabase } from './supabase'
import type {
  Board, Column, Task, TaskInsert, TaskUpdate, TagInsert, SubtaskInsert, SubtaskUpdate,
  ProjectInsert, ProjectUpdate,
  LabelInsert, LabelUpdate, TaskLabelInsert,
  StarredTaskInsert,
  TeamMemberInsert, TeamMemberUpdate,
  NotificationInsert,
  UserSettingsInsert, UserSettingsUpdate,
  TaskCommentInsert, TaskCommentUpdate,
  TaskAttachmentInsert
} from '../types/database'

// ==================== AUTH ====================
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export const signUpWithEmail = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  })
  return { data, error }
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google'
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  return { data, error }
}

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}

// ==================== PROFILE ====================
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export const getAllProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')
  return { data, error }
}

export const getProfileByEmail = async (email: string) => {
  console.log('[getProfileByEmail] Looking up email:', email)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle()

  console.log('[getProfileByEmail] Result:', data ? 'found' : 'not found', 'error:', error)
  return { data, error }
}

export const createProfile = async (userId: string, email: string, fullName?: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: fullName || email?.split('@')[0]
    })
    .select()
    .single()
  return { data, error }
}

export const updateProfile = async (userId: string, updates: { full_name?: string; avatar_url?: string }) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

export const uploadAvatar = async (userId: string, file: File) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/avatar.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true })

  if (uploadError) {
    return { error: uploadError }
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
  return { url: data.publicUrl, error: null }
}

// ==================== BOARD ====================
export const getBoard = async (userId: string) => {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle()
  return { data, error }
}

export const createBoard = async (userId: string, title: string = 'My Kanban Board') => {
  const { data, error } = await supabase
    .from('boards')
    .insert({
      user_id: userId,
      title,
      is_default: true
    })
    .select()
    .single()
  return { data, error }
}

// ==================== COLUMNS ====================
export const getColumns = async (boardId: string) => {
  const { data, error } = await supabase
    .from('columns')
    .select('*')
    .eq('board_id', boardId)
    .order('position')
  return { data, error }
}

export const getColumnById = async (columnId: string) => {
  const { data, error } = await supabase
    .from('columns')
    .select('*')
    .eq('id', columnId)
    .single()
  return { data, error }
}

export const createColumns = async (boardId: string) => {
  const columnsData = [
    { board_id: boardId, title: 'To Do', color: '#e94560', position: 0 },
    { board_id: boardId, title: 'In Progress', color: '#ffc107', position: 1 },
    { board_id: boardId, title: 'Review', color: '#00bcd4', position: 2 },
    { board_id: boardId, title: 'Done', color: '#4caf50', position: 3 },
    { board_id: boardId, title: 'Archive', color: '#6c757d', position: 4 }
  ]

  const { data, error } = await supabase
    .from('columns')
    .insert(columnsData)
    .select()
  return { data, error }
}

// ==================== TASKS ====================
export const getTasks = async (boardId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      tags (*),
      subtasks (*),
      task_labels (
        id,
        label_id,
        labels (*)
      ),
      projects (*)
    `)
    .eq('board_id', boardId)
    .order('position')

  if (error || !data) {
    return { data, error }
  }

  // Fetch task_assignees separately (without nested profiles - we'll get profiles separately)
  const tasksWithAssignees = await Promise.all(
    data.map(async (task) => {
      const { data: assignees } = await supabase
        .from('task_assignees')
        .select('id, user_id')
        .eq('task_id', task.id)

      // Get profiles for each assignee
      let assigneesWithProfiles = []
      if (assignees && assignees.length > 0) {
        const userIds = assignees.map(a => a.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        assigneesWithProfiles = assignees.map(a => ({
          ...a,
          profiles: profiles?.find(p => p.id === a.user_id) || null
        }))
      }

      return {
        ...task,
        task_assignees: assigneesWithProfiles
      }
    })
  )

  return { data: tasksWithAssignees, error: null }
}

// Get tasks assigned to a specific user (from task_assignees table)
export const getAssignedTasks = async (userId: string) => {
  // First get task_ids from task_assignees
  const { data: assigneeRecords, error: assigneeError } = await supabase
    .from('task_assignees')
    .select('task_id')
    .eq('user_id', userId)

  if (assigneeError) {
    return { data: [], error: assigneeError }
  }

  if (!assigneeRecords || assigneeRecords.length === 0) {
    return { data: [], error: null }
  }

  const taskIds = assigneeRecords.map(a => a.task_id)

  // Then get the tasks
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      tags (*),
      subtasks (*),
      task_labels (
        id,
        label_id,
        labels (*)
      ),
      projects (*)
    `)
    .in('id', taskIds)
    .order('position')

  if (error || !data) {
    return { data, error }
  }

  // Fetch task_assignees separately
  const tasksWithAssignees = await Promise.all(
    data.map(async (task) => {
      const { data: assignees } = await supabase
        .from('task_assignees')
        .select('id, user_id')
        .eq('task_id', task.id)

      // Get profiles for each assignee
      let assigneesWithProfiles = []
      if (assignees && assignees.length > 0) {
        const userIds = assignees.map(a => a.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        assigneesWithProfiles = assignees.map(a => ({
          ...a,
          profiles: profiles?.find(p => p.id === a.user_id) || null
        }))
      }

      return {
        ...task,
        task_assignees: assigneesWithProfiles
      }
    })
  )

  return { data: tasksWithAssignees, error: null }
}

export const createTask = async (task: TaskInsert) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()
  return { data, error }
}

export const updateTask = async (taskId: string, updates: TaskUpdate) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single()
  return { data, error }
}

export const deleteTask = async (taskId: string) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
  return { error }
}

// ==================== TAGS ====================
export const createTag = async (tag: TagInsert) => {
  const { data, error } = await supabase
    .from('tags')
    .insert(tag)
    .select()
    .single()
  return { data, error }
}

export const deleteTagsByTask = async (taskId: string) => {
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('task_id', taskId)
  return { error }
}

export const updateTags = async (taskId: string, tags: string[]) => {
  // Delete existing tags
  await deleteTagsByTask(taskId)

  // Insert new tags
  for (const tag of tags) {
    await createTag({ task_id: taskId, name: tag })
  }
}

// ==================== SUBTASKS ====================
export const createSubtask = async (subtask: SubtaskInsert) => {
  const { data, error } = await supabase
    .from('subtasks')
    .insert(subtask)
    .select()
    .single()
  return { data, error }
}

export const updateSubtask = async (subtaskId: string, updates: SubtaskUpdate) => {
  console.log('[updateSubtask] Updating subtask:', subtaskId, 'with:', updates)
  const { data, error } = await supabase
    .from('subtasks')
    .update(updates)
    .eq('id', subtaskId)
    .select()
    .single()

  if (error) {
    console.error('[updateSubtask] Error:', error)
  }

  return { data, error }
}

export const deleteSubtask = async (subtaskId: string) => {
  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', subtaskId)
  return { error }
}

export const getSubtasks = async (taskId: string) => {
  const { data, error } = await supabase
    .from('subtasks')
    .select('*')
    .eq('task_id', taskId)
    .order('position')
  return { data, error }
}

export const updateSubtasks = async (taskId: string, subtasks: { id?: string; title: string; is_completed?: boolean }[]) => {
  // Get existing subtasks
  const { data: existing } = await getSubtasks(taskId)

  // Delete removed subtasks
  const existingIds = existing?.map(s => s.id) || []
  const newIds = subtasks.filter(s => s.id).map(s => s.id)

  for (const id of existingIds) {
    if (!newIds.includes(id)) {
      await deleteSubtask(id)
    }
  }

  // Upsert subtasks
  for (let i = 0; i < subtasks.length; i++) {
    const subtask = subtasks[i]
    if (subtask.id) {
      await updateSubtask(subtask.id, {
        title: subtask.title,
        is_completed: subtask.is_completed || false,
        position: i
      })
    } else {
      await createSubtask({
        task_id: taskId,
        title: subtask.title,
        is_completed: subtask.is_completed || false,
        position: i
      })
    }
  }
}

// ==================== REALTIME ====================
export const subscribeToBoardChanges = (
  boardId: string,
  onTaskChange: () => void,
  onConnectionChange: (connected: boolean) => void
) => {
  return supabase
    .channel('kanban-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tasks',
      filter: `board_id=eq.${boardId}`
    }, () => {
      onTaskChange()
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tags'
    }, () => {
      onTaskChange()
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'subtasks'
    }, () => {
      onTaskChange()
    })
    .subscribe((status) => {
      onConnectionChange(status === 'SUBSCRIBED')
    })
}

// ==================== EXPORT ====================
export const exportData = (board: Board, columns: Column[], tasks: Task[]) => {
  const data = {
    board,
    columns,
    tasks,
    exportedAt: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kanban-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ==================== PROJECTS ====================
export const getProjects = async (userId: string) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  return { data, error }
}

export const getProjectsWithTaskCount = async (userId: string) => {
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (projectsError || !projects) {
    return { data: null, error: projectsError }
  }

  // Get task counts for each project
  const projectsWithCount = await Promise.all(
    projects.map(async (project) => {
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id)

      return {
        ...project,
        task_count: count || 0
      }
    })
  )

  return { data: projectsWithCount, error: null }
}

export const createProject = async (project: ProjectInsert) => {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single()
  return { data, error }
}

export const updateProject = async (projectId: string, updates: ProjectUpdate) => {
  console.log('[updateProject] Updating project:', projectId, 'with:', updates)
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single()

  if (error) {
    console.error('[updateProject] Error:', error)
  } else {
    console.log('[updateProject] Success:', data)
  }

  return { data, error }
}

export const deleteProject = async (projectId: string) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
  return { error }
}

// ==================== LABELS ====================
export const getLabels = async (userId: string) => {
  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .eq('user_id', userId)
    .order('name')
  return { data, error }
}

export const getLabelWithTaskCount = async (userId: string) => {
  const { data: labels, error: labelsError } = await supabase
    .from('labels')
    .select('*')
    .eq('user_id', userId)
    .order('name')

  if (labelsError || !labels) {
    return { data: null, error: labelsError }
  }

  // Get task counts for each label
  const labelsWithCount = await Promise.all(
    labels.map(async (label) => {
      const { count } = await supabase
        .from('task_labels')
        .select('*', { count: 'exact', head: true })
        .eq('label_id', label.id)

      return {
        ...label,
        task_count: count || 0
      }
    })
  )

  return { data: labelsWithCount, error: null }
}

export const createLabel = async (label: LabelInsert) => {
  const { data, error } = await supabase
    .from('labels')
    .insert(label)
    .select()
    .single()
  return { data, error }
}

export const updateLabel = async (labelId: string, updates: LabelUpdate) => {
  const { data, error } = await supabase
    .from('labels')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', labelId)
    .select()
    .single()
  return { data, error }
}

export const deleteLabel = async (labelId: string) => {
  const { error } = await supabase
    .from('labels')
    .delete()
    .eq('id', labelId)
  return { error }
}

// ==================== TASK LABELS ====================
export const addTaskLabel = async (taskLabel: TaskLabelInsert) => {
  const { data, error } = await supabase
    .from('task_labels')
    .insert(taskLabel)
    .select()
    .single()
  return { data, error }
}

export const removeTaskLabel = async (taskId: string, labelId: string) => {
  const { error } = await supabase
    .from('task_labels')
    .delete()
    .eq('task_id', taskId)
    .eq('label_id', labelId)
  return { error }
}

export const removeAllTaskLabels = async (taskId: string) => {
  const { error } = await supabase
    .from('task_labels')
    .delete()
    .eq('task_id', taskId)
  return { error }
}

export const updateTaskLabels = async (taskId: string, labelIds: string[]) => {
  // Remove existing task labels
  await removeAllTaskLabels(taskId)

  // Add new task labels
  for (const labelId of labelIds) {
    await addTaskLabel({ task_id: taskId, label_id: labelId })
  }
}

// ==================== STARRED TASKS ====================
export const getStarredTasks = async (userId: string) => {
  const { data, error } = await supabase
    .from('starred_tasks')
    .select(`
      *,
      tasks (*)
    `)
    .eq('user_id', userId)
  return { data, error }
}

export const getStarredTaskIds = async (userId: string) => {
  console.log('[getStarredTaskIds] Fetching starred tasks for user:', userId)

  const { data, error } = await supabase
    .from('starred_tasks')
    .select('task_id')
    .eq('user_id', userId)

  console.log('[getStarredTaskIds] Raw data from DB:', data)
  console.log('[getStarredTaskIds] Error:', error)

  if (error) {
    console.error('[getStarredTaskIds] Error:', error)
  }

  const taskIds = data?.map(s => s.task_id) || []
  console.log('[getStarredTaskIds] Extracted task IDs:', taskIds)

  return { data: taskIds, error }
}

export const addStarredTask = async (starredTask: StarredTaskInsert) => {
  const { data, error } = await supabase
    .from('starred_tasks')
    .insert(starredTask)
    .select()
    .single()

  if (error) {
    console.error('[addStarredTask] Error:', error)
  }

  return { data, error }
}

export const removeStarredTask = async (userId: string, taskId: string) => {
  const { error } = await supabase
    .from('starred_tasks')
    .delete()
    .eq('user_id', userId)
    .eq('task_id', taskId)

  if (error) {
    console.error('[removeStarredTask] Error:', error)
  }

  return { error }
}

export const toggleStarredTask = async (userId: string, taskId: string) => {
  console.log('[toggleStarredTask] Called with userId:', userId, 'taskId:', taskId)

  // Check if already starred
  const { data: existing, error: checkError } = await supabase
    .from('starred_tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .maybeSingle()

  if (checkError) {
    console.error('[toggleStarredTask] Check error:', checkError)
    return { starred: false, error: checkError }
  }

  console.log('[toggleStarredTask] Existing record:', existing)

  if (existing) {
    // Remove star
    const { error } = await supabase
      .from('starred_tasks')
      .delete()
      .eq('id', existing.id)

    if (error) {
      console.error('[toggleStarredTask] Delete error:', error)
    } else {
      console.log('[toggleStarredTask] Star removed successfully')
    }

    return { starred: false, error }
  } else {
    // Add star
    const { error } = await supabase
      .from('starred_tasks')
      .insert({ user_id: userId, task_id: taskId })

    if (error) {
      console.error('[toggleStarredTask] Insert error:', error)
    } else {
      console.log('[toggleStarredTask] Star added successfully')
    }

    return { starred: true, error }
  }
}

// ==================== TEAM MEMBERS ====================
export const getTeamMembers = async (userId: string) => {
  console.log('[getTeamMembers] Fetching members for user:', userId)
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('user_id', userId)
    .order('name')

  console.log('[getTeamMembers] Result - data:', data?.length || 0, 'members, error:', error)

  return { data, error }
}

export const createTeamMember = async (member: TeamMemberInsert) => {
  const { data, error } = await supabase
    .from('team_members')
    .insert(member)
    .select()
    .single()
  return { data, error }
}

export const updateTeamMember = async (memberId: string, updates: TeamMemberUpdate) => {
  const { data, error } = await supabase
    .from('team_members')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .select()
    .single()
  return { data, error }
}

export const deleteTeamMember = async (memberId: string) => {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', memberId)
  return { error }
}

// Link team member to auth user (called on login)
export const linkTeamMemberByAuth = async (authUserId: string, email: string) => {
  console.log('[linkTeamMemberByAuth] Linking:', email, 'to auth user:', authUserId)

  // Find team member by email (case insensitive)
  const { data: members, error: findError } = await supabase
    .from('team_members')
    .select('*')
    .ilike('email', email)
    .is('auth_user_id', null)

  if (findError) {
    console.error('[linkTeamMemberByAuth] Find error:', findError)
    return { error: findError }
  }

  if (!members || members.length === 0) {
    console.log('[linkTeamMemberByAuth] No pending members found for:', email)
    return { error: null }
  }

  console.log('[linkTeamMemberByAuth] Found', members.length, 'members to link')

  // Update each matching member
  for (const member of members) {
    const { error: updateError } = await supabase
      .from('team_members')
      .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
      .eq('id', member.id)

    if (updateError) {
      console.error('[linkTeamMemberByAuth] Update error for', member.id, ':', updateError)
    } else {
      console.log('[linkTeamMemberByAuth] Successfully linked member:', member.id)
    }
  }

  return { error: null }
}

// ==================== NOTIFICATIONS ====================
export const getNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const createNotification = async (notification: NotificationInsert) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single()
  return { data, error }
}

export const markNotificationAsRead = async (notificationId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single()
  return { data, error }
}

export const markAllNotificationsAsRead = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  return { data, error }
}

export const deleteNotification = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
  return { error }
}

// ==================== USER SETTINGS ====================
export const getUserSettings = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return { data, error }
}

export const createUserSettings = async (settings: UserSettingsInsert) => {
  const { data, error } = await supabase
    .from('user_settings')
    .insert(settings)
    .select()
    .single()
  return { data, error }
}

export const updateUserSettings = async (userId: string, updates: UserSettingsUpdate) => {
  const { data, error } = await supabase
    .from('user_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()
  return { data, error }
}

export const upsertUserSettings = async (settings: UserSettingsInsert & { id?: string }) => {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(settings, { onConflict: 'user_id' })
    .select()
    .single()
  return { data, error }
}

// ==================== TASK COMMENTS ====================
export const getTaskComments = async (taskId: string) => {
  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  return { data, error }
}

export const createTaskComment = async (comment: TaskCommentInsert) => {
  const { data, error } = await supabase
    .from('task_comments')
    .insert(comment)
    .select()
    .single()
  return { data, error }
}

export const updateTaskComment = async (commentId: string, updates: TaskCommentUpdate) => {
  const { data, error } = await supabase
    .from('task_comments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select()
    .single()
  return { data, error }
}

export const deleteTaskComment = async (commentId: string) => {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId)
  return { error }
}

// ==================== TASK ATTACHMENTS ====================
export const getTaskAttachments = async (taskId: string) => {
  const { data, error } = await supabase
    .from('task_attachments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const createTaskAttachment = async (attachment: TaskAttachmentInsert) => {
  const { data, error } = await supabase
    .from('task_attachments')
    .insert(attachment)
    .select()
    .single()
  return { data, error }
}

export const deleteTaskAttachment = async (attachmentId: string) => {
  const { error } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', attachmentId)
  return { error }
}

export const uploadTaskAttachment = async (taskId: string, userId: string, file: File) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${taskId}/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(fileName, file)

  if (uploadError) {
    return { error: uploadError }
  }

  const { data } = supabase.storage.from('attachments').getPublicUrl(fileName)

  // Create attachment record
  const { data: attachment, error: dbError } = await createTaskAttachment({
    task_id: taskId,
    user_id: userId,
    file_name: file.name,
    file_url: data.publicUrl,
    file_type: file.type,
    file_size: file.size
  })

  return { data: attachment, error: dbError }
}

// ==================== TASK ASSIGNEES ====================
export const addTaskAssignee = async (taskId: string, userId: string) => {
  const { data, error } = await supabase
    .from('task_assignees')
    .insert({ task_id: taskId, user_id: userId })
    .select()
    .single()
  return { data, error }
}

export const removeTaskAssignee = async (taskId: string, userId: string) => {
  const { error } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', userId)
  return { error }
}

export const removeAllTaskAssignees = async (taskId: string) => {
  const { error } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', taskId)
  return { error }
}

export const updateTaskAssignees = async (taskId: string, userIds: string[]) => {
  // Remove existing assignees
  await removeAllTaskAssignees(taskId)

  // Add new assignees
  for (const userId of userIds) {
    await addTaskAssignee(taskId, userId)
  }
}
