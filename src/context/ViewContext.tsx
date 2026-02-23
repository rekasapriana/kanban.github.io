import { createContext, useContext, useState, ReactNode } from 'react'

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

export function ViewProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [viewData, setViewData] = useState<Record<string, unknown>>({})

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
