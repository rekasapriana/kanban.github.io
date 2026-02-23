import { useState, useMemo } from 'react'
import { useBoard } from '../../context/BoardContext'
import { FiCheck, FiCircle, FiClock, FiAlertCircle } from 'react-icons/fi'
import styles from './Views.module.css'

export default function MyTasksView() {
  const { state, openDetailPanel } = useBoard()
  const [filter, setFilter] = useState<string>('all')

  // Get column IDs by title
  const columnIds = useMemo(() => {
    const ids: Record<string, string> = {}
    state.columns.forEach(col => {
      const title = col.title.toLowerCase().replace(' ', '-')
      ids[title] = col.id
    })
    return ids
  }, [state.columns])

  // Filter tasks - show all non-archived tasks as "my tasks"
  const myTasks = state.tasks.filter(t => t.column_id !== columnIds['archive'])

  let filteredTasks = myTasks
  if (filter !== 'all') {
    filteredTasks = myTasks.filter(t => t.column_id === filter)
  }

  // Group by status using actual column IDs
  const tasksByStatus = {
    [columnIds['to-do'] || 'todo']: filteredTasks.filter(t => t.column_id === columnIds['to-do']),
    [columnIds['in-progress'] || 'in-progress']: filteredTasks.filter(t => t.column_id === columnIds['in-progress']),
    [columnIds['review'] || 'review']: filteredTasks.filter(t => t.column_id === columnIds['review']),
    [columnIds['done'] || 'done']: filteredTasks.filter(t => t.column_id === columnIds['done']),
  }

  const statusConfig: Record<string, { label: string; icon: typeof FiCircle; color: string }> = {}
  state.columns.forEach(col => {
    const title = col.title.toLowerCase().replace(' ', '-')
    if (title === 'to-do') {
      statusConfig[col.id] = { label: 'To Do', icon: FiCircle, color: 'red' }
    } else if (title === 'in-progress') {
      statusConfig[col.id] = { label: 'In Progress', icon: FiClock, color: 'yellow' }
    } else if (title === 'review') {
      statusConfig[col.id] = { label: 'Review', icon: FiAlertCircle, color: 'blue' }
    } else if (title === 'done') {
      statusConfig[col.id] = { label: 'Done', icon: FiCheck, color: 'green' }
    }
  })

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <h1>My Tasks</h1>
        <p>Manage and track your personal tasks</p>
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({myTasks.length})
        </button>
        {Object.entries(statusConfig).map(([columnId, config]) => (
          <button
            key={columnId}
            className={`${styles.filterTab} ${filter === columnId ? styles.active : ''}`}
            onClick={() => setFilter(columnId)}
          >
            <config.icon />
            {config.label} ({tasksByStatus[columnId]?.length || 0})
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className={styles.tasksContainer}>
        {Object.entries(statusConfig).map(([columnId, config]) => {
          const tasks = tasksByStatus[columnId] || []
          if (tasks.length === 0 && filter !== 'all') return null

          return (
            <div key={columnId} className={styles.taskGroup}>
              <div className={styles.taskGroupHeader}>
                <config.icon className={styles[config.color]} />
                <h3>{config.label}</h3>
                <span className={styles.taskCount}>{tasks.length}</span>
              </div>
              <div className={styles.taskGroupList}>
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className={styles.myTaskCard}
                    onClick={() => openDetailPanel(task.id)}
                  >
                    <div className={styles.taskHeader}>
                      <span className={styles.taskTitle}>{task.title}</span>
                      <span className={`${styles.priorityTag} ${styles[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className={styles.taskDesc}>{task.description}</p>
                    )}
                    <div className={styles.taskMeta}>
                      {task.due_date && (
                        <span className={styles.dueDate}>
                          <FiClock />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <div className={styles.taskTags}>
                          {task.tags.slice(0, 2).map(tag => (
                            <span key={tag.id} className={styles.tag}>{tag.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className={styles.emptyMessage}>No tasks in this category</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
