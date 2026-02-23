import { useState, useEffect } from 'react'
import {
  FiPlus,
  FiX,
  FiPlay,
  FiCheckCircle,
  FiCalendar,
  FiTarget,
  FiTrendingUp,
  FiClock,
  FiChevronRight,
  FiEdit2,
  FiTrash2
} from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import styles from './Board.module.css'

interface Sprint {
  id: string
  name: string
  goal: string
  startDate: string
  endDate: string
  status: 'planning' | 'active' | 'completed'
  createdAt: string
}

const SPRINTS_KEY = 'kanban_sprints'

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

export default function SprintView({ onTaskClick }: { onTaskClick: (taskId: string) => void }) {
  const { state } = useBoard()
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null)
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Load sprints
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SPRINTS_KEY)
      if (stored) {
        setSprints(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Error loading sprints:', e)
    }
  }, [])

  // Save sprints
  const saveSprints = (newSprints: Sprint[]) => {
    localStorage.setItem(SPRINTS_KEY, JSON.stringify(newSprints))
    setSprints(newSprints)
  }

  // Get default dates (2 week sprint)
  const getDefaultDates = () => {
    const start = new Date()
    const end = new Date()
    end.setDate(end.getDate() + 14)
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }

  const openCreateForm = () => {
    const defaults = getDefaultDates()
    setName(`Sprint ${sprints.length + 1}`)
    setGoal('')
    setStartDate(defaults.start)
    setEndDate(defaults.end)
    setIsCreating(true)
    setEditingSprint(null)
  }

  const openEditForm = (sprint: Sprint) => {
    setName(sprint.name)
    setGoal(sprint.goal)
    setStartDate(sprint.startDate)
    setEndDate(sprint.endDate)
    setEditingSprint(sprint)
    setIsCreating(false)
  }

  const resetForm = () => {
    setName('')
    setGoal('')
    setStartDate('')
    setEndDate('')
    setIsCreating(false)
    setEditingSprint(null)
  }

  const handleSave = () => {
    if (!name.trim() || !startDate || !endDate) return

    if (editingSprint) {
      // Update existing
      saveSprints(sprints.map(s =>
        s.id === editingSprint.id
          ? { ...s, name, goal, startDate, endDate }
          : s
      ))
    } else {
      // Create new
      const newSprint: Sprint = {
        id: generateId(),
        name: name.trim(),
        goal: goal.trim(),
        startDate,
        endDate,
        status: 'planning',
        createdAt: new Date().toISOString()
      }
      saveSprints([newSprint, ...sprints])
    }

    resetForm()
  }

  const handleDelete = (sprintId: string) => {
    if (!confirm('Delete this sprint?')) return
    saveSprints(sprints.filter(s => s.id !== sprintId))
    if (selectedSprintId === sprintId) {
      setSelectedSprintId(null)
    }
  }

  const startSprint = (sprintId: string) => {
    saveSprints(sprints.map(s =>
      s.id === sprintId ? { ...s, status: 'active' } : s
    ))
  }

  const completeSprint = (sprintId: string) => {
    saveSprints(sprints.map(s =>
      s.id === sprintId ? { ...s, status: 'completed' } : s
    ))
  }

  // Get sprint tasks (tasks created/updated during sprint period)
  const getSprintTasks = (sprint: Sprint) => {
    const start = new Date(sprint.startDate)
    const end = new Date(sprint.endDate)
    end.setHours(23, 59, 59, 999)

    return state.tasks.filter(task => {
      const created = new Date(task.created_at)
      return created >= start && created <= end && !task.is_archived
    })
  }

  // Calculate sprint metrics
  const getSprintStats = (sprint: Sprint) => {
    const tasks = getSprintTasks(sprint)
    const doneColumn = state.columns.find(c => c.title.toLowerCase() === 'done')

    const total = tasks.length
    const completed = doneColumn ? tasks.filter(t => t.column_id === doneColumn.id).length : 0
    const remaining = total - completed

    // Calculate velocity (story points or task count)
    const velocity = completed

    // Progress percentage
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0

    return { total, completed, remaining, velocity, progress }
  }

  // Get days remaining for active sprint
  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const getStatusColor = (status: Sprint['status']) => {
    switch (status) {
      case 'planning': return '#6366f1'
      case 'active': return '#f59e0b'
      case 'completed': return '#22c55e'
    }
  }

  const selectedSprint = selectedSprintId ? sprints.find(s => s.id === selectedSprintId) : null

  return (
    <div className={styles.sprintView}>
      <div className={styles.sprintHeader}>
        <h2><FiTarget /> Sprint Planning</h2>
        <button className={styles.createSprintBtn} onClick={openCreateForm}>
          <FiPlus /> New Sprint
        </button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingSprint) && (
        <div className={styles.sprintForm}>
          <h3>{editingSprint ? 'Edit Sprint' : 'Create Sprint'}</h3>
          <div className={styles.formRow}>
            <label>Sprint Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sprint 1"
            />
          </div>
          <div className={styles.formRow}>
            <label>Sprint Goal</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What do you want to achieve in this sprint?"
              rows={2}
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.dateInputs}>
              <div>
                <label>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
            </div>
          </div>
          <div className={styles.formActions}>
            <button className={styles.cancelBtn} onClick={resetForm}>Cancel</button>
            <button className={styles.saveBtn} onClick={handleSave}>
              {editingSprint ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Sprint List */}
      <div className={styles.sprintList}>
        {sprints.length === 0 ? (
          <div className={styles.emptyState}>
            <FiTarget />
            <p>No sprints yet</p>
            <button onClick={openCreateForm}>Create your first sprint</button>
          </div>
        ) : (
          sprints.map(sprint => {
            const stats = getSprintStats(sprint)
            const daysRemaining = sprint.status === 'active' ? getDaysRemaining(sprint.endDate) : null

            return (
              <div
                key={sprint.id}
                className={`${styles.sprintCard} ${selectedSprintId === sprint.id ? styles.selected : ''}`}
              >
                <div className={styles.sprintCardHeader}>
                  <div
                    className={styles.sprintStatus}
                    style={{ backgroundColor: getStatusColor(sprint.status) }}
                  />
                  <h4>{sprint.name}</h4>
                  <span className={styles.sprintDateRange}>
                    <FiCalendar />
                    {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                  </span>
                </div>

                {sprint.goal && (
                  <p className={styles.sprintGoal}>{sprint.goal}</p>
                )}

                {/* Progress Bar */}
                <div className={styles.sprintProgress}>
                  <div className={styles.sprintProgressFill} style={{ width: `${stats.progress}%` }} />
                  <span>{stats.progress}%</span>
                </div>

                {/* Stats */}
                <div className={styles.sprintStats}>
                  <div className={styles.sprintStat}>
                    <span className={styles.sprintStatValue}>{stats.total}</span>
                    <span className={styles.sprintStatLabel}>Total</span>
                  </div>
                  <div className={styles.sprintStat}>
                    <span className={styles.sprintStatValue}>{stats.completed}</span>
                    <span className={styles.sprintStatLabel}>Done</span>
                  </div>
                  <div className={styles.sprintStat}>
                    <span className={styles.sprintStatValue}>{stats.remaining}</span>
                    <span className={styles.sprintStatLabel}>Remaining</span>
                  </div>
                  {daysRemaining !== null && (
                    <div className={styles.sprintStat}>
                      <span className={styles.sprintStatValue}>{daysRemaining}</span>
                      <span className={styles.sprintStatLabel}>Days Left</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className={styles.sprintActions}>
                  {sprint.status === 'planning' && (
                    <button onClick={() => startSprint(sprint.id)}>
                      <FiPlay /> Start Sprint
                    </button>
                  )}
                  {sprint.status === 'active' && (
                    <button onClick={() => completeSprint(sprint.id)}>
                      <FiCheckCircle /> Complete Sprint
                    </button>
                  )}
                  <button onClick={() => openEditForm(sprint)}>
                    <FiEdit2 /> Edit
                  </button>
                  <button onClick={() => handleDelete(sprint.id)} className={styles.danger}>
                    <FiTrash2 />
                  </button>
                </div>

                {/* Expand to see tasks */}
                <button
                  className={styles.expandBtn}
                  onClick={() => setSelectedSprintId(selectedSprintId === sprint.id ? null : sprint.id)}
                >
                  View Tasks <FiChevronRight className={selectedSprintId === sprint.id ? styles.rotated : ''} />
                </button>

                {/* Task List */}
                {selectedSprintId === sprint.id && (
                  <div className={styles.sprintTaskList}>
                    {getSprintTasks(sprint).length === 0 ? (
                      <p className={styles.noTasks}>No tasks in this sprint period</p>
                    ) : (
                      getSprintTasks(sprint).map(task => (
                        <div
                          key={task.id}
                          className={styles.sprintTask}
                          onClick={() => onTaskClick(task.id)}
                        >
                          <span className={`${styles.priorityDot} ${styles[task.priority]}`} />
                          <span className={styles.sprintTaskTitle}>{task.title}</span>
                          <span className={styles.sprintTaskStatus}>
                            {state.columns.find(c => c.id === task.column_id)?.title}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
