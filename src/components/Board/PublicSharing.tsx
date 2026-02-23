import { useState } from 'react'
import { FiShare2, FiLink, FiCopy, FiCheck, FiLock, FiGlobe, FiUsers } from 'react-icons/fi'
import { useToast } from '../../hooks/useToast'
import styles from './Board.module.css'

interface ShareSettings {
  isPublic: boolean
  allowEdit: boolean
  password?: string
  expiresAt?: string
}

export default function PublicSharing() {
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [settings, setSettings] = useState<ShareSettings>({
    isPublic: false,
    allowEdit: false
  })

  // Generate share link
  const getShareLink = () => {
    const baseUrl = window.location.origin
    const boardId = 'demo-board' // In real app, get from context
    return `${baseUrl}/share/${boardId}?token=${generateToken()}`
  }

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const handleCopyLink = () => {
    const link = getShareLink()
    navigator.clipboard.writeText(link)
    setCopied(true)
    showToast('Link copied to clipboard', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTogglePublic = () => {
    setSettings(prev => ({ ...prev, isPublic: !prev.isPublic }))
  }

  const handleToggleEdit = () => {
    setSettings(prev => ({ ...prev, allowEdit: !prev.allowEdit }))
  }

  return (
    <div className={styles.sharingWrapper}>
      <button
        className={styles.sharingBtn}
        onClick={() => setIsOpen(!isOpen)}
        title="Share Board"
      >
        <FiShare2 />
      </button>

      {isOpen && (
        <div className={styles.sharingDropdown}>
          <div className={styles.sharingHeader}>
            <FiShare2 />
            <span>Share Board</span>
          </div>

          {/* Public Toggle */}
          <div className={styles.sharingOption}>
            <div className={styles.sharingOptionInfo}>
              <FiGlobe />
              <div>
                <h4>Public Access</h4>
                <p>Anyone with the link can view</p>
              </div>
            </div>
            <button
              className={`${styles.toggleSwitch} ${settings.isPublic ? styles.active : ''}`}
              onClick={handleTogglePublic}
            >
              <span className={styles.toggleSlider} />
            </button>
          </div>

          {/* Allow Edit */}
          {settings.isPublic && (
            <div className={styles.sharingOption}>
              <div className={styles.sharingOptionInfo}>
                <FiUsers />
                <div>
                  <h4>Allow Editing</h4>
                  <p>Viewers can make changes</p>
                </div>
              </div>
              <button
                className={`${styles.toggleSwitch} ${settings.allowEdit ? styles.active : ''}`}
                onClick={handleToggleEdit}
              >
                <span className={styles.toggleSlider} />
              </button>
            </div>
          )}

          {/* Password Protection */}
          {settings.isPublic && (
            <div className={styles.sharingOption}>
              <div className={styles.sharingOptionInfo}>
                <FiLock />
                <div>
                  <h4>Password Protection</h4>
                  <p>Require password to access</p>
                </div>
              </div>
              <input
                type="password"
                placeholder="Enter password"
                className={styles.passwordInput}
                value={settings.password || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          )}

          {/* Share Link */}
          {settings.isPublic && (
            <div className={styles.shareLinkSection}>
              <label>Share Link</label>
              <div className={styles.shareLinkInput}>
                <FiLink />
                <input
                  type="text"
                  value={getShareLink()}
                  readOnly
                />
                <button onClick={handleCopyLink} title="Copy link">
                  {copied ? <FiCheck /> : <FiCopy />}
                </button>
              </div>
            </div>
          )}

          {/* Invite by Email */}
          <div className={styles.inviteSection}>
            <label>Invite by Email</label>
            <div className={styles.inviteInput}>
              <input
                type="email"
                placeholder="Enter email address"
              />
              <button>Send</button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.sharingActions}>
            <button className={styles.sharingActionBtn}>
              <FiUsers /> Manage Members
            </button>
            <button className={styles.sharingActionBtn}>
              <FiLink /> Link Settings
            </button>
          </div>

          {/* Info */}
          {!settings.isPublic && (
            <div className={styles.sharingInfo}>
              <FiLock />
              <span>This board is private. Only invited members can access it.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
