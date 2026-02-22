import { useState, useMemo } from 'react'
import { useBoard } from '../../context/BoardContext'
import TaskCard from './TaskCard'
import type { Task, Column } from '../../types/database'
import styles from './SwimlanesView.module.css'

interface SwimlanesViewProps {
  onTaskClick: (taskId: string) => void
  onAddTask: (columnId: string) => void
}

const PRIORITIES = ['high', 'medium', 'low'] as const
const PRIORITY_LABELS = {
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority'
}
const PRIORITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e'
}

type SwimlaneGroupBy = 'priority' | 'project' | 'assignee'

export default function SwimlanesView({ onTaskClick, onAddTask }: SwimlanesViewProps) {
  const { state } = useBoard()
  const [groupBy, setGroupBy] = useState<SwimlaneGroupBy>('priority')

  // Get main columns (To Do, In Progress, Review, Done)
  const mainColumns = useMemo(() => {
    const mainTitles = ['to do', 'in progress', 'review', 'done', 'doing']
    return state.columns
      .filter(col => mainTitles.includes(col.title.toLowerCase()))
      .sort((a, b) => (a.position || 0) - (b.position || 0))
  }, [state.columns])

  // Group tasks by the selected grouping
  const swimlanes = useMemo(() => {
    const activeTasks = state.tasks.filter(t => !t.deleted_at && !t.is_archived)

    if (groupBy === 'priority') {
      return PRIORITIES.map(priority => ({
        id: priority,
        label: PRIORITY_LABELS[priority],
        color: PRIORITY_COLORS[priority],
        tasks: activeTasks.filter(t => t.priority === priority)
      }))
    }

    if (groupBy === 'project') {
      const projectMap = new Map<string | null, { id: string; label: string; color: string; tasks: Task[] }>()

      // Add "No Project" swimlane first
      projectMap.set(null, {
        id: 'none',
        label: 'No Project',
        color: '#6b7280',
        tasks: []
      })

      activeTasks.forEach(task => {
        const projectId = task.project_id
        const projectName = task.projects?.name || 'Unknown Project'

        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            id: projectId || 'none',
            label: projectName,
            color: task.projects?.color || '#3b82f6',
            tasks: []
          })
        }
        projectMap.get(projectId)!.tasks.push(task)
      })

      return Array.from(projectMap.values()).filter(s => s.tasks.length > 0)
    }

    if (groupBy === 'assignee') {
      const assigneeMap = new Map<string, { id: string; label: string; color: string; tasks: Task[] }>()

      // Add "Unassigned" swimlane first
      assigneeMap.set('unassigned', {
        id: 'unassigned',
        label: 'Unassigned',
        color: '#6b7280',
        tasks: []
      })

      activeTasks.forEach(task => {
        const assignees = task.task_assignees || []
        if (assignees.length === 0) {
          assigneeMap.get('unassigned')!.tasks.push(task)
        } else {
          assignees.forEach(a => {
            const key = a.user_id
            if (!assigneeMap.has(key)) {
              assigneeMap.set(key, {
                id: key,
                label: a.profiles?.full_name || a.profiles?.email?.split('@')[0] || 'Unknown',
                color: '#8b5cf6',
                tasks: []
              })
            }
            assigneeMap.get(key)!.tasks.push(task)
          })
        }
      })

      return Array.from(assigneeMap.values()).filter(s => s.tasks.length > 0)
    }

    return []
  }, [state.tasks, groupBy])

  // Get tasks for a specific swimlane and column
  const getTasksForCell = (swimlane: typeof swimlanes[0], column: Column) => {
    return swimlane.tasks.filter(t => t.column_id === column.id)
  }

  return (
    <div className={styles.container}>
      {/* Header with group by toggle */}
      <div className={styles.header}>
        <h3 className={styles.title}>Swimlanes View</h3>
        <div className={styles.groupByToggle}>
          <span>Group by:</span>
          <button
            className={`${styles.groupBtn} ${groupBy === 'priority' ? styles.active : ''}`}
            onClick={() => setGroupBy('priority')}
          >
            Priority
          </button>
          <button
            className={`${styles.groupBtn} ${groupBy === 'project' ? styles.active : ''}`}
            onClick={() => setGroupBy('project')}
          >
            Project
          </button>
          <button
            className={`${styles.groupBtn} ${groupBy === 'assignee' ? styles.active : ''}`}
            onClick={() => setGroupBy('assignee')}
          >
            Assignee
          </button>
        </div>
      </div>

      {/* Swimlanes Grid */}
      <div className={styles.swimlanesContainer}>
        {/* Header row with column names */}
        <div className={styles.headerRow}>
          <div className={styles.swimlaneHeader}>
            {/* Empty cell for swimlane labels */}
          </div>
          {mainColumns.map(column => (
            <div key={column.id} className={styles.columnHeader}>
              <span className={styles.columnTitle}>{column.title}</span>
              <span className={styles.columnCount}>
                {state.tasks.filter(t => t.column_id === column.id && !t.deleted_at).length}
              </span>
            </div>
          ))}
        </div>

        {/* Swimlane rows */}
        {swimlanes.map(swimlane => (
          <div key={swimlane.id} className={styles.swimlaneRow}>
            {/* Swimlane label */}
            <div className={styles.swimlaneLabel} style={{ borderLeftColor: swimlane.color }}>
              <span className={styles.swimlaneName}>{swimlane.label}</span>
              <span className={styles.swimlaneCount}>{swimlane.tasks.length}</span>
            </div>

            {/* Task cells for each column */}
            {mainColumns.map(column => {
              const cellTasks = getTasksForCell(swimlane, column)
              return (
                <div key={column.id} className={styles.cell}>
                  <div className={styles.cellTasks}>
                    {cellTasks.map(task => (
                      <div
                        key={task.id}
                        className={styles.taskWrapper}
                        onClick={() => onTaskClick(task.id)}
                      >
                        <TaskCard task={task} />
                      </div>
                    ))}
                  </div>
                  {cellTasks.length === 0 && (
                    <div className={styles.emptyCell}>
                      <span>No tasks</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
