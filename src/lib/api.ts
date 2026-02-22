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
  TaskAttachmentInsert,
  TimeEntry, TimeEntryInsert,
  TaskDependency, TaskDependencyInsert,
  RecurringPattern, RecurringPatternInsert, RecurringPatternUpdate,
  TaskTemplate, TaskTemplateInsert, TaskTemplateUpdate,
  ActivityLog, ActivityLogInsert,
  BoardMember, BoardMemberInsert, BoardMemberUpdate
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
    .maybeSingle()
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
      const assigneesWithProfiles: { id: string; user_id: string; profiles: any }[] = []
      if (assignees && assignees.length > 0) {
        const userIds = assignees.map(a => a.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        for (const a of assignees) {
          assigneesWithProfiles.push({
            ...a,
            profiles: profiles?.find(p => p.id === a.user_id) || null
          })
        }
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
      const assigneesWithProfiles: { id: string; user_id: string; profiles: any }[] = []
      if (assignees && assignees.length > 0) {
        const userIds = assignees.map(a => a.user_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        for (const a of assignees) {
          assigneesWithProfiles.push({
            ...a,
            profiles: profiles?.find(p => p.id === a.user_id) || null
          })
        }
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
  console.log('[createNotification] Inserting:', JSON.stringify(notification))
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single()
  console.log('[createNotification] Result:', { data, error })
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

// ==================== TEAM INVITATIONS ====================

// Get pending invitations for current user (by email)
export const getPendingInvitations = async (email: string) => {
  const { data, error } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('email', email)
    .eq('status', 'pending')
    .order('invited_at', { ascending: false })

  return { data, error }
}

// Get all invitations sent by a user (team owner)
export const getSentInvitations = async (userId: string) => {
  const { data, error } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('team_owner_id', userId)
    .order('invited_at', { ascending: false })

  return { data, error }
}

// Create a new invitation
export const createTeamInvitation = async (invitation: {
  team_owner_id: string
  email: string
  name: string
  role: 'admin' | 'member' | 'viewer'
}) => {
  console.log('[createTeamInvitation] Creating invitation:', invitation)

  // Check if already invited or already a member
  const { data: existingInvitation, error: checkError } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('email', invitation.email)
    .eq('team_owner_id', invitation.team_owner_id)
    .eq('status', 'pending')
    .maybeSingle()

  console.log('[createTeamInvitation] Existing check:', { existingInvitation, checkError })

  if (existingInvitation) {
    return { data: null, error: { message: 'User already invited' } }
  }

  const { data, error } = await supabase
    .from('team_invitations')
    .insert(invitation)
    .select()
    .single()

  console.log('[createTeamInvitation] Insert result:', { data, error })

  return { data, error }
}

// Accept an invitation
export const acceptTeamInvitation = async (invitationId: string) => {
  // Get the invitation
  const { data: invitation, error: fetchError } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('id', invitationId)
    .single()

  if (fetchError || !invitation) {
    return { error: fetchError || { message: 'Invitation not found' } }
  }

  // Update invitation status
  const { error: updateError } = await supabase
    .from('team_invitations')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString()
    })
    .eq('id', invitationId)

  if (updateError) {
    return { error: updateError }
  }

  // Get current user's ID to link
  const { data: { user } } = await supabase.auth.getUser()

  // Add to team_members with auth_user_id linked
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .insert({
      user_id: invitation.team_owner_id,
      name: invitation.name,
      email: invitation.email,
      role: invitation.role,
      status: 'online',
      auth_user_id: user?.id || null
    })
    .select()
    .single()

  console.log('[acceptTeamInvitation] Created member:', { member, memberError, auth_user_id: user?.id })

  return { data: member, error: memberError }
}

// Decline an invitation
export const declineTeamInvitation = async (invitationId: string) => {
  const { error } = await supabase
    .from('team_invitations')
    .update({
      status: 'declined',
      responded_at: new Date().toISOString()
    })
    .eq('id', invitationId)

  return { error }
}

// Cancel/Delete an invitation (by team owner)
export const cancelTeamInvitation = async (invitationId: string) => {
  const { error } = await supabase
    .from('team_invitations')
    .delete()
    .eq('id', invitationId)

  return { error }
}

// ==================== TIME TRACKING ====================
export const getTimeEntries = async (taskId: string) => {
  const { data, error } = await supabase
    .from('task_time_entries')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const createTimeEntry = async (entry: TimeEntryInsert) => {
  const { data, error } = await supabase
    .from('task_time_entries')
    .insert(entry)
    .select()
    .single()
  return { data, error }
}

export const updateTimeEntry = async (entryId: string, updates: Partial<TimeEntryInsert>) => {
  const { data, error } = await supabase
    .from('task_time_entries')
    .update(updates)
    .eq('id', entryId)
    .select()
    .single()
  return { data, error }
}

export const deleteTimeEntry = async (entryId: string) => {
  const { error } = await supabase
    .from('task_time_entries')
    .delete()
    .eq('id', entryId)
  return { error }
}

export const startTimeTracking = async (taskId: string, userId: string) => {
  const now = new Date().toISOString()

  // Start timer on task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .update({
      timer_started_at: now,
      timer_user_id: userId
    })
    .eq('id', taskId)
    .select()
    .single()

  if (taskError) return { data: null, error: taskError }

  return { data: task, error: null }
}

export const stopTimeTracking = async (taskId: string) => {
  // Get current timer state
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('timer_started_at, timer_user_id')
    .eq('id', taskId)
    .single()

  if (fetchError || !task) return { data: null, error: fetchError }

  if (!task.timer_started_at || !task.timer_user_id) {
    return { data: null, error: { message: 'No active timer' } }
  }

  const stoppedAt = new Date()
  const startedAt = new Date(task.timer_started_at)
  const durationSeconds = Math.floor((stoppedAt.getTime() - startedAt.getTime()) / 1000)

  // Create time entry
  const { data: entry, error: entryError } = await supabase
    .from('task_time_entries')
    .insert({
      task_id: taskId,
      user_id: task.timer_user_id,
      duration_seconds: durationSeconds,
      started_at: task.timer_started_at,
      stopped_at: stoppedAt.toISOString()
    })
    .select()
    .single()

  if (entryError) return { data: null, error: entryError }

  // Clear timer on task
  await supabase
    .from('tasks')
    .update({
      timer_started_at: null,
      timer_user_id: null
    })
    .eq('id', taskId)

  return { data: entry, error: null }
}

export const getTaskTimeSummary = async (taskId: string) => {
  const { data, error } = await supabase
    .from('task_time_entries')
    .select('duration_seconds')
    .eq('task_id', taskId)

  if (error) return { total: 0, error }

  const total = data?.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0) || 0
  return { total, error: null }
}

export const getUserTimeSummary = async (userId: string, startDate?: string, endDate?: string) => {
  let query = supabase
    .from('task_time_entries')
    .select('duration_seconds, task_id, tasks(title)')
    .eq('user_id', userId)

  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  const { data, error } = await query

  if (error) return { data: null, total: 0, error }

  const total = data?.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0) || 0
  return { data, total, error: null }
}

// ==================== TASK DEPENDENCIES ====================
export const getTaskDependencies = async (taskId: string) => {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select(`
      *,
      depends_on_task:tasks!task_dependencies_depends_on_task_id_fkey(id, title, due_date, priority)
    `)
    .eq('task_id', taskId)
  return { data, error }
}

export const getTaskDependents = async (taskId: string) => {
  const { data, error } = await supabase
    .from('task_dependencies')
    .select(`
      *,
      task:tasks!task_dependencies_task_id_fkey(id, title, due_date, priority)
    `)
    .eq('depends_on_task_id', taskId)
  return { data, error }
}

export const addTaskDependency = async (dependency: TaskDependencyInsert) => {
  const { data, error } = await supabase
    .from('task_dependencies')
    .insert(dependency)
    .select()
    .single()
  return { data, error }
}

export const removeTaskDependency = async (dependencyId: string) => {
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', dependencyId)
  return { error }
}

export const checkCircularDependency = async (taskId: string, dependsOnTaskId: string): Promise<boolean> => {
  // Check if dependsOnTaskId depends on taskId (directly or indirectly)
  const visited = new Set<string>()
  const queue = [dependsOnTaskId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (currentId === taskId) return true
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const { data } = await supabase
      .from('task_dependencies')
      .select('depends_on_task_id')
      .eq('task_id', currentId)

    if (data) {
      queue.push(...data.map(d => d.depends_on_task_id))
    }
  }

  return false
}

// ==================== RECURRING PATTERNS ====================
export const getRecurringPattern = async (taskId: string) => {
  const { data, error } = await supabase
    .from('recurring_patterns')
    .select('*')
    .eq('task_id', taskId)
    .maybeSingle()
  return { data, error }
}

export const getRecurringTasks = async (userId: string) => {
  const { data, error } = await supabase
    .from('recurring_patterns')
    .select(`
      *,
      tasks!recurring_patterns_task_id_fkey(*)
    `)
    .eq('tasks.user_id', userId)
    .eq('is_active', true)
  return { data, error }
}

export const createRecurringPattern = async (pattern: RecurringPatternInsert) => {
  const { data, error } = await supabase
    .from('recurring_patterns')
    .insert(pattern)
    .select()
    .single()
  return { data, error }
}

export const updateRecurringPattern = async (patternId: string, updates: RecurringPatternUpdate) => {
  const { data, error } = await supabase
    .from('recurring_patterns')
    .update(updates)
    .eq('id', patternId)
    .select()
    .single()
  return { data, error }
}

export const deleteRecurringPattern = async (patternId: string) => {
  const { error } = await supabase
    .from('recurring_patterns')
    .delete()
    .eq('id', patternId)
  return { error }
}

export const calculateNextOccurrence = (pattern: RecurringPattern): Date | null => {
  if (!pattern.is_active) return null

  const now = new Date()
  let next = pattern.next_occurrence ? new Date(pattern.next_occurrence) : new Date()

  switch (pattern.frequency) {
    case 'daily':
      next.setDate(next.getDate() + pattern.interval_value)
      break
    case 'weekly':
      if (pattern.days_of_week && pattern.days_of_week.length > 0) {
        // Find next day in days_of_week
        const currentDay = next.getDay()
        const sortedDays = [...pattern.days_of_week].sort((a, b) => a - b)
        let foundDay = sortedDays.find(d => d > currentDay)

        if (!foundDay) {
          // Move to next week
          next.setDate(next.getDate() + (7 - currentDay + sortedDays[0]))
        } else {
          next.setDate(next.getDate() + (foundDay - currentDay))
        }
      } else {
        next.setDate(next.getDate() + 7 * pattern.interval_value)
      }
      break
    case 'monthly':
      if (pattern.day_of_month) {
        next.setMonth(next.getMonth() + pattern.interval_value)
        next.setDate(pattern.day_of_month)
      } else {
        next.setMonth(next.getMonth() + pattern.interval_value)
      }
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + pattern.interval_value)
      break
  }

  // Check end date
  if (pattern.end_date && next > new Date(pattern.end_date)) {
    return null
  }

  return next
}

// ==================== TASK TEMPLATES ====================
export const getTaskTemplates = async (userId: string) => {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const getTaskTemplate = async (templateId: string) => {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('id', templateId)
    .single()
  return { data, error }
}

export const createTaskTemplate = async (template: TaskTemplateInsert) => {
  const { data, error } = await supabase
    .from('task_templates')
    .insert(template)
    .select()
    .single()
  return { data, error }
}

export const updateTaskTemplate = async (templateId: string, updates: TaskTemplateUpdate) => {
  const { data, error } = await supabase
    .from('task_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single()
  return { data, error }
}

export const deleteTaskTemplate = async (templateId: string) => {
  const { error } = await supabase
    .from('task_templates')
    .delete()
    .eq('id', templateId)
  return { error }
}

export const createTaskFromTemplate = async (
  templateId: string,
  overrides: {
    board_id: string
    column_id: string
    user_id: string
    title?: string
    description?: string
  }
) => {
  const { data: template, error: templateError } = await getTaskTemplate(templateId)

  if (templateError || !template) {
    return { data: null, error: templateError }
  }

  const taskData: TaskInsert = {
    board_id: overrides.board_id,
    column_id: overrides.column_id,
    user_id: overrides.user_id,
    title: overrides.title || template.title_template || 'Untitled Task',
    description: overrides.description || template.description_template || null,
    priority: template.priority,
    position: 0,
    is_archived: false
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single()

  if (taskError || !task) {
    return { data: null, error: taskError }
  }

  // Add default tags
  if (template.default_tags && template.default_tags.length > 0) {
    for (const tag of template.default_tags) {
      await supabase.from('tags').insert({ task_id: task.id, name: tag })
    }
  }

  // Add default labels
  if (template.default_labels && template.default_labels.length > 0) {
    for (const labelId of template.default_labels) {
      await supabase.from('task_labels').insert({ task_id: task.id, label_id: labelId })
    }
  }

  // Add subtasks
  if (template.subtask_templates && template.subtask_templates.length > 0) {
    for (const subtask of template.subtask_templates) {
      await supabase.from('subtasks').insert({
        task_id: task.id,
        title: subtask.title,
        position: subtask.position
      })
    }
  }

  return { data: task, error: null }
}

// ==================== ACTIVITY LOG ====================
export const logActivity = async (log: ActivityLogInsert) => {
  const { data, error } = await supabase
    .from('activity_logs')
    .insert(log)
    .select()
    .single()
  return { data, error }
}

export const getActivityLog = async (
  boardId?: string,
  taskId?: string,
  userId?: string,
  limit: number = 50
) => {
  let query = supabase
    .from('activity_logs')
    .select(`
      *,
      profiles(full_name, avatar_url, email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (boardId) {
    query = query.eq('board_id', boardId)
  }
  if (taskId) {
    query = query.eq('task_id', taskId)
  }
  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query
  return { data, error }
}

export const getTaskActivity = async (taskId: string) => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      profiles(full_name, avatar_url, email)
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const getBoardActivity = async (boardId: string, limit: number = 100) => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      profiles(full_name, avatar_url, email),
      tasks(id, title)
    `)
    .eq('board_id', boardId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data, error }
}

// ==================== BOARD MEMBERS ====================
export const getBoardMembers = async (boardId: string) => {
  const { data, error } = await supabase
    .from('board_members')
    .select(`
      *,
      profiles(full_name, avatar_url, email)
    `)
    .eq('board_id', boardId)
    .order('created_at')
  return { data, error }
}

export const addBoardMember = async (member: BoardMemberInsert) => {
  const { data, error } = await supabase
    .from('board_members')
    .insert(member)
    .select()
    .single()
  return { data, error }
}

export const updateBoardMember = async (memberId: string, updates: BoardMemberUpdate) => {
  const { data, error } = await supabase
    .from('board_members')
    .update(updates)
    .eq('id', memberId)
    .select()
    .single()
  return { data, error }
}

export const removeBoardMember = async (memberId: string) => {
  const { error } = await supabase
    .from('board_members')
    .delete()
    .eq('id', memberId)
  return { error }
}

export const getUserBoards = async (userId: string) => {
  // Get boards owned by user
  const { data: ownedBoards, error: ownedError } = await supabase
    .from('boards')
    .select('*')
    .eq('user_id', userId)

  // Get boards where user is a member
  const { data: memberBoards, error: memberError } = await supabase
    .from('board_members')
    .select(`
      role,
      boards(*)
    `)
    .eq('user_id', userId)

  if (ownedError || memberError) {
    return { data: null, error: ownedError || memberError }
  }

  const boards = [
    ...(ownedBoards || []).map(b => ({ ...b, membership_role: 'owner' as const })),
    ...(memberBoards || []).map((m: any) => ({ ...m.boards, membership_role: m.role }))
  ]

  return { data: boards, error: null }
}

export const createBoardWithMember = async (userId: string, title: string, description?: string) => {
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .insert({
      user_id: userId,
      title,
      description: description || null,
      is_default: false
    })
    .select()
    .single()

  if (boardError || !board) {
    return { data: null, error: boardError }
  }

  // Create columns for new board
  await createColumns(board.id)

  return { data: board, error: null }
}

export const updateBoard = async (boardId: string, updates: { title?: string; description?: string }) => {
  const { data, error } = await supabase
    .from('boards')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', boardId)
    .select()
    .single()
  return { data, error }
}

export const deleteBoard = async (boardId: string) => {
  const { error } = await supabase
    .from('boards')
    .delete()
    .eq('id', boardId)
  return { error }
}
