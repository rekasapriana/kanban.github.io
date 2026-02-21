import { useState, useRef, useEffect } from 'react'
import { FiEdit2, FiMoon, FiSun, FiHelpCircle, FiBarChart2, FiSettings, FiLogOut } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useView } from '../../context/ViewContext'
import { useTheme } from '../../context/ThemeContext'
import styles from './Header.module.css'

export default function UserMenu() {
  const { user, profile, signOutUser } = useAuth()
  const { setView } = useView()
  const { theme, toggleTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const displayName = profile?.full_name || user?.user_metadata?.name || 'User'

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
          <button
            className={styles.userDropdownItem}
            onClick={() => {
              setView('reports')
              setIsOpen(false)
            }}
          >
            <FiBarChart2 /> Team Reports
          </button>
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
    </div>
  )
}
