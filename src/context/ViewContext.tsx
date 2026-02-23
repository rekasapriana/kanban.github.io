import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type ViewType =
  | 'dashboard'
  | 'board'
  | 'my-tasks'
  | 'calendar'
  | 'projects'
  | 'labels'
  | 'starred'
  | 'archive'
  | 'team'
  | 'reports'
  | 'notifications'
  | 'settings'
  | 'shortcuts'
  | 'help'
  | 'gantt'
  | 'workload'
  | 'timeline'
  | 'templates'
  | 'activity'
  | 'automation'
  | 'custom-fields'
  | 'watching'

interface ViewContextType {
  currentView: ViewType
  setView: (view: ViewType) => void
  viewData: Record<string, unknown>
  setViewData: (data: Record<string, unknown>) => void
}

const ViewContext = createContext<ViewContextType | undefined>(undefined)

const VIEW_STORAGE_KEY = 'kanban_current_view'

export function ViewProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage or default to 'dashboard'
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    try {
      const stored = localStorage.getItem(VIEW_STORAGE_KEY)
      if (stored) {
        return stored as ViewType
      }
    } catch (e) {
      console.error('Error loading view from storage:', e)
    }
    return 'dashboard'
  })
  const [viewData, setViewData] = useState<Record<string, unknown>>({})

  // Save to localStorage when view changes
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, currentView)
    } catch (e) {
      console.error('Error saving view to storage:', e)
    }
  }, [currentView])

  const setView = (view: ViewType) => {
    setCurrentView(view)
    setViewData({})
  }

  return (
    <ViewContext.Provider value={{ currentView, setView, viewData, setViewData }}>
      {children}
    </ViewContext.Provider>
  )
}

export function useView() {
  const context = useContext(ViewContext)
  if (!context) {
    throw new Error('useView must be used within a ViewProvider')
  }
  return context
}

export type { ViewType }
