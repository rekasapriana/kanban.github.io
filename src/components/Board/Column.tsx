import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { FiClipboard, FiLoader, FiEye, FiCheckCircle, FiArchive, FiInbox, FiPlus } from 'react-icons/fi'
import type { Column as ColumnType, Task } from '../../types/database'
import TaskCard from './TaskCard'
import styles from './Board.module.css'

interface ColumnProps {
  column: ColumnType
  tasks: Task[]
  onAddTask: () => void
}

const columnIcons = {
  'to do': FiClipboard,
  'in progress': FiLoader,
  'doing': FiLoader,
  'review': FiEye,
  'done': FiCheckCircle,
  'archive': FiArchive
}

const columnClasses = {
  'to do': styles.todoHeader,
  'in progress': styles.progressHeader,
  'doing': styles.progressHeader,
  'review': styles.reviewHeader,
  'done': styles.doneHeader,
  'archive': styles.archiveHeader
}

export default function Column({ column, tasks, onAddTask }: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  })

  const isArchive = column.title.toLowerCase() === 'archive'
  const isDone = column.title.toLowerCase() === 'done'
  const titleLower = column.title.toLowerCase()
  const Icon = columnIcons[titleLower as keyof typeof columnIcons] || FiClipboard
  const headerClass = columnClasses[titleLower as keyof typeof columnClasses] || ''

  return (
    <div className={`${styles.column} ${isArchive ? styles.archiveColumn : ''}`}>
      <div className={`${styles.columnHeader} ${headerClass}`}>
        <div className={styles.columnTitle}>
          <Icon />
          <h2>{column.title}</h2>
        </div>
        <span className={styles.taskCount}>{tasks.length}</span>
      </div>

      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className={styles.taskList}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isArchived={isArchive}
              isDone={isDone}
            />
          ))}

          {tasks.length === 0 && (
            <div className={`${styles.emptyState} ${styles.show}`}>
              <FiInbox />
              <p>No tasks yet</p>
            </div>
          )}
        </div>
      </SortableContext>

      {!isArchive && (
        <button className={styles.addTaskBtn} onClick={onAddTask}>
          <FiPlus />
          Add Task
        </button>
      )}
    </div>
  )
}
