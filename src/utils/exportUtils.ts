import type { Board, Column, Task } from '../types/database'

// Export formats
export type ExportFormat = 'json' | 'csv'

// Export options
export interface ExportOptions {
  format: ExportFormat
  includeArchived: boolean
  columnId?: string // Filter by column
  projectId?: string // Filter by project
  dateFrom?: string // Filter by date range
  dateTo?: string
}

// Format date for display
const formatDate = (date: string | null): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}

// Escape CSV field
const escapeCSV = (value: string | null | undefined): string => {
  if (!value) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Export to JSON format
export const exportToJSON = (
  board: Board,
  columns: Column[],
  tasks: Task[],
  options: ExportOptions
): string => {
  let filteredTasks = tasks

  // Apply filters
  if (!options.includeArchived) {
    filteredTasks = filteredTasks.filter(t => !t.is_archived)
  }
  if (options.columnId) {
    filteredTasks = filteredTasks.filter(t => t.column_id === options.columnId)
  }
  if (options.projectId) {
    filteredTasks = filteredTasks.filter(t => t.project_id === options.projectId)
  }
  if (options.dateFrom) {
    filteredTasks = filteredTasks.filter(t => t.created_at >= options.dateFrom!)
  }
  if (options.dateTo) {
    filteredTasks = filteredTasks.filter(t => t.created_at <= options.dateTo!)
  }

  const data = {
    board: {
      id: board.id,
      title: board.title,
      description: board.description
    },
    columns: columns.map(c => ({
      id: c.id,
      title: c.title,
      color: c.color,
      wip_limit: c.wip_limit
    })),
    tasks: filteredTasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      due_date: t.due_date,
      column_id: t.column_id,
      is_archived: t.is_archived,
      tags: t.tags?.map(tag => tag.name) || [],
      labels: t.task_labels?.map(tl => tl.labels.name) || [],
      project: t.projects?.name || null,
      subtasks: t.subtasks?.map(s => ({
        title: s.title,
        is_completed: s.is_completed
      })) || [],
      created_at: t.created_at
    })),
    exportedAt: new Date().toISOString(),
    version: '2.0'
  }

  return JSON.stringify(data, null, 2)
}

// Export to CSV format
export const exportToCSVString = (
  columns: Column[],
  tasks: Task[],
  options: ExportOptions
): string => {
  let filteredTasks = tasks

  // Apply filters
  if (!options.includeArchived) {
    filteredTasks = filteredTasks.filter(t => !t.is_archived)
  }
  if (options.columnId) {
    filteredTasks = filteredTasks.filter(t => t.column_id === options.columnId)
  }
  if (options.projectId) {
    filteredTasks = filteredTasks.filter(t => t.project_id === options.projectId)
  }
  if (options.dateFrom) {
    filteredTasks = filteredTasks.filter(t => t.created_at >= options.dateFrom!)
  }
  if (options.dateTo) {
    filteredTasks = filteredTasks.filter(t => t.created_at <= options.dateTo!)
  }

  const headers = [
    'Title',
    'Description',
    'Priority',
    'Status',
    'Due Date',
    'Project',
    'Labels',
    'Tags',
    'Subtasks Completed',
    'Created At',
    'Is Archived'
  ]

  const rows = filteredTasks.map(task => {
    const column = columns.find(c => c.id === task.column_id)
    const labels = task.task_labels?.map(tl => tl.labels.name).join('; ') || ''
    const tags = task.tags?.map(t => t.name).join('; ') || ''
    const completedSubtasks = task.subtasks?.filter(s => s.is_completed).length || 0
    const totalSubtasks = task.subtasks?.length || 0

    return [
      escapeCSV(task.title),
      escapeCSV(task.description),
      task.priority,
      column?.title || 'Unknown',
      formatDate(task.due_date),
      escapeCSV(task.projects?.name || ''),
      escapeCSV(labels),
      escapeCSV(tags),
      `${completedSubtasks}/${totalSubtasks}`,
      formatDate(task.created_at),
      task.is_archived ? 'Yes' : 'No'
    ]
  })

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

// Download file helper
export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Trigger download for JSON
export const downloadJSON = (board: Board, columns: Column[], tasks: Task[], options: ExportOptions) => {
  const content = exportToJSON(board, columns, tasks, options)
  const date = new Date().toISOString().split('T')[0]
  const columnSuffix = options.columnId ? `-${columns.find(c => c.id === options.columnId)?.title || 'filtered'}` : ''
  const filename = `kanban-export${columnSuffix}-${date}.json`
  downloadFile(content, filename, 'application/json')
}

// Trigger download for CSV
export const downloadCSV = (columns: Column[], tasks: Task[], options: ExportOptions) => {
  const content = exportToCSVString(columns, tasks, options)
  const date = new Date().toISOString().split('T')[0]
  const columnSuffix = options.columnId ? `-${columns.find(c => c.id === options.columnId)?.title || 'filtered'}` : ''
  const filename = `kanban-export${columnSuffix}-${date}.csv`
  downloadFile(content, filename, 'text/csv;charset=utf-8')
}

// Parse import data
export interface ImportResult {
  success: boolean
  tasksImported: number
  errors: string[]
}

export const parseImportData = (content: string): { tasks: any[]; columns?: any[] } | null => {
  try {
    const data = JSON.parse(content)

    // Check if it's our export format
    if (data.tasks && Array.isArray(data.tasks)) {
      return {
        tasks: data.tasks,
        columns: data.columns
      }
    }

    // Try to parse as Trello export
    if (data.cards && Array.isArray(data.cards)) {
      return {
        tasks: data.cards.map((card: any) => ({
          title: card.name,
          description: card.desc,
          due_date: card.due,
          labels: card.labels?.map((l: any) => l.name),
          column_title: card.list?.name || 'To Do'
        }))
      }
    }

    return null
  } catch (e) {
    // Try CSV parsing
    if (content.includes(',') && content.includes('\n')) {
      const lines = content.split('\n')
      const headers = lines[0].split(',')

      if (headers.some(h => h.toLowerCase().includes('title'))) {
        const tasks = lines.slice(1).map(line => {
          const values = line.split(',')
          const task: any = {}

          headers.forEach((header, i) => {
            const h = header.toLowerCase().trim()
            if (h.includes('title') || h.includes('name')) {
              task.title = values[i]?.replace(/^"|"$/g, '')
            } else if (h.includes('description') || h.includes('desc')) {
              task.description = values[i]?.replace(/^"|"$/g, '')
            } else if (h.includes('priority')) {
              task.priority = values[i]?.toLowerCase() || 'medium'
            } else if (h.includes('status') || h.includes('column')) {
              task.column_title = values[i]
            } else if (h.includes('due')) {
              task.due_date = values[i]
            }
          })

          return task.title ? task : null
        }).filter(Boolean)

        return { tasks }
      }
    }

    return null
  }
}
