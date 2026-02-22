import { useState, useEffect } from 'react'
import { FiLink, FiPlus, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import * as api from '../../lib/api'
import { useBoard } from '../../context/BoardContext'
import { useToast } from '../../hooks/useToast'
import type { TaskDependency, Task } from '../../types/database'
import styles from './TaskDependencies.module.css'

interface TaskDependenciesProps {
  taskId: string
  boardId: string
}

export default function TaskDependencies({ taskId, boardId }: TaskDependenciesProps) {
  const { state } = useBoard()
  const { showToast } = useToast()
  const [dependencies, setDependencies] = useState<TaskDependency[]>([])
  const [dependents, setDependents] = useState<TaskDependency[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // Load dependencies
  useEffect(() => {
    loadDependencies()
  }, [taskId])

  const loadDependencies = async () => {
    setLoading(true)
    const [depsRes, dependentsRes] = await Promise.all([
      api.getTaskDependencies(taskId),
      api.getTaskDependents(taskId)
    ])

    if (depsRes.data) setDependencies(depsRes.data)
    if (dependentsRes.data) setDependents(dependentsRes.data)
    setLoading(false)
  }

  const handleAddDependency = async (dependsOnTaskId: string) => {
    // Check for circular dependency
    const isCircular = await api.checkCircularDependency(taskId, dependsOnTaskId)
    if (isCircular) {
      showToast('Cannot add: This would create a circular dependency', 'error')
      return
    }

    const { error } = await api.addTaskDependency({
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
      dependency_type: 'blocks'
    })

    if (error) {
      showToast('Failed to add dependency', 'error')
      return
    }

    showToast('Dependency added', 'success')
    setShowAddModal(false)
    setSearchQuery('')
    loadDependencies()
  }

  const handleRemoveDependency = async (dependencyId: string) => {
    const { error } = await api.removeTaskDependency(dependencyId)
    if (error) {
      showToast('Failed to remove dependency', 'error')
      return
    }

    showToast('Dependency removed', 'info')
    loadDependencies()
  }

  // Get task info by ID
  const getTaskInfo = (taskId: string): Task | undefined => {
    return state.tasks.find(t => t.id === taskId)
  }

  // Filter tasks for search
  const searchableTasks = state.tasks.filter(t =>
    t.id !== taskId &&
    !dependencies.some(d => d.depends_on_task_id === t.id) &&
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Check if a dependency is completed
  const isDependencyCompleted = (dependsOnTaskId: string): boolean => {
    const task = getTaskInfo(dependsOnTaskId)
    if (!task) return false
    const column = state.columns.find(c => c.id === task.column_id)
    return column?.title.toLowerCase() === 'done'
  }

  // Get blocked status text
  const getDependencyStatus = (dependsOnTaskId: string): string => {
    const task = getTaskInfo(dependsOnTaskId)
    if (!task) return 'Unknown'
    const column = state.columns.find(c => c.id === task.column_id)
    if (column?.title.toLowerCase() === 'done') return 'Completed'
    if (column?.title.toLowerCase() === 'in progress') return 'In Progress'
    return 'Pending'
  }

  const hasUncompletedDependencies = dependencies.some(d => !isDependencyCompleted(d.depends_on_task_id))

  return (
    <div className={styles.taskDependencies}>
      <div className={styles.dependenciesHeader}>
        <h3 className={styles.dependenciesTitle}>
          <FiLink /> Dependencies
        </h3>
        <button
          className={styles.addDependencyBtn}
          onClick={() => setShowAddModal(true)}
        >
          <FiPlus /> Add
        </button>
      </div>

      {/* Blocking Warning */}
      {hasUncompletedDependencies && (
        <div className={styles.blockingWarning}>
          <FiAlertCircle />
          <span>This task has incomplete dependencies</span>
        </div>
      )}

      {/* Dependencies List */}
      {dependencies.length > 0 ? (
        <div className={styles.dependenciesSection}>
          <div className={styles.sectionLabel}>Depends on</div>
          <div className={styles.dependenciesList}>
            {dependencies.map(dep => {
              const task = getTaskInfo(dep.depends_on_task_id)
              const isCompleted = isDependencyCompleted(dep.depends_on_task_id)

              return (
                <div key={dep.id} className={styles.dependencyItem}>
                  <div className={styles.dependencyIcon}>
                    {isCompleted ? (
                      <FiCheckCircle className={styles.completed} />
                    ) : (
                      <FiAlertCircle className={styles.pending} />
                    )}
                  </div>
                  <div className={styles.dependencyInfo}>
                    <span className={styles.dependencyTitle}>
                      {task?.title || 'Unknown Task'}
                    </span>
                    <span className={`${styles.dependencyStatus} ${isCompleted ? styles.completed : ''}`}>
                      {getDependencyStatus(dep.depends_on_task_id)}
                    </span>
                  </div>
                  <button
                    className={styles.dependencyRemove}
                    onClick={() => handleRemoveDependency(dep.id)}
                    title="Remove dependency"
                  >
                    <FiX />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className={styles.noDependencies}>
          No dependencies. Add tasks that must be completed before this one.
        </div>
      )}

      {/* Dependents (tasks that depend on this one) */}
      {dependents.length > 0 && (
        <div className={styles.dependenciesSection}>
          <div className={styles.sectionLabel}>Blocking</div>
          <div className={styles.dependenciesList}>
            {dependents.map(dep => {
              const task = getTaskInfo(dep.task_id)
              const isCompleted = isDependencyCompleted(dep.task_id)

              return (
                <div key={dep.id} className={`${styles.dependencyItem} ${styles.blocking}`}>
                  <div className={styles.dependencyIcon}>
                    <FiLink />
                  </div>
                  <div className={styles.dependencyInfo}>
                    <span className={styles.dependencyTitle}>
                      {task?.title || 'Unknown Task'}
                    </span>
                    <span className={`${styles.dependencyStatus} ${isCompleted ? styles.completed : ''}`}>
                      {getDependencyStatus(dep.task_id)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Dependency Modal */}
      {showAddModal && (
        <div className={styles.modal}>
          <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h4>Add Dependency</h4>
              <button onClick={() => setShowAddModal(false)}>
                <FiX />
              </button>
            </div>

            <div className={styles.searchInput}>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.taskList}>
              {searchableTasks.length > 0 ? (
                searchableTasks.slice(0, 10).map(task => (
                  <div
                    key={task.id}
                    className={styles.taskOption}
                    onClick={() => handleAddDependency(task.id)}
                  >
                    <span className={styles.taskOptionTitle}>{task.title}</span>
                    <span className={styles.taskOptionStatus}>
                      {state.columns.find(c => c.id === task.column_id)?.title || 'Unknown'}
                    </span>
                  </div>
                ))
              ) : (
                <div className={styles.noResults}>
                  {searchQuery ? 'No matching tasks found' : 'No available tasks'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
