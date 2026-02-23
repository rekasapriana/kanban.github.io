import { useState, useEffect } from 'react'
import { FiTarget, FiCheck, FiX, FiTrendingUp } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import styles from './Board.module.css'

const GOAL_KEY = 'kanban_daily_goal'
const COMPLETED_TODAY_KEY = 'kanban_completed_today'

export default function DailyGoals() {
  const { state } = useBoard()
  const [goal, setGoal] = useState(5)
  const [completedToday, setCompletedToday] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [tempGoal, setTempGoal] = useState(goal)

  // Load goal and completed count from localStorage
  useEffect(() => {
    try {
      const storedGoal = localStorage.getItem(GOAL_KEY)
      if (storedGoal) {
        setGoal(parseInt(storedGoal, 10))
        setTempGoal(parseInt(storedGoal, 10))
      }

      const storedCompleted = localStorage.getItem(COMPLETED_TODAY_KEY)
      if (storedCompleted) {
        const { date, count } = JSON.parse(storedCompleted)
        const today = new Date().toDateString()
        if (date === today) {
          setCompletedToday(count)
        } else {
          // Reset for new day
          localStorage.setItem(COMPLETED_TODAY_KEY, JSON.stringify({ date: today, count: 0 }))
          setCompletedToday(0)
        }
      }
    } catch (e) {
      console.error('Error loading daily goal:', e)
    }
  }, [])

  // Track completed tasks
  useEffect(() => {
    const doneColumn = state.columns.find(c => c.title.toLowerCase() === 'done')
    if (!doneColumn) return

    // Count tasks completed today (based on updated_at)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const completed = state.tasks.filter(task => {
      if (task.column_id !== doneColumn.id) return false
      const updatedAt = new Date(task.updated_at)
      updatedAt.setHours(0, 0, 0, 0)
      return updatedAt.getTime() === today.getTime()
    }).length

    setCompletedToday(completed)

    // Save to localStorage
    try {
      localStorage.setItem(COMPLETED_TODAY_KEY, JSON.stringify({
        date: new Date().toDateString(),
        count: completed
      }))
    } catch (e) {
      console.error('Error saving completed count:', e)
    }
  }, [state.tasks, state.columns])

  const saveGoal = () => {
    const newGoal = Math.max(1, Math.min(50, tempGoal))
    setGoal(newGoal)
    setTempGoal(newGoal)
    setIsEditing(false)
    localStorage.setItem(GOAL_KEY, newGoal.toString())
  }

  const cancelEdit = () => {
    setTempGoal(goal)
    setIsEditing(false)
  }

  const progress = Math.min(100, (completedToday / goal) * 100)
  const isGoalMet = completedToday >= goal

  return (
    <div className={`${styles.dailyGoals} ${isGoalMet ? styles.goalMet : ''}`}>
      <div className={styles.dailyGoalsHeader}>
        <FiTarget />
        <span>Goal</span>
      </div>

      <div className={styles.dailyGoalsContent}>
        {isEditing ? (
          <div className={styles.goalEditForm}>
            <input
              type="number"
              min={1}
              max={50}
              value={tempGoal}
              onChange={(e) => setTempGoal(parseInt(e.target.value, 10) || 1)}
              onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
              autoFocus
            />
            <button onClick={saveGoal} title="Save">
              <FiCheck />
            </button>
            <button onClick={cancelEdit} title="Cancel">
              <FiX />
            </button>
          </div>
        ) : (
          <div className={styles.goalDisplay} onClick={() => setIsEditing(true)}>
            <div className={styles.goalNumbers}>
              <span className={styles.completedCount}>{completedToday}</span>
              <span className={styles.goalSeparator}>/</span>
              <span className={styles.goalTarget}>{goal}</span>
            </div>
            <div className={styles.goalProgressBar}>
              <div
                className={styles.goalProgressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {isGoalMet && (
        <FiTrendingUp style={{ color: '#22c55e', fontSize: '0.875rem' }} title="Goal achieved!" />
      )}
    </div>
  )
}
