import { useState, useEffect, useCallback } from 'react'
import { FiPlay, FiSquare, FiClock, FiPlus, FiTrash2 } from 'react-icons/fi'
import * as api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import type { TimeEntry } from '../../types/database'
import styles from './TimeTracker.module.css'

interface TimeTrackerProps {
  taskId: string
  timerStartedAt?: string | null
  timerUserId?: string | null
  onTimerUpdate?: () => void
}

export default function TimeTracker({ taskId, timerStartedAt, timerUserId, onTimerUpdate }: TimeTrackerProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualHours, setManualHours] = useState(0)
  const [manualMinutes, setManualMinutes] = useState(0)
  const [manualDescription, setManualDescription] = useState('')

  // Load time entries
  useEffect(() => {
    loadTimeEntries()
  }, [taskId])

  // Check if timer is running
  useEffect(() => {
    if (timerStartedAt && timerUserId === user?.id) {
      setIsRunning(true)
      const start = new Date(timerStartedAt).getTime()
      const now = Date.now()
      setElapsedTime(Math.floor((now - start) / 1000))
    } else {
      setIsRunning(false)
    }
  }, [timerStartedAt, timerUserId, user?.id])

  // Update elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timerStartedAt) {
      interval = setInterval(() => {
        const start = new Date(timerStartedAt).getTime()
        const now = Date.now()
        setElapsedTime(Math.floor((now - start) / 1000))
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timerStartedAt])

  const loadTimeEntries = async () => {
    const { data, error } = await api.getTimeEntries(taskId)
    if (data) {
      setTimeEntries(data)
    }
  }

  const handleStartTimer = async () => {
    if (!user) return

    const { error } = await api.startTimeTracking(taskId, user.id)
    if (error) {
      showToast('Failed to start timer', 'error')
      return
    }

    setIsRunning(true)
    setElapsedTime(0)
    showToast('Timer started', 'success')
    onTimerUpdate?.()
  }

  const handleStopTimer = async () => {
    const { error } = await api.stopTimeTracking(taskId)
    if (error) {
      showToast('Failed to stop timer', 'error')
      return
    }

    setIsRunning(false)
    showToast('Timer stopped', 'success')
    loadTimeEntries()
    onTimerUpdate?.()
  }

  const handleAddManualEntry = async () => {
    if (!user) return
    if (manualHours === 0 && manualMinutes === 0) {
      showToast('Please enter a duration', 'error')
      return
    }

    const durationSeconds = (manualHours * 3600) + (manualMinutes * 60)

    const { error } = await api.createTimeEntry({
      task_id: taskId,
      user_id: user.id,
      duration_seconds: durationSeconds,
      description: manualDescription || null
    })

    if (error) {
      showToast('Failed to add time entry', 'error')
      return
    }

    setShowManualEntry(false)
    setManualHours(0)
    setManualMinutes(0)
    setManualDescription('')
    showToast('Time entry added', 'success')
    loadTimeEntries()
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Delete this time entry?')) return

    const { error } = await api.deleteTimeEntry(entryId)
    if (error) {
      showToast('Failed to delete time entry', 'error')
      return
    }

    showToast('Time entry deleted', 'info')
    loadTimeEntries()
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const totalTime = timeEntries.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0)

  return (
    <div className={styles.timeTracker}>
      <div className={styles.timeTrackerHeader}>
        <h3 className={styles.timeTrackerTitle}>
          <FiClock /> Time Tracking
        </h3>
        <button
          className={styles.manualBtn}
          onClick={() => setShowManualEntry(!showManualEntry)}
          title="Add manual entry"
        >
          <FiPlus />
        </button>
      </div>

      {/* Timer Display */}
      <div className={`${styles.timerDisplay} ${isRunning ? styles.running : ''}`}>
        {formatTime(elapsedTime)}
      </div>

      {/* Timer Controls */}
      <div className={styles.timerControls}>
        {isRunning ? (
          <button className={`${styles.timerBtn} ${styles.stop}`} onClick={handleStopTimer}>
            <FiSquare /> Stop
          </button>
        ) : (
          <button className={`${styles.timerBtn} ${styles.start}`} onClick={handleStartTimer}>
            <FiPlay /> Start
          </button>
        )}
        <button
          className={`${styles.timerBtn} ${styles.manual}`}
          onClick={() => setShowManualEntry(!showManualEntry)}
        >
          <FiPlus /> Manual
        </button>
      </div>

      {/* Manual Entry Form */}
      {showManualEntry && (
        <div className={styles.manualEntryForm}>
          <div className={styles.manualEntryRow}>
            <div className={styles.manualEntryField}>
              <label>Hours</label>
              <input
                type="number"
                min="0"
                max="99"
                value={manualHours}
                onChange={(e) => setManualHours(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className={styles.manualEntryField}>
              <label>Minutes</label>
              <input
                type="number"
                min="0"
                max="59"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className={styles.manualEntryField}>
            <label>Description (optional)</label>
            <input
              type="text"
              placeholder="What did you work on?"
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
            />
          </div>
          <button className={styles.addEntryBtn} onClick={handleAddManualEntry}>
            Add Entry
          </button>
        </div>
      )}

      {/* Time Entries List */}
      <div className={styles.timeEntriesList}>
        <div className={styles.timeEntriesHeader}>
          <span className={styles.timeEntriesTitle}>Time Log</span>
          <span className={styles.timeTotal}>Total: {formatDuration(totalTime)}</span>
        </div>

        {timeEntries.length > 0 ? (
          <div className={styles.entriesContainer}>
            {timeEntries.slice(0, 10).map(entry => (
              <div key={entry.id} className={styles.timeEntryItem}>
                <span className={styles.timeEntryDuration}>
                  {formatDuration(entry.duration_seconds)}
                </span>
                <div className={styles.timeEntryInfo}>
                  <span className={styles.timeEntryDescription}>
                    {entry.description || 'Work session'}
                  </span>
                  <span className={styles.timeEntryDate}>
                    {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className={styles.timeEntryDelete}
                  onClick={() => handleDeleteEntry(entry.id)}
                  title="Delete entry"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
            {timeEntries.length > 10 && (
              <div className={styles.moreEntries}>
                +{timeEntries.length - 10} more entries
              </div>
            )}
          </div>
        ) : (
          <div className={styles.noEntries}>
            No time logged yet. Start the timer or add a manual entry.
          </div>
        )}
      </div>
    </div>
  )
}
