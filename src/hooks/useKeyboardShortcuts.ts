import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions) => {
  const { shortcuts, enabled = true } = options

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if disabled
    if (!enabled) return

    // Skip if typing in input/textarea/select
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return
    }

    // Skip if meta key is pressed (for browser shortcuts) unless shortcut requires ctrl
    if (event.metaKey && !shortcuts.some(s => s.ctrl)) {
      return
    }

    const key = event.key.toLowerCase()

    // Find matching shortcut
    const matchingShortcut = shortcuts.find(shortcut => {
      const shortcutKey = shortcut.key.toLowerCase()

      return (
        shortcutKey === key &&
        !!shortcut.ctrl === (event.ctrlKey || event.metaKey) &&
        !!shortcut.shift === event.shiftKey &&
        !!shortcut.alt === event.altKey
      )
    })

    if (matchingShortcut) {
      event.preventDefault()
      matchingShortcut.action()
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

// Default shortcuts for the Kanban board
export const getDefaultShortcuts = (actions: {
  onNewTask: () => void
  onEditTask: () => void
  onDeleteTask: () => void
  onClose: () => void
  onSearch: () => void
  onShowHelp: () => void
  onToggleView: () => void
  onArchiveTask: () => void
  onUndo: () => void
  onRedo: () => void
  onToggleStats: () => void
  onToggleTheme: () => void
  onNavigateUp: () => void
  onNavigateDown: () => void
  onSetHighPriority: () => void
  onSetMediumPriority: () => void
  onSetLowPriority: () => void
  onSelectAll: () => void
  onOpenDetail: () => void
}): KeyboardShortcut[] => [
  // Task actions
  {
    key: 'n',
    action: actions.onNewTask,
    description: 'Create new task'
  },
  {
    key: 'e',
    action: actions.onEditTask,
    description: 'Edit selected task'
  },
  {
    key: 'Delete',
    action: actions.onDeleteTask,
    description: 'Delete selected task'
  },
  {
    key: 'Backspace',
    action: actions.onDeleteTask,
    description: 'Delete selected task'
  },
  {
    key: 'a',
    action: actions.onArchiveTask,
    description: 'Archive selected task'
  },
  {
    key: 'Enter',
    action: actions.onOpenDetail,
    description: 'Open task detail'
  },

  // Navigation
  {
    key: 'Escape',
    action: actions.onClose,
    description: 'Close modal/panel'
  },
  {
    key: '/',
    action: actions.onSearch,
    description: 'Focus search'
  },
  {
    key: 'f',
    action: actions.onSearch,
    description: 'Focus search'
  },
  {
    key: 'v',
    action: actions.onToggleView,
    description: 'Toggle board/list view'
  },
  {
    key: 'ArrowUp',
    action: actions.onNavigateUp,
    description: 'Navigate to previous task'
  },
  {
    key: 'ArrowDown',
    action: actions.onNavigateDown,
    description: 'Navigate to next task'
  },

  // View controls
  {
    key: 's',
    action: actions.onToggleStats,
    description: 'Toggle statistics panel'
  },
  {
    key: 't',
    action: actions.onToggleTheme,
    description: 'Toggle dark mode'
  },

  // Priority
  {
    key: 'h',
    action: actions.onSetHighPriority,
    description: 'Set high priority'
  },
  {
    key: 'm',
    action: actions.onSetMediumPriority,
    description: 'Set medium priority'
  },
  {
    key: 'l',
    action: actions.onSetLowPriority,
    description: 'Set low priority'
  },

  // Bulk actions
  {
    key: 'a',
    ctrl: true,
    action: actions.onSelectAll,
    description: 'Select all tasks'
  },

  // Help
  {
    key: '?',
    shift: true,
    action: actions.onShowHelp,
    description: 'Show keyboard shortcuts'
  },
  {
    key: '?',
    action: actions.onShowHelp,
    description: 'Show keyboard shortcuts'
  },

  // History
  {
    key: 'z',
    ctrl: true,
    action: actions.onUndo,
    description: 'Undo last action'
  },
  {
    key: 'y',
    ctrl: true,
    action: actions.onRedo,
    description: 'Redo last undone action'
  },
  {
    key: 'z',
    ctrl: true,
    shift: true,
    action: actions.onRedo,
    description: 'Redo last undone action'
  }
]

// Get all available shortcuts for display
export const getAllShortcuts = (): { keys: string; description: string; category: string }[] => [
  // Task actions
  { keys: 'N', description: 'Create new task', category: 'Tasks' },
  { keys: 'E', description: 'Edit selected task', category: 'Tasks' },
  { keys: 'Enter', description: 'Open task detail', category: 'Tasks' },
  { keys: 'Delete', description: 'Delete selected task', category: 'Tasks' },
  { keys: 'Backspace', description: 'Delete selected task', category: 'Tasks' },
  { keys: 'A', description: 'Archive selected task', category: 'Tasks' },
  { keys: 'Space', description: 'Toggle task selection', category: 'Tasks' },

  // Navigation
  { keys: '↑', description: 'Navigate to previous task', category: 'Navigation' },
  { keys: '↓', description: 'Navigate to next task', category: 'Navigation' },
  { keys: '/', description: 'Focus search', category: 'Navigation' },
  { keys: 'F', description: 'Focus search', category: 'Navigation' },
  { keys: 'Esc', description: 'Close modal/panel', category: 'Navigation' },
  { keys: 'V', description: 'Toggle board/list view', category: 'Navigation' },

  // Quick Move
  { keys: '1', description: 'Move task to first column', category: 'Quick Move' },
  { keys: '2', description: 'Move task to second column', category: 'Quick Move' },
  { keys: '3', description: 'Move task to third column', category: 'Quick Move' },
  { keys: '4', description: 'Move task to fourth column', category: 'Quick Move' },
  { keys: '5', description: 'Move task to fifth column', category: 'Quick Move' },

  // Priority
  { keys: 'H', description: 'Set high priority', category: 'Priority' },
  { keys: 'M', description: 'Set medium priority', category: 'Priority' },
  { keys: 'L', description: 'Set low priority', category: 'Priority' },

  // View
  { keys: 'S', description: 'Toggle statistics panel', category: 'View' },
  { keys: 'T', description: 'Toggle dark mode', category: 'View' },

  // History
  { keys: 'Ctrl+Z', description: 'Undo last action', category: 'History' },
  { keys: 'Ctrl+Y', description: 'Redo last undone action', category: 'History' },
  { keys: 'Ctrl+Shift+Z', description: 'Redo last undone action', category: 'History' },

  // Bulk Actions
  { keys: 'Ctrl+A', description: 'Select all tasks', category: 'Bulk Actions' },

  // Help
  { keys: '?', description: 'Show keyboard shortcuts', category: 'Help' },
]
