import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BoardProvider } from './context/BoardContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { ViewProvider, useView } from './context/ViewContext'
import { ToastProvider } from './hooks/useToast'
import Loading from './components/UI/Loading'
import Home from './components/Home/Home'
import Header from './components/Header/Header'
import Sidebar from './components/Sidebar/Sidebar'
import Board from './components/Board/Board'
import StatsPanel from './components/Stats/StatsPanel'
import TaskModal from './components/Modals/TaskModal'
import ShortcutsModal from './components/Modals/ShortcutsModal'
import Toast from './components/UI/Toast'
import {
  DashboardView,
  MyTasksView,
  CalendarView,
  ProjectsView,
  LabelsView,
  StarredView,
  ArchiveView,
  TeamView,
  ReportsView,
  NotificationsView,
  SettingsView,
  HelpView
} from './components/Views'
import styles from './App.module.css'

function MainContent() {
  const { currentView } = useView()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      // Auto-close sidebar when switching to desktop
      if (!mobile) {
        setSidebarOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Map views to components
  const viewComponents: Record<string, React.ReactNode> = {
    'dashboard': <DashboardView />,
    'board': <Board />,
    'my-tasks': <MyTasksView />,
    'calendar': <CalendarView />,
    'projects': <ProjectsView />,
    'labels': <LabelsView />,
    'starred': <StarredView />,
    'archive': <ArchiveView />,
    'team': <TeamView />,
    'reports': <ReportsView />,
    'notifications': <NotificationsView />,
    'settings': <SettingsView />,
    'help': <HelpView />,
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className={styles.appLayout}>
      {/* Sidebar - always visible on desktop, toggleable on mobile */}
      <Sidebar
        isOpen={isMobile ? sidebarOpen : true}
        onClose={closeSidebar}
      />

      <div className={styles.mainArea}>
        <Header onMenuClick={toggleSidebar} />
        <div className={styles.contentArea}>
          {currentView === 'board' && <StatsPanel />}
          {viewComponents[currentView] || <Board />}
        </div>
        <TaskModal />
        <ShortcutsModal />
        <Toast />
      </div>
    </div>
  )
}

function AppContent() {
  const { user, loading: authLoading, initialized } = useAuth()
  const { theme } = useTheme()

  // Debug
  console.log('[AppContent] user:', !!user, 'authLoading:', authLoading, 'initialized:', initialized)

  // Set theme attribute on document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Show loading screen until auth is initialized
  if (!initialized || authLoading) {
    return <Loading />
  }

  // Show home/landing page if not logged in
  if (!user) {
    return (
      <>
        <Home />
        <Toast />
      </>
    )
  }

  // Show main app
  return (
    <BoardProvider>
      <ViewProvider>
        <MainContent />
      </ViewProvider>
    </BoardProvider>
  )
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
