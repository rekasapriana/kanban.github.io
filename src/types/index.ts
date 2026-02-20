export * from './database'

export interface User {
  id: string
  email: string | undefined
  user_metadata: {
    full_name?: string
    avatar_url?: string
  }
}

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

export interface BoardState {
  board: import('./database').Board | null
  columns: import('./database').Column[]
  tasks: import('./database').Task[]
  loading: boolean
  error: string | null
  searchQuery: string
  editingTask: import('./database').Task | null
  isModalOpen: boolean
  modalColumnId: string | null
  selectedTaskId: string | null
  isDetailPanelOpen: boolean
  isStatsPanelOpen: boolean
  isShortcutsModalOpen: boolean
  isRealtimeConnected: boolean
  viewMode: 'board' | 'list'
}

export type BoardAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_BOARD'; payload: import('./database').Board }
  | { type: 'SET_COLUMNS'; payload: import('./database').Column[] }
  | { type: 'SET_TASKS'; payload: import('./database').Task[] }
  | { type: 'ADD_TASK'; payload: import('./database').Task }
  | { type: 'UPDATE_TASK'; payload: import('./database').Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'MOVE_TASK'; payload: { taskId: string; columnId: string; position: number } }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_EDITING_TASK'; payload: import('./database').Task | null }
  | { type: 'OPEN_MODAL'; payload: string | null }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_SELECTED_TASK'; payload: string | null }
  | { type: 'OPEN_DETAIL_PANEL'; payload: string }
  | { type: 'CLOSE_DETAIL_PANEL' }
  | { type: 'TOGGLE_STATS_PANEL' }
  | { type: 'TOGGLE_SHORTCUTS_MODAL' }
  | { type: 'SET_REALTIME_CONNECTED'; payload: boolean }
  | { type: 'SET_VIEW_MODE'; payload: 'board' | 'list' }
