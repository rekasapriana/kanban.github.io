import { useState } from 'react'
import {
  FiAlertTriangle,
  FiClock,
  FiTrendingUp,
  FiCheckSquare,
  FiInfo
} from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import styles from './Board.module.css'

type Quadrant = 'urgent-important' | 'not-urgent-important' | 'urgent-not-important' | 'not-urgent-not-important'

interface PriorityMatrixViewProps {
  onTaskClick: (taskId: string) => void
}

export default function PriorityMatrixView({ onTaskClick }: PriorityMatrixViewProps) {
  const { state } = useBoard()
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant | null>(null)

  // Categorize tasks into quadrants
  const categorizeTask = (task: typeof state.tasks[0]): Quadrant => {
    const isHighPriority = task.priority === 'high'
    const hasDueDate = task.due_date
    const isOverdue = hasDueDate && new Date(task.due_date) < new Date()
    const isDueSoon = hasDueDate && !isOverdue && (() => {
      const dueDate = new Date(task.due_date)
      const now = new Date()
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays <= 3
    })()

    const isUrgent = isHighPriority || isOverdue || isDueSoon
    const isImportant = isHighPriority || task.priority === 'medium'

    if (isUrgent && isImportant) return 'urgent-important'
    if (!isUrgent && isImportant) return 'not-urgent-important'
    if (isUrgent && !isImportant) return 'urgent-not-important'
    return 'not-urgent-not-important'
  }

  // Get tasks for each quadrant (excluding archived)
  const getQuadrantTasks = (quadrant: Quadrant) => {
    return state.tasks.filter(task => {
      if (task.is_archived) return false
      const doneColumn = state.columns.find(c => c.title.toLowerCase() === 'done')
      if (doneColumn && task.column_id === doneColumn.id) return false
      return categorizeTask(task) === quadrant
    })
  }

  const quadrants = [
    {
      id: 'urgent-important' as Quadrant,
      title: 'Do First',
      subtitle: 'Urgent & Important',
      icon: FiAlertTriangle,
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      description: 'Crisis, deadlines, problems',
      tip: 'Do these tasks immediately'
    },
    {
      id: 'not-urgent-important' as Quadrant,
      title: 'Schedule',
      subtitle: 'Important, Not Urgent',
      icon: FiTrendingUp,
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      description: 'Planning, learning, relationships',
      tip: 'Schedule time for these tasks'
    },
    {
      id: 'urgent-not-important' as Quadrant,
      title: 'Delegate',
      subtitle: 'Urgent, Not Important',
      icon: FiClock,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      description: 'Interruptions, some meetings',
      tip: 'Delegate or minimize these tasks'
    },
    {
      id: 'not-urgent-not-important' as Quadrant,
      title: 'Eliminate',
      subtitle: 'Not Urgent, Not Important',
      icon: FiCheckSquare,
      color: '#6b7280',
      bgColor: 'rgba(107, 114, 128, 0.1)',
      description: 'Time wasters, busy work',
      tip: 'Consider eliminating these tasks'
    }
  ]

  // Calculate stats
  const totalTasks = state.tasks.filter(t => !t.is_archived).length
  const quadrantStats = quadrants.map(q => ({
    ...q,
    tasks: getQuadrantTasks(q.id),
    count: getQuadrantTasks(q.id).length
  }))

  return (
    <div className={styles.priorityMatrix}>
      <div className={styles.matrixHeader}>
        <h2><FiAlertTriangle /> Priority Matrix</h2>
        <div className={styles.matrixStats}>
          <span>{totalTasks} active tasks</span>
        </div>
      </div>

      {/* Matrix Legend */}
      <div className={styles.matrixLegend}>
        <div className={styles.legendItem}>
          <div className={styles.legendLabel}>Important</div>
          <div className={styles.legendArrow}>↓</div>
        </div>
        <div className={styles.legendSpacer} />
        <div className={styles.legendItem}>
          <div className={styles.legendArrow}>→</div>
          <div className={styles.legendLabel}>Urgent</div>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className={styles.matrixGrid}>
        {quadrantStats.map(quadrant => (
          <div
            key={quadrant.id}
            className={`${styles.matrixQuadrant} ${selectedQuadrant === quadrant.id ? styles.selected : ''}`}
            style={{ backgroundColor: quadrant.bgColor, borderColor: quadrant.color }}
          >
            <div className={styles.quadrantHeader}>
              <div className={styles.quadrantIcon} style={{ color: quadrant.color }}>
                <quadrant.icon />
              </div>
              <div className={styles.quadrantInfo}>
                <h3 style={{ color: quadrant.color }}>{quadrant.title}</h3>
                <span className={styles.quadrantSubtitle}>{quadrant.subtitle}</span>
              </div>
              <div className={styles.quadrantCount} style={{ backgroundColor: quadrant.color }}>
                {quadrant.count}
              </div>
            </div>

            <p className={styles.quadrantDesc}>{quadrant.description}</p>

            <div className={styles.quadrantTasks}>
              {quadrant.tasks.length === 0 ? (
                <div className={styles.emptyQuadrant}>
                  <p>No tasks</p>
                </div>
              ) : (
                quadrant.tasks.slice(0, 5).map(task => (
                  <div
                    key={task.id}
                    className={styles.quadrantTask}
                    onClick={() => onTaskClick(task.id)}
                  >
                    <span className={`${styles.taskPriority} ${styles[task.priority]}`} />
                    <span className={styles.taskTitle}>{task.title}</span>
                    {task.due_date && (
                      <span className={styles.taskDue}>
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))
              )}
              {quadrant.tasks.length > 5 && (
                <button
                  className={styles.showMoreBtn}
                  onClick={() => setSelectedQuadrant(
                    selectedQuadrant === quadrant.id ? null : quadrant.id
                  )}
                >
                  +{quadrant.tasks.length - 5} more
                </button>
              )}
            </div>

            <div className={styles.quadrantTip}>
              <FiInfo />
              <span>{quadrant.tip}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Quadrant Modal */}
      {selectedQuadrant && (
        <div className={styles.quadrantModal}>
          <div className={styles.quadrantModalOverlay} onClick={() => setSelectedQuadrant(null)} />
          <div className={styles.quadrantModalContent}>
            {(() => {
              const q = quadrantStats.find(qq => qq.id === selectedQuadrant)!
              return (
                <>
                  <div className={styles.modalQuadrantHeader} style={{ borderColor: q.color }}>
                    <q.icon style={{ color: q.color, fontSize: '1.5rem' }} />
                    <h3>{q.title} - {q.subtitle}</h3>
                    <button onClick={() => setSelectedQuadrant(null)}>×</button>
                  </div>
                  <div className={styles.modalQuadrantTasks}>
                    {q.tasks.map(task => (
                      <div
                        key={task.id}
                        className={styles.modalQuadrantTask}
                        onClick={() => {
                          onTaskClick(task.id)
                          setSelectedQuadrant(null)
                        }}
                      >
                        <span className={`${styles.taskPriority} ${styles[task.priority]}`} />
                        <div className={styles.modalTaskInfo}>
                          <span className={styles.taskTitle}>{task.title}</span>
                          <div className={styles.modalTaskMeta}>
                            <span>{state.columns.find(c => c.id === task.column_id)?.title}</span>
                            {task.due_date && (
                              <span className={task.due_date < new Date().toISOString() ? styles.overdue : ''}>
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className={styles.matrixSummary}>
        <div className={styles.summaryItem}>
          <div className={styles.summaryBar}>
            {quadrantStats.map(q => (
              <div
                key={q.id}
                className={styles.summarySegment}
                style={{
                  backgroundColor: q.color,
                  width: `${totalTasks > 0 ? (q.count / totalTasks) * 100 : 0}%`
                }}
                title={`${q.title}: ${q.count}`}
              />
            ))}
          </div>
        </div>
        <div className={styles.summaryLegend}>
          {quadrantStats.map(q => (
            <div key={q.id} className={styles.summaryLegendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: q.color }} />
              <span>{q.title}</span>
              <span className={styles.legendCount}>{q.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
