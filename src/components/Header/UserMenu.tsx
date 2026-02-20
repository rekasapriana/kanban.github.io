import { useState, useRef, useEffect } from 'react'
import { FiUser, FiChevronDown, FiLogOut } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import styles from './Header.module.css'

export default function UserMenu() {
  const { profile, signOutUser } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
      >
        <div className={styles.userAvatar}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" />
          ) : (
            <FiUser />
          )}
        </div>
        <span>{profile?.full_name || profile?.email?.split('@')[0] || 'User'}</span>
        <FiChevronDown />
      </button>

      {isOpen && (
        <div className={`${styles.userDropdown} ${styles.show}`}>
          <button onClick={signOutUser}>
            <FiLogOut />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
