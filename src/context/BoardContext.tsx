import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react'
import * as api from '../lib/api'
import type { BoardState, BoardAction } from '../types'
import type { Task, TaskInsert } from '../types/database'
import { useAuth } from './AuthContext'
import { useToast } from '../hooks/useToast'

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
  isDetailPanelOpen: false,
  isStatsPanelOpen: false,
  isShortcutsModalOpen: false,
  isRealtimeConnected: false,
  viewMode: 'board'
}

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
  saveTask: (task: Partial<Task>, tags: string[], subtasks: { id?: string; title: string; is_completed?: boolean }[], labelIds?: string[], projectId?: string | null, assigneeIds?: string[]) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  moveTask: (taskId: string, columnId: string, position: number) => Promise<void>
  archiveTask: (task: Task) => Promise<void>
  restoreTask: (task: Task) => Promise<void>
  setSearchQuery: (query: string) => void
  selectTask: (taskId: string | null) => void
  openDetailPanel: (taskId: string) => void
  closeDetailPanel: () => void
  toggleStatsPanel: () => void
  toggleShortcutsModal: () => void
  exportData: () => void
  setViewMode: (mode: 'board' | 'list') => void
}

const BoardContext = createContext<BoardContextType | undefined>(undefined)

export function BoardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [state, dispatch] = useReducer(boardReducer, initialState)

  // Load board and columns
  const loadBoard = useCallback(async () => {
    if (!user) {
      console.log('[loadBoard] No user, skipping')
      return
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
    if (!state.board || !user) {
      console.log('[loadTasks] No board or user, skipping')
      return
    }

    console.log('[loadTasks] Loading tasks for board:', state.board.id)
    try {
      // Load tasks from user's own board
      const { data: boardTasks, error: boardError } = await api.getTasks(state.board.id)

      if (boardError) {
        console.error('[loadTasks] Board tasks error:', boardError)
        throw boardError
      }

      // Load tasks assigned to current user (from other boards)
      const { data: assignedTasks, error: assignedError } = await api.getAssignedTasks(user.id)

      if (assignedError) {
        console.error('[loadTasks] Assigned tasks error:', assignedError)
        // Don't throw, just log - assigned tasks are optional
      }

      // Combine tasks, avoiding duplicates
      const allTasks = [...(boardTasks || [])]
      const boardTaskIds = new Set(allTasks.map(t => t.id))

      if (assignedTasks) {
        // Get column mapping by title
        const columnMap = new Map(state.columns.map(c => [c.title.toLowerCase(), c.id]))

        for (const task of assignedTasks) {
          if (!boardTaskIds.has(task.id)) {
            // Get the original column title from the task's board
            const { data: originalColumn } = await api.getColumnById(task.column_id)

            if (originalColumn) {
              // Map to equivalent column in current board
              const mappedColumnId = columnMap.get(originalColumn.title.toLowerCase())

              if (mappedColumnId) {
                allTasks.push({ ...task, column_id: mappedColumnId })
              } else {
                // Fallback to "To Do" column
                const todoColumn = state.columns.find(c => c.title.toLowerCase() === 'to do')
                if (todoColumn) {
                  allTasks.push({ ...task, column_id: todoColumn.id })
                }
              }
            }
          }
        }
      }

      console.log('[loadTasks] Loaded tasks:', allTasks.length, '(board:', boardTasks?.length || 0, ', assigned:', assignedTasks?.length || 0, ')')
      dispatch({ type: 'SET_TASKS', payload: allTasks })
    } catch (error: any) {
      console.error('[loadTasks] Error:', error)
      showToast('Failed to load tasks', 'error')
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.board, user, showToast])

  // Initialize board on mount
  useEffect(() => {
    if (user) {
      loadBoard()
    }
  }, [user, loadBoard])

  // Load tasks when board is set
  useEffect(() => {
    if (state.board) {
      loadTasks()
    }
  }, [state.board, loadTasks])

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
  ) => {
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
          return
        }
        if (!state.board?.id) {
          console.error('[saveTask] No board!')
          showToast('Board not loaded', 'error')
          return
        }
        if (!user?.id) {
          console.error('[saveTask] No user!')
          showToast('User not authenticated', 'error')
          return
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

        // Update tags, labels, subtasks and assignees
        await api.updateTags(state.editingTask.id, tags)
        await api.updateTaskLabels(state.editingTask.id, labelIds)
        await api.updateSubtasks(state.editingTask.id, subtasks)
        await api.updateTaskAssignees(state.editingTask.id, assigneeIds)

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

        await loadTasks()
        showToast('Task created!', 'success')
      }

      closeModal()
    } catch (error: any) {
      console.error('[saveTask] Error:', error)
      console.error('[saveTask] Error message:', error?.message)
      console.error('[saveTask] Error details:', error?.details)
      console.error('[saveTask] Error hint:', error?.hint)
      showToast(`Failed to save task: ${error?.message || 'Unknown error'}`, 'error')
    }
  }, [state.editingTask, state.modalColumnId, state.board, state.tasks, user, loadTasks, closeModal, showToast])

  const deleteTask = useCallback(async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const { error } = await api.deleteTask(taskId)

      if (error) throw error

      dispatch({ type: 'DELETE_TASK', payload: taskId })
      dispatch({ type: 'SET_SELECTED_TASK', payload: null })
      showToast('Task deleted', 'info')
    } catch (error: any) {
      console.error('Delete task error:', error)
      showToast('Failed to delete task', 'error')
    }
  }, [showToast])

  const moveTask = useCallback(async (taskId: string, columnId: string, position: number) => {
    try {
      const { error } = await api.updateTask(taskId, { column_id: columnId, position })

      if (error) throw error

      dispatch({ type: 'MOVE_TASK', payload: { taskId, columnId, position } })
    } catch (error: any) {
      console.error('Move task error:', error)
      showToast('Failed to move task', 'error')
      await loadTasks() // Revert
    }
  }, [loadTasks, showToast])

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

  const restoreTask = useCallback(async (task: Task) => {
    const todoColumn = state.columns.find(c => c.title.toLowerCase() === 'to do')
    if (!todoColumn) return

    try {
      const { error } = await api.updateTask(task.id, {
        column_id: todoColumn.id,
        is_archived: false
      })

      if (error) throw error

      await loadTasks()
      showToast('Task restored', 'success')
    } catch (error: any) {
      console.error('Restore task error:', error)
      showToast('Failed to restore task', 'error')
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

  const exportData = useCallback(() => {
    if (!state.board || !state.columns || !state.tasks) return
    api.exportData(state.board, state.columns, state.tasks)
    showToast('Data exported!', 'success')
  }, [state.board, state.columns, state.tasks, showToast])

  const setViewMode = useCallback((mode: 'board' | 'list') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode })
  }, [])

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
      moveTask,
      archiveTask,
      restoreTask,
      setSearchQuery,
      selectTask,
      openDetailPanel,
      closeDetailPanel,
      toggleStatsPanel,
      toggleShortcutsModal,
      exportData,
      setViewMode
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
