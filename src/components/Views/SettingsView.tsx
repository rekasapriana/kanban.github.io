import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../hooks/useToast'
import { getUserSettings, upsertUserSettings, updateProfile, uploadAvatar } from '../../lib/api'
import { FiUser, FiBell, FiShield, FiGlobe, FiSave, FiMoon, FiSun, FiSliders, FiCamera } from 'react-icons/fi'
import styles from './Views.module.css'

export default function SettingsView() {
  const { user, profile, refreshProfile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'appearance' | 'privacy'>('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [settings, setSettings] = useState({
    name: '',
    email: '',
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: false,
    compactMode: false,
    showCompletedTasks: true,
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [user, profile])

  const loadSettings = async () => {
    if (!user) return
    setLoading(true)

    // Set profile info
    setSettings(prev => ({
      ...prev,
      name: profile?.full_name || user.user_metadata?.name || '',
      email: user.email || ''
    }))

    // Set avatar preview
    setAvatarPreview(profile?.avatar_url || user.user_metadata?.avatar_url || null)

    // Load user settings from database
    const { data } = await getUserSettings(user.id)
    if (data) {
      setSettings(prev => ({
        ...prev,
        emailNotifications: data.email_notifications,
        pushNotifications: data.push_notifications,
        weeklyDigest: data.weekly_digest,
        compactMode: data.compact_mode,
        showCompletedTasks: data.show_completed_tasks,
      }))
    }
    setLoading(false)
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be less than 2MB', 'error')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to storage
    setUploadingAvatar(true)
    try {
      const { url, error } = await uploadAvatar(user.id, file)
      if (error) {
        showToast('Failed to upload image', 'error')
        return
      }

      // Update profile with new avatar URL
      const { error: updateError } = await updateProfile(user.id, { avatar_url: url })
      if (updateError) {
        showToast('Failed to update profile', 'error')
        return
      }

      await refreshProfile()
      showToast('Profile photo updated!', 'success')
    } catch (err) {
      showToast('Failed to upload image', 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleToggle = async (key: keyof typeof settings) => {
    const newValue = !settings[key as keyof typeof settings]
    setSettings({ ...settings, [key]: newValue })

    // Save to database for notification/appearance settings
    if (user && ['emailNotifications', 'pushNotifications', 'weeklyDigest', 'compactMode', 'showCompletedTasks'].includes(key)) {
      const keyMap: Record<string, string> = {
        emailNotifications: 'email_notifications',
        pushNotifications: 'push_notifications',
        weeklyDigest: 'weekly_digest',
        compactMode: 'compact_mode',
        showCompletedTasks: 'show_completed_tasks'
      }
      const dbKey = keyMap[key]
      await upsertUserSettings({
        user_id: user.id,
        email_notifications: settings.emailNotifications,
        push_notifications: settings.pushNotifications,
        weekly_digest: settings.weeklyDigest,
        compact_mode: settings.compactMode,
        show_completed_tasks: settings.showCompletedTasks,
        [dbKey]: newValue
      })
      showToast('Settings saved!', 'success')
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !settings.name.trim()) return
    setSaving(true)

    try {
      const { error } = await updateProfile(user.id, {
        full_name: settings.name.trim()
      })

      if (error) {
        showToast('Failed to update profile', 'error')
        return
      }

      await refreshProfile()
      showToast('Profile saved!', 'success')
    } catch (err) {
      showToast('Failed to save profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'notifications', label: 'Notifications', icon: FiBell },
    { id: 'appearance', label: 'Appearance', icon: FiSliders },
    { id: 'privacy', label: 'Privacy', icon: FiShield },
  ]

  if (loading) {
    return (
      <div className={styles.settingsView}>
        <div className={styles.loading}>Loading settings...</div>
      </div>
    )
  }

  const displayName = profile?.full_name || user?.user_metadata?.name || 'User'

  return (
    <div className={styles.settingsView}>
      {/* Header */}
      <div className={styles.settingsHeader}>
        <div className={styles.settingsTitle}>
          <div className={styles.settingsIcon}>
            <FiUser />
          </div>
          <div>
            <h1>Settings</h1>
            <p>Manage your account and preferences</p>
          </div>
        </div>
      </div>

      <div className={styles.settingsLayout}>
        {/* Settings Tabs */}
        <div className={styles.settingsTabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.settingsTab} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              <tab.icon />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className={styles.settingsContent}>
          {activeTab === 'profile' && (
            <div className={styles.settingsSection}>
              <h2>Profile Settings</h2>

              {/* Avatar Section */}
              <div className={styles.avatarSection}>
                <div className={styles.avatarWrapper}>
                  <div className={styles.avatarLarge} onClick={handleAvatarClick}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt={displayName} />
                    ) : (
                      <span>{displayName?.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                    <div className={styles.avatarOverlay}>
                      {uploadingAvatar ? (
                        <span className={styles.uploadingSpinner} />
                      ) : (
                        <FiCamera />
                      )}
                    </div>
                  </div>
                  <div className={styles.avatarInfo}>
                    <h3>Profile Photo</h3>
                    <p>Click to change your photo</p>
                    <span className={styles.avatarHint}>JPG, PNG or GIF. Max 2MB.</span>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Full Name</label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  placeholder="Enter your name"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Email Address</label>
                <input
                  type="email"
                  value={settings.email}
                  disabled
                />
                <span className={styles.formHint}>Email cannot be changed</span>
              </div>
              <button
                className={styles.primaryBtn}
                onClick={handleSaveProfile}
                disabled={saving || uploadingAvatar}
              >
                <FiSave /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className={styles.settingsSection}>
              <h2>Notification Preferences</h2>
              <div className={styles.toggleGroup}>
                <div className={styles.toggleItem}>
                  <div>
                    <h4>Email Notifications</h4>
                    <p>Receive email updates about your tasks</p>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={() => handleToggle('emailNotifications')}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
                <div className={styles.toggleItem}>
                  <div>
                    <h4>Push Notifications</h4>
                    <p>Get notified in your browser</p>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.pushNotifications}
                      onChange={() => handleToggle('pushNotifications')}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
                <div className={styles.toggleItem}>
                  <div>
                    <h4>Weekly Digest</h4>
                    <p>Receive a weekly summary of your activity</p>
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={settings.weeklyDigest}
                      onChange={() => handleToggle('weeklyDigest')}
                    />
                    <span className={styles.slider} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className={styles.settingsSection}>
              <h2>Appearance</h2>
              <div className={styles.toggleItem}>
                <div>
                  <h4>Dark Mode</h4>
                  <p>Switch between light and dark theme</p>
                </div>
                <button className={styles.themeToggle} onClick={toggleTheme}>
                  {theme === 'dark' ? <FiSun /> : <FiMoon />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>
              <div className={styles.toggleItem}>
                <div>
                  <h4>Compact Mode</h4>
                  <p>Show more content with smaller UI elements</p>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={settings.compactMode}
                    onChange={() => handleToggle('compactMode')}
                  />
                  <span className={styles.slider} />
                </label>
              </div>
              <div className={styles.toggleItem}>
                <div>
                  <h4>Show Completed Tasks</h4>
                  <p>Display completed tasks in the board</p>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={settings.showCompletedTasks}
                    onChange={() => handleToggle('showCompletedTasks')}
                  />
                  <span className={styles.slider} />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className={styles.settingsSection}>
              <h2>Privacy & Security</h2>
              <div className={styles.privacyInfo}>
                <div className={styles.privacyItem}>
                  <FiShield />
                  <div>
                    <h4>Two-Factor Authentication</h4>
                    <p>Add an extra layer of security to your account</p>
                  </div>
                  <button className={styles.secondaryBtn}>Enable</button>
                </div>
                <div className={styles.privacyItem}>
                  <FiGlobe />
                  <div>
                    <h4>Data Export</h4>
                    <p>Download all your data</p>
                  </div>
                  <button className={styles.secondaryBtn}>Export</button>
                </div>
              </div>
              <div className={styles.dangerZone}>
                <h3>Danger Zone</h3>
                <button className={styles.dangerBtn}>Delete Account</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
