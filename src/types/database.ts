export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Board {
  id: string
  user_id: string
  title: string
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Column {
  id: string
  board_id: string
  title: string
  color: string
  position: number
  created_at: string
}

export interface Tag {
  id: string
  task_id: string
  name: string
  created_at: string
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  position: number
  created_at: string
}

export interface Task {
  id: string
  board_id: string
  column_id: string
  user_id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  position: number
  is_archived: boolean
  project_id: string | null
  assignee_id?: string | null
  timer_started_at?: string | null
  timer_user_id?: string | null
  created_at: string
  updated_at: string
  tags: Tag[]
  subtasks: Subtask[]
  task_labels?: TaskLabelWithLabel[]
  projects?: Project
  assignee?: Profile | null
  task_assignees?: TaskAssigneeWithProfile[]
  time_entries?: TimeEntry[]
  dependencies?: TaskDependency[]
  recurring_pattern?: RecurringPattern | null
}

// ==================== TASK ASSIGNEES ====================
export interface TaskAssignee {
  id: string
  task_id: string
  user_id: string
  created_at: string
}

export type TaskAssigneeInsert = Omit<TaskAssignee, 'id' | 'created_at'>

export interface TaskAssigneeWithProfile extends TaskAssignee {
  profiles: Profile
}

export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'tags' | 'subtasks' | 'task_labels' | 'projects' | 'assignee' | 'time_entries' | 'dependencies' | 'recurring_pattern'>
export type TaskUpdate = Partial<Pick<Task, 'title' | 'description' | 'priority' | 'due_date' | 'column_id' | 'position' | 'is_archived' | 'project_id' | 'assignee_id' | 'timer_started_at' | 'timer_user_id'>>
export type TagInsert = Omit<Tag, 'id' | 'created_at'>
export type SubtaskInsert = Pick<Subtask, 'task_id' | 'title' | 'position'> & { is_completed?: boolean }
export type SubtaskUpdate = Partial<Pick<Subtask, 'title' | 'is_completed' | 'position'>>

// ==================== PROJECTS ====================
export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string
  is_starred: boolean
  created_at: string
  updated_at: string
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'>
export type ProjectUpdate = Partial<Pick<Project, 'name' | 'description' | 'color' | 'is_starred'>>

// ==================== LABELS ====================
export interface Label {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export type LabelInsert = Omit<Label, 'id' | 'created_at' | 'updated_at'>
export type LabelUpdate = Partial<Pick<Label, 'name' | 'color'>>

// ==================== TASK LABELS (Junction Table) ====================
export interface TaskLabel {
  id: string
  task_id: string
  label_id: string
  created_at: string
}

export type TaskLabelInsert = Omit<TaskLabel, 'id' | 'created_at'>
export interface TaskLabelWithLabel extends TaskLabel {
  labels: Label
}

// ==================== STARRED TASKS ====================
export interface StarredTask {
  id: string
  user_id: string
  task_id: string
  created_at: string
}

export type StarredTaskInsert = Omit<StarredTask, 'id' | 'created_at'>

// ==================== TEAM MEMBERS ====================
export interface TeamMember {
  id: string
  user_id: string
  name: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  avatar_url: string | null
  status: 'online' | 'offline' | 'away'
  auth_user_id: string | null  // Link to actual auth user if they have an account
  created_at: string
  updated_at: string
}

export type TeamMemberInsert = {
  user_id: string
  name: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  avatar_url?: string | null
  status?: 'online' | 'offline' | 'away'
  auth_user_id?: string | null
}
export type TeamMemberUpdate = Partial<Pick<TeamMember, 'name' | 'email' | 'role' | 'status' | 'avatar_url' | 'auth_user_id'>>

// ==================== NOTIFICATIONS ====================
export interface Notification {
  id: string
  user_id: string
  type: 'task' | 'system' | 'mention' | 'reminder' | 'comment'
  title: string
  message: string
  is_read: boolean
  created_at: string
  task_id?: string | null
  board_id?: string | null
}

export type NotificationInsert = Omit<Notification, 'id' | 'created_at'>
export type NotificationUpdate = Partial<Pick<Notification, 'is_read'>>

// ==================== USER SETTINGS ====================
export interface UserSettings {
  id: string
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  weekly_digest: boolean
  compact_mode: boolean
  show_completed_tasks: boolean
  created_at: string
  updated_at: string
}

export type UserSettingsInsert = Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>
export type UserSettingsUpdate = Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// ==================== TASK COMMENTS ====================
export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  image_url?: string | null
  parent_id?: string | null
  is_pinned?: boolean
  created_at: string
  updated_at: string
}

export type TaskCommentInsert = Omit<TaskComment, 'id' | 'created_at' | 'updated_at'>
export type TaskCommentUpdate = Partial<Pick<TaskComment, 'content' | 'image_url'>>

// ==================== TASK ATTACHMENTS ====================
export interface TaskAttachment {
  id: string
  task_id: string
  user_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  created_at: string
}

export type TaskAttachmentInsert = Omit<TaskAttachment, 'id' | 'created_at'>

// ==================== TEAM INVITATIONS ====================
export interface TeamInvitation {
  id: string
  team_owner_id: string
  email: string
  name: string
  role: 'admin' | 'member' | 'viewer'
  status: 'pending' | 'accepted' | 'declined'
  invited_at: string
  responded_at: string | null
  created_at: string
}

export type TeamInvitationInsert = Omit<TeamInvitation, 'id' | 'invited_at' | 'responded_at' | 'created_at'>
export type TeamInvitationUpdate = Partial<Pick<TeamInvitation, 'status' | 'responded_at'>>

// ==================== TIME TRACKING ====================
export interface TimeEntry {
  id: string
  task_id: string
  user_id: string
  duration_seconds: number
  description: string | null
  started_at: string | null
  stopped_at: string | null
  created_at: string
}

export type TimeEntryInsert = Omit<TimeEntry, 'id' | 'created_at'>

// ==================== TASK DEPENDENCIES ====================
export interface TaskDependency {
  id: string
  task_id: string
  depends_on_task_id: string
  dependency_type: 'blocks' | 'blocked_by'
  created_at: string
}

export type TaskDependencyInsert = Omit<TaskDependency, 'id' | 'created_at'>

// ==================== RECURRING PATTERNS ====================
export interface RecurringPattern {
  id: string
  task_id: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval_value: number
  days_of_week: number[] | null
  day_of_month: number | null
  end_date: string | null
  next_occurrence: string | null
  is_active: boolean
  created_at: string
}

export type RecurringPatternInsert = Omit<RecurringPattern, 'id' | 'created_at'>
export type RecurringPatternUpdate = Partial<Omit<RecurringPattern, 'id' | 'task_id' | 'created_at'>>

// ==================== TASK TEMPLATES ====================
export interface TaskTemplate {
  id: string
  user_id: string
  name: string
  description: string | null
  title_template: string | null
  description_template: string | null
  priority: 'low' | 'medium' | 'high'
  default_labels: string[] | null
  default_tags: string[] | null
  subtask_templates: SubtaskTemplate[] | null
  created_at: string
}

export interface SubtaskTemplate {
  title: string
  position: number
}

export type TaskTemplateInsert = Omit<TaskTemplate, 'id' | 'created_at'>
export type TaskTemplateUpdate = Partial<Omit<TaskTemplate, 'id' | 'user_id' | 'created_at'>>

// ==================== ACTIVITY LOG ====================
export interface ActivityLog {
  id: string
  board_id: string | null
  task_id: string | null
  user_id: string | null
  action_type: ActivityActionType
  action_details: Record<string, unknown> | null
  created_at: string
}

export type ActivityActionType =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_moved'
  | 'task_completed'
  | 'task_archived'
  | 'task_restored'
  | 'comment_added'
  | 'attachment_added'
  | 'assignee_added'
  | 'assignee_removed'
  | 'label_added'
  | 'label_removed'
  | 'due_date_changed'
  | 'priority_changed'
  | 'time_logged'
  | 'board_created'
  | 'board_updated'

export type ActivityLogInsert = Omit<ActivityLog, 'id' | 'created_at'>

// ==================== BOARD MEMBERS ====================
export interface BoardMember {
  id: string
  board_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  created_at: string
}

export type BoardMemberInsert = Omit<BoardMember, 'id' | 'created_at'>
export type BoardMemberUpdate = Partial<Pick<BoardMember, 'role'>>
