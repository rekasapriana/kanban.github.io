import { useState, useEffect } from 'react'
import { FiMail, FiCheck, FiClock, FiBell, FiSettings, FiSend } from 'react-icons/fi'
import { useToast } from '../../hooks/useToast'
import styles from './Views.module.css'

interface DigestSettings {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'never'
  time: string
  includeCompleted: boolean
  includeOverdue: boolean
  includeUpcoming: boolean
  includeNewTasks: boolean
  email: string
}

const DIGEST_KEY = 'kanban_email_digest'

export default function EmailDigestView() {
  const { showToast } = useToast()
  const [settings, setSettings] = useState<DigestSettings>({
    enabled: false,
    frequency: 'daily',
    time: '09:00',
    includeCompleted: true,
    includeOverdue: true,
    includeUpcoming: true,
    includeNewTasks: false,
    email: ''
  })
  const [loading, setLoading] = useState(false)
  const [testSent, setTestSent] = useState(false)

  // Load settings
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DIGEST_KEY)
      if (stored) {
        setSettings(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Error loading digest settings:', e)
    }
  }, [])

  // Save settings
  const saveSettings = () => {
    localStorage.setItem(DIGEST_KEY, JSON.stringify(settings))
    showToast('Settings saved', 'success')
  }

  const handleToggle = (key: keyof DigestSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleTestEmail = async () => {
    if (!settings.email) {
      showToast('Please enter an email address', 'error')
      return
    }

    setLoading(true)
    // Simulate sending email
    await new Promise(resolve => setTimeout(resolve, 1500))
    setLoading(false)
    setTestSent(true)
    showToast('Test email sent!', 'success')
    setTimeout(() => setTestSent(false), 3000)
  }

  const getNextDigestDate = () => {
    if (!settings.enabled || settings.frequency === 'never') return 'Never'

    const now = new Date()
    const [hours, minutes] = settings.time.split(':').map(Number)

    if (settings.frequency === 'daily') {
      const next = new Date(now)
      next.setHours(hours, minutes, 0, 0)
      if (next <= now) {
        next.setDate(next.getDate() + 1)
      }
      return next.toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' })
    }

    if (settings.frequency === 'weekly') {
      const next = new Date(now)
      next.setHours(hours, minutes, 0, 0)
      // Next Monday
      const daysUntilMonday = (1 + 7 - next.getDay()) % 7 || 7
      next.setDate(next.getDate() + daysUntilMonday)
      return next.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    }

    return 'Unknown'
  }

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div>
          <h1><FiMail /> Email Digest</h1>
          <p>Configure automated email reports and notifications</p>
        </div>
      </div>

      {/* Main Toggle */}
      <div className={styles.section}>
        <div className={styles.digestCard}>
          <div className={styles.digestHeader}>
            <div className={styles.digestIcon}>
              <FiBell />
            </div>
            <div className={styles.digestInfo}>
              <h3>Email Digest</h3>
              <p>Receive automated summaries of your board activity</p>
            </div>
            <button
              className={`${styles.toggleBtn} ${settings.enabled ? styles.active : ''}`}
              onClick={() => handleToggle('enabled')}
            >
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {settings.enabled && (
            <div className={styles.digestSchedule}>
              <div className={styles.scheduleItem}>
                <FiClock />
                <span>Next digest: <strong>{getNextDigestDate()}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FiSettings /> Settings
        </h2>

        <div className={styles.settingsGrid}>
          {/* Frequency */}
          <div className={styles.settingItem}>
            <label>Frequency</label>
            <select
              value={settings.frequency}
              onChange={(e) => setSettings(prev => ({ ...prev, frequency: e.target.value as any }))}
            >
              <option value="never">Never</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          {/* Time */}
          <div className={styles.settingItem}>
            <label>Time</label>
            <input
              type="time"
              value={settings.time}
              onChange={(e) => setSettings(prev => ({ ...prev, time: e.target.value }))}
            />
          </div>

          {/* Email */}
          <div className={styles.settingItem}>
            <label>Email Address</label>
            <div className={styles.emailInput}>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your@email.com"
              />
              <button onClick={handleTestEmail} disabled={loading}>
                {loading ? 'Sending...' : testSent ? <><FiCheck /> Sent!</> : <><FiSend /> Test</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Options */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FiMail /> Email Content
        </h2>

        <div className={styles.contentOptions}>
          <div className={styles.contentOption}>
            <div className={styles.optionInfo}>
              <FiCheck />
              <div>
                <h4>Completed Tasks</h4>
                <p>Summary of tasks you completed</p>
              </div>
            </div>
            <button
              className={`${styles.checkboxBtn} ${settings.includeCompleted ? styles.checked : ''}`}
              onClick={() => handleToggle('includeCompleted')}
            >
              {settings.includeCompleted && <FiCheck />}
            </button>
          </div>

          <div className={styles.contentOption}>
            <div className={styles.optionInfo}>
              <FiClock />
              <div>
                <h4>Overdue Tasks</h4>
                <p>Tasks past their due date</p>
              </div>
            </div>
            <button
              className={`${styles.checkboxBtn} ${settings.includeOverdue ? styles.checked : ''}`}
              onClick={() => handleToggle('includeOverdue')}
            >
              {settings.includeOverdue && <FiCheck />}
            </button>
          </div>

          <div className={styles.contentOption}>
            <div className={styles.optionInfo}>
              <FiBell />
              <div>
                <h4>Upcoming Deadlines</h4>
                <p>Tasks due soon</p>
              </div>
            </div>
            <button
              className={`${styles.checkboxBtn} ${settings.includeUpcoming ? styles.checked : ''}`}
              onClick={() => handleToggle('includeUpcoming')}
            >
              {settings.includeUpcoming && <FiCheck />}
            </button>
          </div>

          <div className={styles.contentOption}>
            <div className={styles.optionInfo}>
              <FiMail />
              <div>
                <h4>New Tasks</h4>
                <p>Recently created tasks</p>
              </div>
            </div>
            <button
              className={`${styles.checkboxBtn} ${settings.includeNewTasks ? styles.checked : ''}`}
              onClick={() => handleToggle('includeNewTasks')}
            >
              {settings.includeNewTasks && <FiCheck />}
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Preview</h2>
        <div className={styles.emailPreview}>
          <div className={styles.previewHeader}>
            <h4>📋 Your Daily Kanban Digest</h4>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          <div className={styles.previewBody}>
            {settings.includeCompleted && (
              <div className={styles.previewSection}>
                <h5>✅ Completed Today (3)</h5>
                <ul>
                  <li>Fix login bug</li>
                  <li>Update dashboard</li>
                  <li>Review PR #42</li>
                </ul>
              </div>
            )}
            {settings.includeOverdue && (
              <div className={styles.previewSection}>
                <h5>⚠️ Overdue (1)</h5>
                <ul>
                  <li>API documentation</li>
                </ul>
              </div>
            )}
            {settings.includeUpcoming && (
              <div className={styles.previewSection}>
                <h5>📅 Due Tomorrow (2)</h5>
                <ul>
                  <li>Sprint planning meeting</li>
                  <li>Deploy to staging</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className={styles.section}>
        <button className={styles.primaryBtn} onClick={saveSettings}>
          <FiCheck /> Save Settings
        </button>
      </div>
    </div>
  )
}
