import { useState, useRef, useEffect } from 'react'
import { FiEdit2, FiMoon, FiSun, FiHelpCircle, FiBarChart2, FiSettings, FiUsers, FiLogOut, FiDownload, FiUpload, FiFileText, FiFile } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useView } from '../../context/ViewContext'
import { useTheme } from '../../context/ThemeContext'
import { useBoard } from '../../context/BoardContext'
import ImportModal from '../Modals/ImportModal'
import { downloadJSON, downloadCSV, ExportOptions } from '../../utils/exportUtils'
import styles from './Header.module.css'

export default function UserMenu() {
  const { user, profile, signOutUser } = useAuth()
  const { setView } = useView()
  const { theme, toggleTheme } = useTheme()
  const { state, exportData } = useBoard()
  const [isOpen, setIsOpen] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = profile?.full_name || user?.user_metadata?.name || 'User'

  const handleExport = (format: 'json' | 'csv') => {
    if (!state.board || !state.columns || !state.tasks) return

    const options: ExportOptions = {
      format,
      includeArchived: false
    }

    if (format === 'json') {
      downloadJSON(state.board, state.columns, state.tasks, options)
    } else {
      downloadCSV(state.columns, state.tasks, options)
    }
    setIsOpen(false)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={styles.userMenu} ref={menuRef}>
      <button
        className={styles.userBtn}
        onClick={() => setIsOpen(!isOpen)}
        title={displayName}
      >
        <div className={styles.userAvatar}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" />
          ) : (
            <span>{displayName?.charAt(0).toUpperCase() || 'U'}</span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className={styles.userDropdown}>
          <div className={styles.userDropdownHeader}>
            <span className={styles.userDropdownName}>{displayName}</span>
            <span className={styles.userDropdownEmail}>{user?.email}</span>
          </div>
          <div className={styles.userDropdownDivider} />
          <button
            className={styles.userDropdownItem}
            onClick={() => {
              setView('settings')
              setIsOpen(false)
            }}
          >
            <FiEdit2 /> Edit Profile
          </button>
          <div className={styles.userDropdownDivider} />
          <div className={styles.userDropdownSection}>
            <span className={styles.userDropdownSectionTitle}>TEAM & REPORTS</span>
            <button
              className={styles.userDropdownItem}
              onClick={() => {
                setView('team')
                setIsOpen(false)
              }}
            >
              <FiUsers /> Team
            </button>
            <button
              className={styles.userDropdownItem}
              onClick={() => {
                setView('reports')
                setIsOpen(false)
              }}
            >
              <FiBarChart2 /> Reports
            </button>
          </div>
          <div className={styles.userDropdownDivider} />
          <div className={styles.userDropdownSection}>
            <span className={styles.userDropdownSectionTitle}>DATA</span>
            <button
              className={styles.userDropdownItem}
              onClick={() => handleExport('json')}
            >
              <FiFileText /> Export as JSON
            </button>
            <button
              className={styles.userDropdownItem}
              onClick={() => handleExport('csv')}
            >
              <FiFile /> Export as CSV
            </button>
            <button
              className={styles.userDropdownItem}
              onClick={() => {
                setShowImportModal(true)
                setIsOpen(false)
              }}
            >
              <FiUpload /> Import Tasks
            </button>
          </div>
          <div className={styles.userDropdownDivider} />
          <div className={styles.userDropdownSection}>
            <span className={styles.userDropdownSectionTitle}>PREFERENCES</span>
            <button
              className={styles.userDropdownItem}
              onClick={() => {
                setView('settings')
                setIsOpen(false)
              }}
            >
              <FiSettings /> Settings
            </button>
            <button
              className={styles.userDropdownItem}
              onClick={() => {
                toggleTheme()
              }}
            >
              {theme === 'dark' ? <FiSun /> : <FiMoon />} Dark Mode
              <span className={styles.toggleBadge}>{theme === 'dark' ? 'On' : 'Off'}</span>
            </button>
            <button
              className={styles.userDropdownItem}
              onClick={() => {
                setView('help')
                setIsOpen(false)
              }}
            >
              <FiHelpCircle /> Help
            </button>
          </div>
          <div className={styles.userDropdownDivider} />
          <button
            className={styles.userDropdownItem}
            onClick={() => {
              signOutUser()
              setIsOpen(false)
            }}
          >
            <FiLogOut /> Log Out
          </button>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  )
}
