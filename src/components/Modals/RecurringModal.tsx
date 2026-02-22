import { useState, useEffect } from 'react'
import { FiRepeat, FiX, FiCalendar, FiClock } from 'react-icons/fi'
import * as api from '../../lib/api'
import { useToast } from '../../hooks/useToast'
import type { RecurringPattern, RecurringPatternInsert } from '../../types/database'
import styles from './RecurringModal.module.css'

interface RecurringModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  existingPattern?: RecurringPattern | null
  onSaved: () => void
}

type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function RecurringModal({
  isOpen,
  onClose,
  taskId,
  existingPattern,
  onSaved
}: RecurringModalProps) {
  const { showToast } = useToast()
  const [frequency, setFrequency] = useState<Frequency>('weekly')
  const [interval, setInterval] = useState(1)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [endDate, setEndDate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)

  // Load existing pattern
  useEffect(() => {
    if (existingPattern) {
      setFrequency(existingPattern.frequency)
      setInterval(existingPattern.interval_value)
      setSelectedDays(existingPattern.days_of_week || [])
      setDayOfMonth(existingPattern.day_of_month || 1)
      setEndDate(existingPattern.end_date ? existingPattern.end_date.split('T')[0] : '')
      setIsActive(existingPattern.is_active)
    } else {
      // Reset to defaults
      setFrequency('weekly')
      setInterval(1)
      setSelectedDays([])
      setDayOfMonth(1)
      setEndDate('')
      setIsActive(true)
    }
  }, [existingPattern, isOpen])

  const handleDayToggle = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    )
  }

  const handleSave = async () => {
    setLoading(true)

    const patternData: RecurringPatternInsert = {
      task_id: taskId,
      frequency,
      interval_value: interval,
      days_of_week: frequency === 'weekly' && selectedDays.length > 0 ? selectedDays : null,
      day_of_month: frequency === 'monthly' ? dayOfMonth : null,
      end_date: endDate ? new Date(endDate).toISOString() : null,
      is_active: isActive
    }

    let error
    if (existingPattern) {
      const result = await api.updateRecurringPattern(existingPattern.id, patternData)
      error = result.error
    } else {
      const result = await api.createRecurringPattern(patternData)
      error = result.error
    }

    setLoading(false)

    if (error) {
      showToast('Failed to save recurring pattern', 'error')
      return
    }

    showToast(existingPattern ? 'Recurring pattern updated' : 'Recurring pattern created', 'success')
    onSaved()
    onClose()
  }

  const handleDelete = async () => {
    if (!existingPattern) return
    if (!confirm('Delete this recurring pattern?')) return

    setLoading(true)
    const { error } = await api.deleteRecurringPattern(existingPattern.id)
    setLoading(false)

    if (error) {
      showToast('Failed to delete recurring pattern', 'error')
      return
    }

    showToast('Recurring pattern deleted', 'info')
    onSaved()
    onClose()
  }

  const getIntervalLabel = () => {
    switch (frequency) {
      case 'daily': return interval === 1 ? 'Day' : 'Days'
      case 'weekly': return interval === 1 ? 'Week' : 'Weeks'
      case 'monthly': return interval === 1 ? 'Month' : 'Months'
      case 'yearly': return interval === 1 ? 'Year' : 'Years'
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.modal}>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <FiRepeat />
            <h3>Recurring Task</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className={styles.body}>
          {/* Frequency Selection */}
          <div className={styles.field}>
            <label>Frequency</label>
            <div className={styles.frequencyOptions}>
              {(['daily', 'weekly', 'monthly', 'yearly'] as Frequency[]).map(f => (
                <button
                  key={f}
                  className={`${styles.frequencyBtn} ${frequency === f ? styles.active : ''}`}
                  onClick={() => setFrequency(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          <div className={styles.field}>
            <label>Repeat every</label>
            <div className={styles.intervalRow}>
              <input
                type="number"
                min="1"
                max="99"
                value={interval}
                onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                className={styles.intervalInput}
              />
              <span className={styles.intervalLabel}>{getIntervalLabel()}</span>
            </div>
          </div>

          {/* Days of Week (for weekly) */}
          {frequency === 'weekly' && (
            <div className={styles.field}>
              <label>On days (optional)</label>
              <div className={styles.daysRow}>
                {DAYS.map((day, index) => (
                  <button
                    key={day}
                    className={`${styles.dayBtn} ${selectedDays.includes(index) ? styles.active : ''}`}
                    onClick={() => handleDayToggle(index)}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className={styles.fieldHint}>
                {selectedDays.length === 0
                  ? 'All days selected'
                  : `${selectedDays.length} day${selectedDays.length > 1 ? 's' : ''} selected`}
              </p>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {frequency === 'monthly' && (
            <div className={styles.field}>
              <label>On day of month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                className={styles.dayInput}
              />
            </div>
          )}

          {/* End Date */}
          <div className={styles.field}>
            <label>End date (optional)</label>
            <div className={styles.dateRow}>
              <FiCalendar className={styles.dateIcon} />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.dateInput}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <p className={styles.fieldHint}>
              Leave empty to repeat indefinitely
            </p>
          </div>

          {/* Active Toggle */}
          <div className={styles.field}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>Active</span>
            </label>
          </div>

          {/* Preview */}
          <div className={styles.preview}>
            <div className={styles.previewIcon}>
              <FiClock />
            </div>
            <div className={styles.previewText}>
              <strong>Preview:</strong>{' '}
              {isActive ? (
                <>
                  Repeats every {interval} {getIntervalLabel().toLowerCase()}
                  {frequency === 'weekly' && selectedDays.length > 0 && (
                    <> on {selectedDays.map(d => DAYS[d]).join(', ')}</>
                  )}
                  {frequency === 'monthly' && (
                    <> on day {dayOfMonth}</>
                  )}
                  {endDate && (
                    <> until {new Date(endDate).toLocaleDateString()}</>
                  )}
                </>
              ) : (
                <>Inactive - will not create new tasks</>
              )}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          {existingPattern && (
            <button
              className={styles.deleteBtn}
              onClick={handleDelete}
              disabled={loading}
            >
              Delete
            </button>
          )}
          <div className={styles.footerRight}>
            <button className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
