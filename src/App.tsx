import { useEffect, useState, useMemo } from 'react'
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

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  // Render view berdasarkan currentView dengan key untuk force remount
  const renderView = useMemo(() => {
    switch (currentView) {
      case 'dashboard': return <DashboardView key="dashboard" />
      case 'board': return <Board key="board" />
      case 'my-tasks': return <MyTasksView key="my-tasks" />
      case 'calendar': return <CalendarView key="calendar" />
      case 'projects': return <ProjectsView key="projects" />
      case 'labels': return <LabelsView key="labels" />
      case 'starred': return <StarredView key="starred" />
      case 'archive': return <ArchiveView key="archive" />
      case 'team': return <TeamView key="team" />
      case 'reports': return <ReportsView key="reports" />
      case 'notifications': return <NotificationsView key="notifications" />
      case 'settings': return <SettingsView key="settings" />
      case 'help': return <HelpView key="help" />
      default: return <Board key="board-default" />
    }
  }, [currentView])

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
          {renderView}
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
