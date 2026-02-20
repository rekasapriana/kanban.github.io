import { FiArchive, FiRotateCcw, FiTrash2, FiSearch } from 'react-icons/fi'
import { useState } from 'react'
import { useBoard } from '../../context/BoardContext'
import styles from './Views.module.css'

export default function ArchiveView() {
  const { state, restoreTask: restoreTaskFromContext, deleteTask } = useBoard()
  const [searchQuery, setSearchQuery] = useState('')

  // Find archive column by title
  const archiveColumn = state.columns.find(c => c.title.toLowerCase() === 'archive')

  // Filter tasks that are in the archive column
  const archivedTasks = state.tasks.filter(t =>
    archiveColumn ? t.column_id === archiveColumn.id : t.is_archived
  )
  const filteredTasks = searchQuery
    ? archivedTasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : archivedTasks

  const handleRestore = (task: typeof state.tasks[0]) => {
    restoreTaskFromContext(task)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div>
          <h1>Archive</h1>
          <p>View and restore archived tasks</p>
        </div>
        <span className={styles.archiveCount}>{archivedTasks.length} archived tasks</span>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <FiSearch />
        <input
          type="text"
          placeholder="Search archived tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredTasks.length > 0 ? (
        <div className={styles.archiveList}>
          {filteredTasks.map(task => (
            <div key={task.id} className={styles.archiveItem}>
              <div className={styles.archiveContent}>
                <h3>{task.title}</h3>
                {task.description && <p>{task.description}</p>}
                <div className={styles.archiveMeta}>
                  {task.due_date && (
                    <span>Completed: {formatDate(task.due_date)}</span>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className={styles.archiveTags}>
                      {task.tags.map(tag => (
                        <span key={tag.id} className={styles.archiveTag}>{tag.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.archiveActions}>
                <button
                  className={styles.restoreBtn}
                  onClick={() => handleRestore(task)}
                  title="Restore to board"
                >
                  <FiRotateCcw />
                  Restore
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => deleteTask(task.id)}
                  title="Delete permanently"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <FiArchive className={styles.emptyIcon} />
          <h3>No archived tasks</h3>
          <p>{searchQuery ? 'No tasks match your search' : 'Tasks that you archive will appear here'}</p>
        </div>
      )}
    </div>
  )
}
