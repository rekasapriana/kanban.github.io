import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useView, ViewType } from '../../context/ViewContext'
import {
  FiColumns,
  FiCheckSquare,
  FiCalendar,
  FiFolder,
  FiTag,
  FiStar,
  FiArchive,
  FiX,
  FiBell,
  FiGrid,
  FiLayers,
  FiUsers,
  FiClock,
  FiFileText,
  FiActivity,
  FiBarChart2,
  FiZap,
  FiEye
} from 'react-icons/fi'
import styles from './Sidebar.module.css'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { user, profile } = useAuth()
  const { currentView, setView } = useView()
  const [isMobile, setIsMobile] = useState(false)

  const companyName = "Kanban Ale Ale"
  const displayName = profile?.full_name || user?.user_metadata?.name || 'User'

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Main menu items
  const menuItems: { id: ViewType; label: string; icon: typeof FiColumns }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: FiGrid },
    { id: 'board', label: 'Kanban Board', icon: FiColumns },
    { id: 'my-tasks', label: 'My Tasks', icon: FiCheckSquare },
    { id: 'calendar', label: 'Calendar', icon: FiCalendar },
  ]

  // Organize menu items
  const organizeItems: { id: ViewType; label: string; icon: typeof FiColumns }[] = [
    { id: 'projects', label: 'Projects', icon: FiFolder },
    { id: 'labels', label: 'Labels', icon: FiTag },
    { id: 'templates', label: 'Templates', icon: FiFileText },
    { id: 'activity', label: 'Activity', icon: FiActivity },
    { id: 'starred', label: 'Starred', icon: FiStar },
    { id: 'watching', label: 'Watching', icon: FiEye },
    { id: 'archive', label: 'Archive', icon: FiArchive },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
  ]

  // Views menu items
  const viewItems: { id: ViewType; label: string; icon: typeof FiColumns }[] = [
    { id: 'reports', label: 'Reports', icon: FiBarChart2 },
    { id: 'automation', label: 'Automation', icon: FiZap },
    { id: 'custom-fields', label: 'Custom Fields', icon: FiFileText },
    { id: 'gantt', label: 'Gantt Chart', icon: FiLayers },
    { id: 'timeline', label: 'Timeline', icon: FiClock },
    { id: 'workload', label: 'Workload', icon: FiUsers },
  ]

  const handleMenuClick = (id: ViewType) => {
    setView(id)
    if (isMobile && onClose) {
      onClose()
    }
  }

  // Don't render on mobile if closed
  if (isMobile && !isOpen) {
    return null
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div className={styles.overlay} onClick={onClose} />
      )}

      <aside className={`${styles.sidebar} ${isMobile ? styles.mobileSidebar : ''} ${isMobile && isOpen ? styles.mobileOpen : ''}`}>
        {/* Header - Workspace Selector */}
        <div className={styles.sidebarHeader}>
          <div className={styles.workspaceSelector}>
            <div className={styles.workspaceBtn}>
              <div className={styles.workspaceIcon}>K</div>
              <span className={styles.workspaceName}>{companyName}</span>
            </div>
          </div>

          {isMobile && (
            <button className={styles.closeBtn} onClick={onClose}>
              <FiX />
            </button>
          )}
        </div>

        {/* Menu */}
        <nav className={styles.sidebarNav}>
          <div className={styles.menuSection}>
            <div className={styles.menuTitle}>MENU</div>
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`${styles.menuItem} ${currentView === item.id ? styles.menuItemActive : ''}`}
                onClick={() => handleMenuClick(item.id)}
              >
                <item.icon className={styles.menuIcon} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.menuSection}>
            <div className={styles.menuTitle}>ORGANIZE</div>
            {organizeItems.map((item) => (
              <button
                key={item.id}
                className={`${styles.menuItem} ${currentView === item.id ? styles.menuItemActive : ''}`}
                onClick={() => handleMenuClick(item.id)}
              >
                <item.icon className={styles.menuIcon} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.menuSection}>
            <div className={styles.menuTitle}>VIEWS</div>
            {viewItems.map((item) => (
              <button
                key={item.id}
                className={`${styles.menuItem} ${currentView === item.id ? styles.menuItemActive : ''}`}
                onClick={() => handleMenuClick(item.id)}
              >
                <item.icon className={styles.menuIcon} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </aside>
    </>
  )
}
