import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { FiSearch, FiGrid, FiList } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import Column from './Column'
import TaskCard from './TaskCard'
import TaskDetailPanel from '../TaskDetail/TaskDetailPanel'
import { useTheme } from '../../context/ThemeContext'
import styles from './Board.module.css'

export default function Board() {
  const { state, moveTask, openModal, closeDetailPanel, openDetailPanel, deleteTask, toggleShortcutsModal, toggleStatsPanel, setSearchQuery, setViewMode } = useBoard()
  const { toggleTheme } = useTheme()
  const [activeTask, setActiveTask] = useState<string | null>(null)

  // Debug
  console.log('[Board] Rendering with columns:', state.columns.length, 'tasks:', state.tasks.length, 'loading:', state.loading)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTask(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Find target column
    const targetColumn = state.columns.find(col => col.id === overId)
    if (!targetColumn) return

    // Get tasks in target column
    const columnTasks = state.tasks.filter(t => t.column_id === targetColumn.id)
    const position = columnTasks.length

    moveTask(taskId, targetColumn.id, position)
  }, [state.columns, state.tasks, moveTask])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault()
          openModal()
          break
        case 'escape':
          closeDetailPanel()
          break
        case 's':
          e.preventDefault()
          toggleStatsPanel()
          break
        case 't':
          e.preventDefault()
          toggleTheme()
          break
        case '?':
          e.preventDefault()
          toggleShortcutsModal()
          break
        case 'delete':
        case 'backspace':
          if (state.selectedTaskId) {
            e.preventDefault()
            deleteTask(state.selectedTaskId)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [openModal, closeDetailPanel, deleteTask, toggleStatsPanel, toggleShortcutsModal, toggleTheme, state.selectedTaskId])

  // Filter tasks by search query
  const getFilteredTasks = (columnId: string) => {
    return state.tasks.filter(task => {
      const matchesColumn = task.column_id === columnId
      const matchesSearch = state.searchQuery
        ? task.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          (task.description?.toLowerCase().includes(state.searchQuery.toLowerCase()) ?? false)
        : true
      return matchesColumn && matchesSearch
    })
  }

  // Get all filtered tasks for list view
  const getAllFilteredTasks = () => {
    return state.tasks.filter(task => {
      const matchesSearch = state.searchQuery
        ? task.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          (task.description?.toLowerCase().includes(state.searchQuery.toLowerCase()) ?? false)
        : true
      return matchesSearch && !task.is_archived
    })
  }

  const activeTaskData = activeTask ? state.tasks.find(t => t.id === activeTask) : null

  // Separate columns into top row (To Do, In Progress, Review) and bottom row (Done, Archive)
  const topRowTitles = ['to do', 'in progress', 'review', 'doing']
  const bottomRowTitles = ['done', 'archive']

  const topRowColumns = state.columns.filter(col =>
    topRowTitles.includes(col.title.toLowerCase())
  )
  const bottomRowColumns = state.columns.filter(col =>
    bottomRowTitles.includes(col.title.toLowerCase())
  )

  // Sort columns by position
  const sortByPosition = (a: typeof state.columns[0], b: typeof state.columns[0]) =>
    (a.position || 0) - (b.position || 0)

  topRowColumns.sort(sortByPosition)
  bottomRowColumns.sort(sortByPosition)

  // Get column name by id
  const getColumnName = (columnId: string) => {
    const column = state.columns.find(c => c.id === columnId)
    return column?.title || 'Unknown'
  }

  // Get column color
  const getColumnColor = (columnId: string) => {
    const column = state.columns.find(c => c.id === columnId)
    const titleLower = column?.title.toLowerCase() || ''
    if (titleLower === 'to do') return '#4f46e5'
    if (titleLower === 'in progress' || titleLower === 'doing') return '#f59e0b'
    if (titleLower === 'review') return '#06b6d4'
    if (titleLower === 'done') return '#22c55e'
    if (titleLower === 'archive') return '#6b7280'
    return '#64748b'
  }

  return (
    <>
      {/* Search and View Toggle */}
      <div className={styles.boardHeader}>
        <div className={styles.searchBox}>
          <FiSearch />
          <input
            type="text"
            placeholder="Search tasks..."
            value={state.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {state.searchQuery && (
            <button onClick={() => setSearchQuery('')} className={styles.clearSearch}>
              ×
            </button>
          )}
        </div>

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${state.viewMode === 'board' ? styles.active : ''}`}
            onClick={() => setViewMode('board')}
            title="Board View"
          >
            <FiGrid />
          </button>
          <button
            className={`${styles.viewBtn} ${state.viewMode === 'list' ? styles.active : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <FiList />
          </button>
        </div>
      </div>

      {/* Board View */}
      {state.viewMode === 'board' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className={styles.board}>
            {/* Top Row */}
            <div className={styles.boardRow}>
              {topRowColumns.map(column => (
                <Column
                  key={column.id}
                  column={column}
                  tasks={getFilteredTasks(column.id)}
                  onAddTask={() => openModal(column.id)}
                />
              ))}
            </div>

            {/* Bottom Row */}
            <div className={styles.boardRow}>
              {bottomRowColumns.map(column => (
                <Column
                  key={column.id}
                  column={column}
                  tasks={getFilteredTasks(column.id)}
                  onAddTask={() => openModal(column.id)}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeTaskData && (
              <div className={styles.dragOverlay}>
                <TaskCard task={activeTaskData} isDragging />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        /* List View */
        <div className={styles.listView}>
          {getAllFilteredTasks().length === 0 ? (
            <div className={styles.emptyList}>
              <p>No tasks found</p>
            </div>
          ) : (
            getAllFilteredTasks().map(task => (
              <div key={task.id} className={styles.listItem} onClick={() => openDetailPanel(task.id)}>
                <div className={styles.listItemStatus} style={{ background: getColumnColor(task.column_id) }} />
                <div className={styles.listItemContent}>
                  <div className={styles.listItemHeader}>
                    <span className={`${styles.priorityBadge} ${styles[task.priority]}`}>
                      {task.priority}
                    </span>
                    <span className={styles.listItemColumn} style={{ color: getColumnColor(task.column_id) }}>
                      {getColumnName(task.column_id)}
                    </span>
                  </div>
                  <h3 className={styles.listItemTitle}>{task.title}</h3>
                  {task.description && (
                    <p className={styles.listItemDesc}>{task.description}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Task Detail Panel */}
      <TaskDetailPanel />
    </>
  )
}
