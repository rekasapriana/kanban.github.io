import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react'
import * as api from '../lib/api'
import type { BoardState, BoardAction } from '../types'
import type { Task, TaskInsert, ColumnUpdate } from '../types/database'
import { useAuth } from './AuthContext'
import { useToast } from '../hooks/useToast'

// Helper to send task assignment notifications
const sendAssignmentNotifications = async (
  assigneeIds: string[],
  taskId: string,
  taskTitle: string,
  assignerName: string,
  boardId: string
) => {
  console.log('[Notifications] Sending to users:', assigneeIds)
  for (const userId of assigneeIds) {
    const { data, error } = await api.createNotification({
      user_id: userId,
      type: 'task',
      title: 'New Task Assignment',
      message: `${assignerName} assigned you to "${taskTitle}"`,
      is_read: false,
      task_id: taskId,
      board_id: boardId
    })
    console.log('[Notifications] Result for', userId, ':', { data, error })
  }
}

// Helper to send watcher notifications
const sendWatcherNotifications = async (
  taskId: string,
  taskTitle: string,
  action: string,
  watcherIds: string[],
  performerName: string,
  boardId: string
) => {
  for (const userId of watcherIds) {
    const { data, error } = await api.createNotification({
      user_id: userId,
      type: 'task',
      title: 'Task Updated',
      message: `${performerName} ${action} "${taskTitle}"`,
      is_read: false,
      task_id: taskId,
      board_id: boardId
    })
    console.log('[Watcher Notification] Result for', userId, ':', { data, error })
  }
}

const initialState: BoardState = {
  board: null,
  columns: [],
  tasks: [],
  loading: false,
  error: null,
  searchQuery: '',
  editingTask: null,
  isModalOpen: false,
  modalColumnId: null,
  selectedTaskId: null,
  selectedTaskIds: [],
  selectedColumnId: null,
  isDetailPanelOpen: false,
  isStatsPanelOpen: false,
  isShortcutsModalOpen: false,
  isRealtimeConnected: false,
  viewMode: 'board',
  focusMode: false,
  focusTaskId: null,
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false
}

const MAX_HISTORY = 50

function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'SET_BOARD':
      return { ...state, board: action.payload }
    case 'SET_COLUMNS':
      return { ...state, columns: action.payload }
    case 'SET_TASKS':
      return { ...state, tasks: action.payload }
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] }
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t)
      }
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload)
      }
    case 'MOVE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.taskId
            ? { ...t, column_id: action.payload.columnId, position: action.payload.position }
            : t
        )
      }
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }
    case 'SET_EDITING_TASK':
      return { ...state, editingTask: action.payload, isModalOpen: true }
    case 'OPEN_MODAL':
      return { ...state, isModalOpen: true, modalColumnId: action.payload, editingTask: null }
    case 'CLOSE_MODAL':
      return { ...state, isModalOpen: false, editingTask: null, modalColumnId: null }
    case 'SET_SELECTED_TASK':
      return { ...state, selectedTaskId: action.payload }
    case 'TOGGLE_SELECTED_TASK':
      const { taskId, columnId } = action.payload
      const isCurrentlySelected = state.selectedTaskIds.includes(taskId)

      // If deselecting, just remove from list
      if (isCurrentlySelected) {
        const newSelectedIds = state.selectedTaskIds.filter(id => id !== taskId)
        // If no more selected, clear column too
        return {
          ...state,
          selectedTaskIds: newSelectedIds,
          selectedColumnId: newSelectedIds.length === 0 ? null : state.selectedColumnId
        }
      }

      // If selecting new task from different column, clear previous selection
      if (state.selectedColumnId && state.selectedColumnId !== columnId) {
        return {
          ...state,
          selectedTaskIds: [taskId],
          selectedColumnId: columnId
        }
      }

      // Same column or first selection
      return {
        ...state,
        selectedTaskIds: [...state.selectedTaskIds, taskId],
        selectedColumnId: state.selectedColumnId || columnId
      }
    case 'SET_SELECTED_TASKS':
      return { ...state, selectedTaskIds: action.payload }
    case 'CLEAR_SELECTED_TASKS':
      return { ...state, selectedTaskIds: [], selectedColumnId: null }
    case 'OPEN_DETAIL_PANEL':
      return { ...state, isDetailPanelOpen: true, selectedTaskId: action.payload }
    case 'CLOSE_DETAIL_PANEL':
      return { ...state, isDetailPanelOpen: false }
    case 'TOGGLE_STATS_PANEL':
      return { ...state, isStatsPanelOpen: !state.isStatsPanelOpen }
    case 'TOGGLE_SHORTCUTS_MODAL':
      return { ...state, isShortcutsModalOpen: !state.isShortcutsModalOpen }
    case 'SET_REALTIME_CONNECTED':
      return { ...state, isRealtimeConnected: action.payload }
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload }
    case 'UPDATE_COLUMN':
      return {
        ...state,
        columns: state.columns.map(c => c.id === action.payload.id ? action.payload : c)
      }
    case 'SOFT_DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.taskId
            ? { ...t, deleted_at: new Date().toISOString(), deleted_by: action.payload.deletedBy }
            : t
        )
      }
    case 'RESTORE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload
            ? { ...t, deleted_at: null, deleted_by: null }
            : t
        )
      }
    case 'PUSH_HISTORY': {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(action.payload)
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift()
      }
      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        canUndo: newHistory.length > 1,
        canRedo: false
      }
    }
    case 'UNDO': {
      if (state.historyIndex <= 0) return state
      const newIndex = state.historyIndex - 1
      return {
        ...state,
        tasks: state.history[newIndex] || [],
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: true
      }
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state
      const newIndex = state.historyIndex + 1
      return {
        ...state,
        tasks: state.history[newIndex] || [],
        historyIndex: newIndex,
        canUndo: true,
        canRedo: newIndex < state.history.length - 1
      }
    }
    case 'TOGGLE_FOCUS_MODE': {
      const newFocusMode = !state.focusMode
      return {
        ...state,
        focusMode: newFocusMode,
        focusTaskId: action.payload || (newFocusMode ? state.selectedTaskId : null)
      }
    }
    default:
      return state
  }
}

interface BoardContextType {
  state: BoardState
  loadBoard: () => Promise<void>
  loadTasks: () => Promise<void>
  openModal: (columnId?: string) => void
  closeModal: () => void
  openEditModal: (task: Task) => void
  saveTask: (task: Partial<Task>, tags: string[], subtasks: { id?: string; title: string; is_completed?: boolean }[], labelIds?: string[], projectId?: string | null, assigneeIds?: string[]) => Promise<string | null>
  deleteTask: (taskId: string) => Promise<void>
  softDeleteTask: (taskId: string) => Promise<void>
  restoreTask: (taskId: string) => Promise<void>
  permanentDeleteTask: (taskId: string) => Promise<void>
  duplicateTask: (taskId: string) => Promise<string | null>
  moveTask: (taskId: string, columnId: string, position: number) => Promise<boolean>
  archiveTask: (task: Task) => Promise<void>
  unarchiveTask: (task: Task) => Promise<void>
  setSearchQuery: (query: string) => void
  selectTask: (taskId: string | null) => void
  toggleSelectedTask: (taskId: string, columnId: string) => void
  clearSelectedTasks: () => void
  bulkDeleteTasks: () => Promise<void>
  bulkMoveTasks: (columnId: string) => Promise<void>
  bulkUpdatePriority: (priority: 'low' | 'medium' | 'high') => Promise<void>
  openDetailPanel: (taskId: string) => void
  closeDetailPanel: () => void
  toggleStatsPanel: () => void
  toggleShortcutsModal: () => void
  exportData: (format?: 'json' | 'csv') => void
  setViewMode: (mode: 'board' | 'list' | 'calendar' | 'swimlanes' | 'trash') => void
  updateColumn: (columnId: string, updates: ColumnUpdate) => Promise<void>
  checkWipLimit: (columnId: string) => { atLimit: boolean; current: number; limit: number | null }
  toggleFocusMode: (taskId?: string) => void
  undo: () => void
  redo: () => void
}

const BoardContext = createContext<BoardContextType | undefined>(undefined)

export function BoardProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const [state, dispatch] = useReducer(boardReducer, initialState)

  // Load board and columns
  const loadBoard = useCallback(async () => {
    if (!user) {
      console.log('[loadBoard] No user, skipping')
      return
    }

    // Ensure profile exists first
    console.log('[loadBoard] Ensuring profile exists for user:', user.id)
    const { data: existingProfile, error: profileError } = await api.getProfile(user.id)

    if (profileError || !existingProfile) {
      console.log('[loadBoard] Creating profile...')
      const { error: createProfileError } = await api.createProfile(
        user.id,
        user.email || '',
        user.user_metadata?.full_name
      )
      if (createProfileError) {
        console.error('[loadBoard] Failed to create profile:', createProfileError)
      } else {
        console.log('[loadBoard] Profile created successfully')
      }
    }

    console.log('[loadBoard] Starting for user:', user.id)
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Get or create board
      console.log('[loadBoard] Fetching board...')
      let { data: board, error } = await api.getBoard(user.id)
      console.log('[loadBoard] Board result:', { board, error })

      if (error) {
        console.log('[loadBoard] Board error, creating new...', error)
      }

      if (error || !board) {
        console.log('[loadBoard] Creating new board...')
        const result = await api.createBoard(user.id)
        console.log('[loadBoard] Create board result:', result)
        if (result.error) throw result.error
        board = result.data
      }

      console.log('[loadBoard] Setting board:', board)
      dispatch({ type: 'SET_BOARD', payload: board! })

      // Get or create columns
      console.log('[loadBoard] Fetching columns for board:', board.id)
      let { data: columns, error: colsError } = await api.getColumns(board.id)
      console.log('[loadBoard] Columns result:', { columns, colsError })

      if (colsError || !columns || columns.length === 0) {
        console.log('[loadBoard] Creating columns...')
        const result = await api.createColumns(board.id)
        console.log('[loadBoard] Create columns result:', result)
        if (result.error) throw result.error
        columns = result.data
      }

      console.log('[loadBoard] Setting columns:', columns)
      dispatch({ type: 'SET_COLUMNS', payload: columns || [] })
    } catch (error: any) {
      console.error('[loadBoard] Error:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
      showToast('Failed to load board: ' + (error.message || 'Unknown error'), 'error')
    }
  }, [user, showToast])

  // Load tasks
  const loadTasks = useCallback(async () => {
    const currentBoard = state.board

    if (!currentBoard || !user) {
      console.log('[loadTasks] No board or user, skipping')
      return
    }

    console.log('[loadTasks] ============ DEBUG INFO ============')
    console.log('[loadTasks] Current user ID:', user.id)
    console.log('[loadTasks] Board ID:', currentBoard.id)

    try {
      // FETCH COLUMNS FRESH - avoid race condition
      console.log('[loadTasks] Fetching columns fresh...')
      const { data: freshColumns, error: colsError } = await api.getColumns(currentBoard.id)

      if (colsError || !freshColumns || freshColumns.length === 0) {
        console.error('[loadTasks] No columns found!')
        dispatch({ type: 'SET_LOADING', payload: false })
        return
      }

      console.log('[loadTasks] Columns loaded:', freshColumns.map(c => c.title))

      // Update state columns if different
      if (freshColumns.length !== state.columns.length) {
        dispatch({ type: 'SET_COLUMNS', payload: freshColumns })
      }

      // Load tasks from user's own board
      const { data: boardTasks, error: boardError } = await api.getTasks(currentBoard.id)

      if (boardError) {
        console.error('[loadTasks] Board tasks error:', boardError)
        throw boardError
      }

      console.log('[loadTasks] Board tasks loaded:', boardTasks?.length || 0)
      if (boardTasks && boardTasks.length > 0) {
        console.log('[loadTasks] ALL TASKS WITH USER_ID:')
        boardTasks.forEach(t => {
          console.log(`  - "${t.title}" | user_id: ${t.user_id} | owner: ${t.user_id === user.id ? 'YES' : 'NO'}`)
        })
      }

      // Load tasks assigned to current user (from other boards)
      const { data: assignedTasks, error: assignedError } = await api.getAssignedTasks(user.id)

      if (assignedError) {
        console.error('[loadTasks] Assigned tasks error:', assignedError)
      }

      // Combine tasks, avoiding duplicates
      const allTasks = [...(boardTasks || [])]
      const boardTaskIds = new Set(allTasks.map(t => t.id))

      if (assignedTasks && assignedTasks.length > 0) {
        console.log('[loadTasks] Assigned tasks found:', assignedTasks.length)

        // Get column mapping by title using FRESH columns
        const columnMap = new Map(freshColumns.map(c => [c.title.toLowerCase(), c.id]))
        console.log('[loadTasks] Column map:', Object.fromEntries(columnMap))

        for (const task of assignedTasks) {
          console.log(`[loadTasks] Processing assigned task: "${task.title}"`)

          if (!boardTaskIds.has(task.id)) {
            // Get the original column title from the task's board
            const { data: originalColumn, error: colError } = await api.getColumnById(task.column_id)
            console.log(`[loadTasks] Original column:`, originalColumn?.title, 'error:', colError)

            if (originalColumn) {
              // Map to equivalent column in current board
              const mappedColumnId = columnMap.get(originalColumn.title.toLowerCase())
              console.log(`[loadTasks] Mapped column ID: ${mappedColumnId}`)

              if (mappedColumnId) {
                console.log(`[loadTasks] Adding task "${task.title}" with mapped column`)
                allTasks.push({ ...task, column_id: mappedColumnId })
              } else {
                // Fallback to "To Do" column
                const todoColumn = freshColumns.find(c => c.title.toLowerCase() === 'to do')
                if (todoColumn) {
                  console.log(`[loadTasks] Adding task "${task.title}" to To Do (fallback)`)
                  allTasks.push({ ...task, column_id: todoColumn.id })
                } else {
                  console.log(`[loadTasks] ERROR: No To Do column found!`)
                }
              }
            }
          }
        }
      }

      console.log('[loadTasks] Total tasks loaded:', allTasks.length)

      // Debug: Check column mapping
      console.log('[loadTasks] TASKS WITH COLUMNS:')
      allTasks.forEach(t => {
        const col = freshColumns.find(c => c.id === t.column_id)
        console.log(`  "${t.title}" | column: ${col?.title || 'NOT FOUND!'}`)
      })

      // Fix: Reassign tasks with invalid column_id to "To Do"
      const todoColumn = freshColumns.find(c => c.title.toLowerCase() === 'to do')
      if (todoColumn) {
        const tasksWithInvalidColumn = allTasks.filter(t => {
          const col = freshColumns.find(c => c.id === t.column_id)
          return !col
        })

        if (tasksWithInvalidColumn.length > 0) {
          console.log('[loadTasks] FIXING tasks with invalid column_id:', tasksWithInvalidColumn.length)
          for (const task of tasksWithInvalidColumn) {
            console.log(`[loadTasks] Moving "${task.title}" to "To Do" column`)
            await api.updateTask(task.id, { column_id: todoColumn.id })
            task.column_id = todoColumn.id
          }
        }
      }

      console.log('[loadTasks] ============ END DEBUG ============')

      // Filter out soft-deleted tasks for main view
      const activeTasks = allTasks.filter(t => !t.deleted_at)
      dispatch({ type: 'SET_TASKS', payload: activeTasks })
    } catch (error: any) {
      console.error('[loadTasks] Error:', error)
      showToast('Failed to load tasks', 'error')
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.board?.id, user?.id, showToast])

  // Initialize board on mount
  useEffect(() => {
    if (user?.id) {
      console.log('[BoardContext] Initializing board for user:', user.id)
      loadBoard()
    }
  }, [user?.id])

  // Load tasks when board AND columns are ready
  useEffect(() => {
    if (state.board?.id && state.columns.length > 0 && user?.id) {
      console.log('[BoardContext] Board and columns ready, loading tasks...')
      loadTasks()
    }
  }, [state.board?.id, state.columns.length, user?.id])

  // Disable realtime for now - causes connection issues
  // useEffect(() => {
  //   if (!state.board) return
  //   ...
  // }, [state.board, loadTasks])

  const openModal = useCallback((columnId?: string) => {
    const todoColumn = state.columns.find(c => c.title.toLowerCase() === 'to do')
    dispatch({ type: 'OPEN_MODAL', payload: columnId || todoColumn?.id || null })
  }, [state.columns])

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' })
  }, [])

  const openEditModal = useCallback((task: Task) => {
    dispatch({ type: 'SET_EDITING_TASK', payload: task })
  }, [])

  const saveTask = useCallback(async (
    task: Partial<Task>,
    tags: string[],
    subtasks: { id?: string; title: string; is_completed?: boolean }[],
    labelIds: string[] = [],
    projectId: string | null = null,
    assigneeIds: string[] = []
  ): Promise<string | null> => {
    console.log('[saveTask] Starting...', {
      editingTask: state.editingTask,
      modalColumnId: state.modalColumnId,
      boardId: state.board?.id,
      userId: user?.id,
      assigneeIds
    })

    try {
      // Validate required fields for new task
      if (!state.editingTask) {
        if (!state.modalColumnId) {
          console.error('[saveTask] No modalColumnId!')
          showToast('No column selected', 'error')
          return null
        }
        if (!state.board?.id) {
          console.error('[saveTask] No board!')
          showToast('Board not loaded', 'error')
          return null
        }
        if (!user?.id) {
          console.error('[saveTask] No user!')
          showToast('User not authenticated', 'error')
          return null
        }
      }

      if (state.editingTask) {
        // Update existing task
        const { error } = await api.updateTask(state.editingTask.id, {
          title: task.title,
          description: task.description,
          priority: task.priority,
          due_date: task.due_date,
          project_id: projectId
        })

        if (error) throw error

        // Get current assignees to find new ones
        const currentAssigneeIds = state.editingTask.task_assignees?.map(a => a.user_id) || []
        const newAssigneeIds = assigneeIds.filter(id => !currentAssigneeIds.includes(id))

        // Update tags, labels, subtasks and assignees
        await api.updateTags(state.editingTask.id, tags)
        await api.updateTaskLabels(state.editingTask.id, labelIds)
        await api.updateSubtasks(state.editingTask.id, subtasks)
        await api.updateTaskAssignees(state.editingTask.id, assigneeIds)

        // Send notifications to new assignees only
        if (newAssigneeIds.length > 0) {
          const assignerName = profile?.full_name || user?.email?.split('@')[0] || 'Someone'
          await sendAssignmentNotifications(
            newAssigneeIds,
            state.editingTask.id,
            task.title || state.editingTask.title,
            assignerName,
            state.board!.id
          )
        }

        await loadTasks()
        showToast('Task updated!', 'success')
      } else {
        // Create new task
        console.log('[saveTask] Creating new task...')
        const position = state.tasks.filter(t => t.column_id === state.modalColumnId).length

        const newTask: TaskInsert = {
          board_id: state.board!.id,
          column_id: state.modalColumnId!,
          user_id: user!.id,
          title: task.title || '',
          description: task.description || null,
          priority: task.priority || 'medium',
          due_date: task.due_date || null,
          position,
          is_archived: false,
          project_id: projectId
        }

        console.log('[saveTask] New task data:', newTask)
        const { data, error } = await api.createTask(newTask)

        if (error) {
          console.error('[saveTask] Create task error:', error)
          throw error
        }

        console.log('[saveTask] Task created:', data)

        // Add tags
        for (const tag of tags) {
          await api.createTag({ task_id: data.id, name: tag })
        }

        // Add labels
        await api.updateTaskLabels(data.id, labelIds)

        // Add subtasks
        for (let i = 0; i < subtasks.length; i++) {
          await api.createSubtask({
            task_id: data.id,
            title: subtasks[i].title,
            position: i
          })
        }

        // Add assignees
        await api.updateTaskAssignees(data.id, assigneeIds)

        // Send notifications to assignees
        if (assigneeIds.length > 0) {
          const assignerName = profile?.full_name || user?.email?.split('@')[0] || 'Someone'
          await sendAssignmentNotifications(
            assigneeIds,
            data.id,
            task.title || 'Untitled Task',
            assignerName,
            state.board!.id
          )
        }

        await loadTasks()
        showToast('Task created!', 'success')
        closeModal()
        return data.id
      }

      closeModal()
      return state.editingTask?.id || null
    } catch (error: any) {
      console.error('[saveTask] Error:', error)
      console.error('[saveTask] Error message:', error?.message)
      console.error('[saveTask] Error details:', error?.details)
      console.error('[saveTask] Error hint:', error?.hint)
      showToast(`Failed to save task: ${error?.message || 'Unknown error'}`, 'error')
      return null
    }
  }, [state.editingTask, state.modalColumnId, state.board, state.tasks, user, profile, loadTasks, closeModal, showToast])

  const deleteTask = useCallback(async (taskId: string) => {
    // Now uses soft delete by default
    await softDeleteTask(taskId)
  }, [showToast])

  const softDeleteTask = useCallback(async (taskId: string) => {
    if (!user) return

    try {
      // Save current state to history before delete
      dispatch({ type: 'PUSH_HISTORY', payload: state.tasks })

      // Soft delete in database
      const { error } = await api.updateTask(taskId, {
        deleted_at: new Date().toISOString(),
        deleted_by: user.id
      })

      if (error) throw error

      dispatch({ type: 'SOFT_DELETE_TASK', payload: { taskId, deletedBy: user.id } })
      dispatch({ type: 'SET_SELECTED_TASK', payload: null })
      dispatch({ type: 'CLEAR_SELECTED_TASKS' })
      showToast('Task moved to trash (Ctrl+Z to undo)', 'info')
    } catch (error: any) {
      console.error('Soft delete task error:', error)
      showToast('Failed to delete task', 'error')
    }
  }, [user, state.tasks, showToast])

  const restoreTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await api.updateTask(taskId, {
        deleted_at: null,
        deleted_by: null
      })

      if (error) throw error

      dispatch({ type: 'RESTORE_TASK', payload: taskId })
      showToast('Task restored', 'success')
    } catch (error: any) {
      console.error('Restore task error:', error)
      showToast('Failed to restore task', 'error')
    }
  }, [showToast])

  const permanentDeleteTask = useCallback(async (taskId: string) => {
    if (!confirm('Permanently delete this task? This cannot be undone.')) return

    try {
      const { error } = await api.deleteTask(taskId)

      if (error) throw error

      dispatch({ type: 'DELETE_TASK', payload: taskId })
      showToast('Task permanently deleted', 'info')
    } catch (error: any) {
      console.error('Permanent delete task error:', error)
      showToast('Failed to delete task', 'error')
    }
  }, [showToast])

  const duplicateTask = useCallback(async (taskId: string): Promise<string | null> => {
    if (!user) return null

    try {
      const { data, error } = await api.duplicateTask(taskId, user.id)

      if (error) throw error

      await loadTasks()
      showToast('Task duplicated!', 'success')
      return data?.id || null
    } catch (error: any) {
      console.error('Duplicate task error:', error)
      showToast('Failed to duplicate task', 'error')
      return null
    }
  }, [user, loadTasks, showToast])

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' })
    showToast('Undo successful', 'info')
  }, [showToast])

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' })
    showToast('Redo successful', 'info')
  }, [showToast])

  const moveTask = useCallback(async (taskId: string, columnId: string, position: number): Promise<boolean> => {
    // Check WIP limit for target column
    const targetColumn = state.columns.find(c => c.id === columnId)
    if (targetColumn?.wip_limit) {
      const currentTasks = state.tasks.filter(t => t.column_id === columnId && !t.is_archived)
      const taskToMove = state.tasks.find(t => t.id === taskId)

      // Only check limit if moving TO the column (not within the same column)
      if (taskToMove && taskToMove.column_id !== columnId && currentTasks.length >= targetColumn.wip_limit) {
        showToast(`Cannot move task: Column "${targetColumn.title}" has reached its WIP limit of ${targetColumn.wip_limit}`, 'warning')
        return false
      }
    }

    try {
      const { error } = await api.updateTask(taskId, { column_id: columnId, position })

      if (error) throw error

      dispatch({ type: 'MOVE_TASK', payload: { taskId, columnId, position } })
      return true
    } catch (error: any) {
      console.error('Move task error:', error)
      showToast('Failed to move task', 'error')
      await loadTasks() // Revert
      return false
    }
  }, [state.columns, state.tasks, loadTasks, showToast])

  const archiveTask = useCallback(async (task: Task) => {
    const archiveColumn = state.columns.find(c => c.title.toLowerCase() === 'archive')
    if (!archiveColumn) return

    try {
      const { error } = await api.updateTask(task.id, {
        column_id: archiveColumn.id,
        is_archived: true
      })

      if (error) throw error

      await loadTasks()
      showToast('Task archived', 'info')
    } catch (error: any) {
      console.error('Archive task error:', error)
      showToast('Failed to archive task', 'error')
    }
  }, [state.columns, loadTasks, showToast])

  const unarchiveTask = useCallback(async (task: Task) => {
    const todoColumn = state.columns.find(c => c.title.toLowerCase() === 'to do')
    if (!todoColumn) return

    try {
      const { error } = await api.updateTask(task.id, {
        column_id: todoColumn.id,
        is_archived: false
      })

      if (error) throw error

      await loadTasks()
      showToast('Task unarchived', 'success')
    } catch (error: any) {
      console.error('Unarchive task error:', error)
      showToast('Failed to unarchive task', 'error')
    }
  }, [state.columns, loadTasks, showToast])

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query })
  }, [])

  const selectTask = useCallback((taskId: string | null) => {
    dispatch({ type: 'SET_SELECTED_TASK', payload: taskId })
  }, [])

  const openDetailPanel = useCallback((taskId: string) => {
    dispatch({ type: 'OPEN_DETAIL_PANEL', payload: taskId })
  }, [])

  const closeDetailPanel = useCallback(() => {
    dispatch({ type: 'CLOSE_DETAIL_PANEL' })
  }, [])

  const toggleStatsPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_STATS_PANEL' })
  }, [])

  const toggleShortcutsModal = useCallback(() => {
    dispatch({ type: 'TOGGLE_SHORTCUTS_MODAL' })
  }, [])

  const toggleFocusMode = useCallback((taskId?: string) => {
    dispatch({ type: 'TOGGLE_FOCUS_MODE', payload: taskId })
  }, [])

  const exportData = useCallback(() => {
    if (!state.board || !state.columns || !state.tasks) return
    api.exportData(state.board, state.columns, state.tasks)
    showToast('Data exported!', 'success')
  }, [state.board, state.columns, state.tasks, showToast])

  const setViewMode = useCallback((mode: 'board' | 'list' | 'calendar' | 'swimlanes' | 'trash') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode })
  }, [])

  const toggleSelectedTask = useCallback((taskId: string, columnId: string) => {
    dispatch({ type: 'TOGGLE_SELECTED_TASK', payload: { taskId, columnId } })
  }, [])

  const clearSelectedTasks = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTED_TASKS' })
  }, [])

  const bulkDeleteTasks = useCallback(async () => {
    if (state.selectedTaskIds.length === 0) return

    if (!confirm(`Are you sure you want to delete ${state.selectedTaskIds.length} tasks?`)) return

    try {
      const { error } = await api.bulkDeleteTasks(state.selectedTaskIds)
      if (error) throw error

      dispatch({ type: 'CLEAR_SELECTED_TASKS' })
      await loadTasks()
      showToast(`${state.selectedTaskIds.length} tasks deleted`, 'info')
    } catch (error: any) {
      console.error('Bulk delete error:', error)
      showToast('Failed to delete tasks', 'error')
    }
  }, [state.selectedTaskIds, loadTasks, showToast])

  const bulkMoveTasks = useCallback(async (columnId: string) => {
    if (state.selectedTaskIds.length === 0) return

    // Check WIP limit
    const targetColumn = state.columns.find(c => c.id === columnId)
    if (targetColumn?.wip_limit) {
      const currentTasks = state.tasks.filter(t => t.column_id === columnId && !t.is_archived)
      const tasksToMove = state.tasks.filter(t => state.selectedTaskIds.includes(t.id) && t.column_id !== columnId)

      if (currentTasks.length + tasksToMove.length > targetColumn.wip_limit) {
        showToast(`Cannot move tasks: Column "${targetColumn.title}" would exceed its WIP limit of ${targetColumn.wip_limit}`, 'warning')
        return
      }
    }

    try {
      const { error } = await api.bulkMoveTasks(state.selectedTaskIds, columnId)
      if (error) throw error

      dispatch({ type: 'CLEAR_SELECTED_TASKS' })
      await loadTasks()
      showToast(`${state.selectedTaskIds.length} tasks moved`, 'success')
    } catch (error: any) {
      console.error('Bulk move error:', error)
      showToast('Failed to move tasks', 'error')
    }
  }, [state.selectedTaskIds, state.columns, state.tasks, loadTasks, showToast])

  const bulkUpdatePriority = useCallback(async (priority: 'low' | 'medium' | 'high') => {
    if (state.selectedTaskIds.length === 0) return

    try {
      const { error } = await api.bulkUpdateTasks(state.selectedTaskIds, { priority })
      if (error) throw error

      await loadTasks()
      showToast(`${state.selectedTaskIds.length} tasks updated to ${priority} priority`, 'success')
    } catch (error: any) {
      console.error('Bulk update error:', error)
      showToast('Failed to update tasks', 'error')
    }
  }, [state.selectedTaskIds, loadTasks, showToast])

  const updateColumn = useCallback(async (columnId: string, updates: ColumnUpdate) => {
    try {
      const { data, error } = await api.updateColumn(columnId, updates)
      if (error) throw error

      dispatch({ type: 'UPDATE_COLUMN', payload: data })
      showToast('Column updated', 'success')
    } catch (error: any) {
      console.error('Update column error:', error)
      showToast('Failed to update column', 'error')
    }
  }, [showToast])

  const checkWipLimit = useCallback((columnId: string) => {
    const column = state.columns.find(c => c.id === columnId)
    const currentCount = state.tasks.filter(t => t.column_id === columnId && !t.is_archived).length

    return {
      atLimit: column?.wip_limit ? currentCount >= column.wip_limit : false,
      current: currentCount,
      limit: column?.wip_limit || null
    }
  }, [state.columns, state.tasks])

  const exportDataEnhanced = useCallback((format: 'json' | 'csv' = 'json') => {
    if (!state.board || !state.columns || !state.tasks) return

    if (format === 'csv') {
      api.exportToCSV(state.board, state.columns, state.tasks)
    } else {
      api.exportData(state.board, state.columns, state.tasks)
    }
    showToast(`Data exported as ${format.toUpperCase()}!`, 'success')
  }, [state.board, state.columns, state.tasks, showToast])

  return (
    <BoardContext.Provider value={{
      state,
      loadBoard,
      loadTasks,
      openModal,
      closeModal,
      openEditModal,
      saveTask,
      deleteTask,
      softDeleteTask,
      restoreTask,
      permanentDeleteTask,
      duplicateTask,
      moveTask,
      archiveTask,
      unarchiveTask,
      setSearchQuery,
      selectTask,
      toggleSelectedTask,
      clearSelectedTasks,
      bulkDeleteTasks,
      bulkMoveTasks,
      bulkUpdatePriority,
      openDetailPanel,
      closeDetailPanel,
      toggleStatsPanel,
      toggleShortcutsModal,
      toggleFocusMode,
      exportData: exportDataEnhanced,
      setViewMode,
      updateColumn,
      checkWipLimit,
      undo,
      redo
    }}>
      {children}
    </BoardContext.Provider>
  )
}

export function useBoard() {
  const context = useContext(BoardContext)
  if (!context) {
    throw new Error('useBoard must be used within a BoardProvider')
  }
  return context
}
