import { useState, useRef, useEffect } from 'react'
import { FiUser, FiSettings, FiLogOut, FiPlus, FiBriefcase } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useView } from '../../context/ViewContext'
import styles from './Header.module.css'

export default function UserMenu() {
  const { user, profile, signOutUser } = useAuth()
  const { setView } = useView()
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
          <div className={styles.userDropdownSection}>
            <span className={styles.userDropdownSectionTitle}>WORKSPACE</span>
            <button className={styles.userDropdownItem}>
              <FiBriefcase /> Kanban Ale Ale
              <span className={styles.workspaceBadge}>Active</span>
            </button>
            <button className={styles.userDropdownItem}>
              <FiPlus /> Add Workspace
            </button>
          </div>
          <div className={styles.userDropdownDivider} />
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
