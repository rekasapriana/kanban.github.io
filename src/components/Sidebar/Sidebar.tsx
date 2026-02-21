import { useState, useEffect, useRef } from 'react'
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
  FiSettings,
  FiHelpCircle,
  FiLogOut,
  FiMoon,
  FiSun,
  FiX,
  FiUsers,
  FiBarChart2,
  FiBell,
  FiGrid,
  FiChevronDown,
  FiPlus
} from 'react-icons/fi'
import { useTheme } from '../../context/ThemeContext'
import styles from './Sidebar.module.css'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { user, profile, signOutUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { currentView, setView } = useView()
  const [isMobile, setIsMobile] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const workspaceRef = useRef<HTMLDivElement>(null)

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

  // Close workspace dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setWorkspaceOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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
    { id: 'starred', label: 'Starred', icon: FiStar },
    { id: 'archive', label: 'Archive', icon: FiArchive },
  ]

  // Team & Reports items
  const teamItems: { id: ViewType; label: string; icon: typeof FiColumns }[] = [
    { id: 'team', label: 'Team', icon: FiUsers },
    { id: 'reports', label: 'Reports', icon: FiBarChart2 },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
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
          <div className={styles.workspaceSelector} ref={workspaceRef}>
            <button
              className={styles.workspaceBtn}
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
            >
              <div className={styles.workspaceIcon}>
                K
              </div>
              <span className={styles.workspaceName}>{companyName}</span>
              <FiChevronDown className={`${styles.chevron} ${workspaceOpen ? styles.chevronOpen : ''}`} />
            </button>

            {workspaceOpen && (
              <div className={styles.workspaceDropdown}>
                <button className={styles.workspaceDropdownItem}>
                  <FiPlus /> Add Workspace
                </button>
              </div>
            )}
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
            <div className={styles.menuTitle}>TEAM & REPORTS</div>
            {teamItems.map((item) => (
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
            <div className={styles.menuTitle}>PREFERENCES</div>

            {/* Theme Toggle */}
            <button className={styles.menuItem} onClick={toggleTheme}>
              {theme === 'dark' ? <FiSun className={styles.menuIcon} /> : <FiMoon className={styles.menuIcon} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <button
              className={`${styles.menuItem} ${currentView === 'settings' ? styles.menuItemActive : ''}`}
              onClick={() => handleMenuClick('settings')}
            >
              <FiSettings className={styles.menuIcon} />
              <span>Settings</span>
            </button>

            <button
              className={`${styles.menuItem} ${currentView === 'help' ? styles.menuItemActive : ''}`}
              onClick={() => handleMenuClick('help')}
            >
              <FiHelpCircle className={styles.menuIcon} />
              <span>Help</span>
            </button>
          </div>
        </nav>

        {/* Logout */}
        <div className={styles.sidebarFooter}>
          <button className={styles.logoutBtn} onClick={signOutUser}>
            <FiLogOut />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
