import { useState, useEffect, useCallback } from 'react'
import { FiPlay, FiPause, FiRotateCcw, FiSettings, FiVolume2, FiVolumeX } from 'react-icons/fi'
import styles from './Board.module.css'

type TimerMode = 'work' | 'shortBreak' | 'longBreak'

const DEFAULT_TIMES = {
  work: 25 * 60,        // 25 minutes
  shortBreak: 5 * 60,   // 5 minutes
  longBreak: 15 * 60    // 15 minutes
}

const POMODORO_KEY = 'kanban_pomodoro'

export default function PomodoroTimer() {
  const [isOpen, setIsOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMES.work)
  const [sessions, setSessions] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [customTimes, setCustomTimes] = useState(DEFAULT_TIMES)
  const [showSettings, setShowSettings] = useState(false)

  // Load state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(POMODORO_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        setSessions(data.sessions || 0)
        setSoundEnabled(data.soundEnabled ?? true)
        if (data.customTimes) {
          setCustomTimes(data.customTimes)
        }
      }
    } catch (e) {
      console.error('Error loading pomodoro state:', e)
    }
  }, [])

  // Save state to localStorage
  const saveState = useCallback((newSessions: number, newSound: boolean) => {
    localStorage.setItem(POMODORO_KEY, JSON.stringify({
      sessions: newSessions,
      soundEnabled: newSound,
      customTimes
    }))
  }, [customTimes])

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      // Timer completed
      setIsRunning(false)
      playSound()

      if (mode === 'work') {
        const newSessions = sessions + 1
        setSessions(newSessions)
        saveState(newSessions, soundEnabled)

        // Auto switch to break
        if (newSessions % 4 === 0) {
          setMode('longBreak')
          setTimeLeft(customTimes.longBreak)
        } else {
          setMode('shortBreak')
          setTimeLeft(customTimes.shortBreak)
        }
      } else {
        setMode('work')
        setTimeLeft(customTimes.work)
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft, mode, sessions, soundEnabled, customTimes, saveState])

  // Play notification sound
  const playSound = () => {
    if (!soundEnabled) return
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp2ZlI2GgX13c3V3f4aQm56dmJOPi4aDgH57eXl8goaMkZidnZqXk46Kh4OBf318fIGFjI+TmZ2dmpiVko+Kh4OBf359fYGEiYyQk5aXl5aUko+MiYWBf359fH+BhYmMj5KTlJOTko+MiYmFgn9+fXx/gYSJi4yPkJKSkZCQj42LioWBf359fH6AhImKjI2Oj5CQj46OjYuKh4SDgX9+fXt8f4GEh4mKiw')
      audio.play()
    } catch (e) {
      console.log('Could not play sound')
    }
  }

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setTimeLeft(customTimes[mode])
  }

  const changeMode = (newMode: TimerMode) => {
    setIsRunning(false)
    setMode(newMode)
    setTimeLeft(customTimes[newMode])
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercent = () => {
    const totalTime = customTimes[mode]
    return ((totalTime - timeLeft) / totalTime) * 100
  }

  const handleCustomTimeChange = (type: TimerMode, value: number) => {
    const newTimes = { ...customTimes, [type]: value * 60 }
    setCustomTimes(newTimes)
    if (mode === type && !isRunning) {
      setTimeLeft(value * 60)
    }
  }

  const getModeLabel = () => {
    switch (mode) {
      case 'work': return 'Focus'
      case 'shortBreak': return 'Short Break'
      case 'longBreak': return 'Long Break'
    }
  }

  const getModeColor = () => {
    switch (mode) {
      case 'work': return '#ef4444'
      case 'shortBreak': return '#22c55e'
      case 'longBreak': return '#3b82f6'
    }
  }

  // Compact view (closed)
  if (!isOpen) {
    return (
      <div
        className={styles.pomodoroCompact}
        onClick={() => setIsOpen(true)}
        title="Pomodoro Timer"
      >
        <div
          className={styles.pomodoroRing}
          style={{
            background: `conic-gradient(${getModeColor()} ${getProgressPercent()}%, var(--bg-tertiary) ${getProgressPercent()}%)`
          }}
        >
          <div className={styles.pomodoroRingInner}>
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>
    )
  }

  // Expanded view
  return (
    <div className={styles.pomodoroExpanded}>
      <div className={styles.pomodoroHeader}>
        <span style={{ color: getModeColor() }}>🍅 {getModeLabel()}</span>
        <div className={styles.pomodoroHeaderActions}>
          <button onClick={() => setSoundEnabled(!soundEnabled)} title={soundEnabled ? 'Mute' : 'Unmute'}>
            {soundEnabled ? <FiVolume2 /> : <FiVolumeX />}
          </button>
          <button onClick={() => setShowSettings(!showSettings)} title="Settings">
            <FiSettings />
          </button>
          <button onClick={() => setIsOpen(false)} title="Minimize">
            ×
          </button>
        </div>
      </div>

      {showSettings ? (
        <div className={styles.pomodoroSettings}>
          <div className={styles.pomodoroSettingRow}>
            <label>Focus</label>
            <input
              type="number"
              min={1}
              max={60}
              value={customTimes.work / 60}
              onChange={(e) => handleCustomTimeChange('work', parseInt(e.target.value) || 25)}
            />
            <span>min</span>
          </div>
          <div className={styles.pomodoroSettingRow}>
            <label>Short Break</label>
            <input
              type="number"
              min={1}
              max={30}
              value={customTimes.shortBreak / 60}
              onChange={(e) => handleCustomTimeChange('shortBreak', parseInt(e.target.value) || 5)}
            />
            <span>min</span>
          </div>
          <div className={styles.pomodoroSettingRow}>
            <label>Long Break</label>
            <input
              type="number"
              min={1}
              max={60}
              value={customTimes.longBreak / 60}
              onChange={(e) => handleCustomTimeChange('longBreak', parseInt(e.target.value) || 15)}
            />
            <span>min</span>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.pomodoroTimer}>
            <div
              className={styles.pomodoroCircle}
              style={{
                background: `conic-gradient(${getModeColor()} ${getProgressPercent()}%, var(--bg-tertiary) ${getProgressPercent()}%)`
              }}
            >
              <div className={styles.pomodoroCircleInner}>
                <span className={styles.pomodoroTime}>{formatTime(timeLeft)}</span>
                <span className={styles.pomodoroMode}>{getModeLabel()}</span>
              </div>
            </div>
          </div>

          <div className={styles.pomodoroControls}>
            <button onClick={resetTimer} title="Reset">
              <FiRotateCcw />
            </button>
            <button
              className={styles.pomodoroPlayBtn}
              onClick={toggleTimer}
              style={{ backgroundColor: getModeColor() }}
            >
              {isRunning ? <FiPause /> : <FiPlay />}
            </button>
          </div>

          <div className={styles.pomodoroModes}>
            <button
              className={mode === 'work' ? styles.active : ''}
              onClick={() => changeMode('work')}
            >
              Focus
            </button>
            <button
              className={mode === 'shortBreak' ? styles.active : ''}
              onClick={() => changeMode('shortBreak')}
            >
              Short
            </button>
            <button
              className={mode === 'longBreak' ? styles.active : ''}
              onClick={() => changeMode('longBreak')}
            >
              Long
            </button>
          </div>

          <div className={styles.pomodoroStats}>
            <span>🍅 {sessions} sessions today</span>
          </div>
        </>
      )}
    </div>
  )
}
