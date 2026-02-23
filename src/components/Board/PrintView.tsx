import { useRef } from 'react'
import { FiPrinter, FiCheck } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import styles from './Board.module.css'

export default function PrintView() {
  const { state } = useBoard()
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  // Get tasks by column
  const getTasksByColumn = (columnId: string) => {
    return state.tasks.filter(t => t.column_id === columnId && !t.is_archived)
  }

  // Get priority label
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴 High'
      case 'medium': return '🟡 Medium'
      case 'low': return '🟢 Low'
      default: return priority
    }
  }

  // Print options
  const printDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const totalTasks = state.tasks.filter(t => !t.is_archived).length
  const completedTasks = state.tasks.filter(t => {
    const doneCol = state.columns.find(c => c.title.toLowerCase() === 'done')
    return doneCol && t.column_id === doneCol.id && !t.is_archived
  }).length

  return (
    <div className={styles.printView}>
      <div className={styles.printHeader}>
        <h2><FiPrinter /> Print Board</h2>
        <button className={styles.printBtn} onClick={handlePrint}>
          <FiPrinter /> Print
        </button>
      </div>

      <div className={styles.printOptions}>
        <div className={styles.printInfo}>
          <span>📅 {printDate}</span>
          <span>📋 {totalTasks} tasks</span>
          <span>✅ {completedTasks} completed</span>
        </div>
      </div>

      {/* Print Content */}
      <div className={styles.printContent} ref={printRef}>
        <div className={styles.printBoardTitle}>
          <h1>Kanban Board</h1>
          <p>Generated on {printDate}</p>
        </div>

        <div className={styles.printColumns}>
          {state.columns.map(column => {
            const tasks = getTasksByColumn(column.id)
            if (tasks.length === 0 && !['to do', 'in progress', 'done'].includes(column.title.toLowerCase())) {
              return null
            }

            return (
              <div key={column.id} className={styles.printColumn}>
                <div className={styles.printColumnHeader}>
                  <h3>{column.title}</h3>
                  <span className={styles.printColumnCount}>{tasks.length}</span>
                </div>

                <div className={styles.printTasks}>
                  {tasks.length === 0 ? (
                    <div className={styles.printEmpty}>No tasks</div>
                  ) : (
                    tasks.map(task => (
                      <div key={task.id} className={styles.printTask}>
                        <div className={styles.printTaskHeader}>
                          <span className={styles.printTaskPriority}>
                            {getPriorityLabel(task.priority)}
                          </span>
                          {task.due_date && (
                            <span className={styles.printTaskDue}>
                              📅 {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h4>{task.title}</h4>
                        {task.description && (
                          <p className={styles.printTaskDesc}>{task.description}</p>
                        )}
                        <div className={styles.printTaskFooter}>
                          {task.tags && task.tags.length > 0 && (
                            <div className={styles.printTags}>
                              {task.tags.map(tag => (
                                <span key={tag.id} className={styles.printTag}>{tag.name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className={styles.printSummary}>
          <h3>Summary</h3>
          <div className={styles.printSummaryStats}>
            <div className={styles.printSummaryStat}>
              <span className={styles.printSummaryValue}>{totalTasks}</span>
              <span className={styles.printSummaryLabel}>Total Tasks</span>
            </div>
            <div className={styles.printSummaryStat}>
              <span className={styles.printSummaryValue}>{completedTasks}</span>
              <span className={styles.printSummaryLabel}>Completed</span>
            </div>
            <div className={styles.printSummaryStat}>
              <span className={styles.printSummaryValue}>
                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
              </span>
              <span className={styles.printSummaryLabel}>Progress</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
