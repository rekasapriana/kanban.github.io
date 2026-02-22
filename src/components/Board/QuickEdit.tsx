import { useState, useEffect, useRef } from 'react'
import { FiX, FiCheck, FiFlag, FiAlignLeft, FiBookmark } from 'react-icons/fi'
import type { Task, Label } from '../../types/database'
import { updateTask, getLabels } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useBoard } from '../../context/BoardContext'
import { useToast } from '../../hooks/useToast'
import styles from './QuickEdit.module.css'

interface QuickEditProps {
  task: Task
  position: { top: number; left: number }
  onClose: () => void
}

export default function QuickEdit({ task, position, onClose }: QuickEditProps) {
  const { user } = useAuth()
  const { loadTasks } = useBoard()
  const { showToast } = useToast()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState(task.priority)
  const [labels, setLabels] = useState<Label[]>([])
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    task.task_labels?.map(tl => tl.label_id) || []
  )
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  // Load labels
  useEffect(() => {
    const loadLabels = async () => {
      if (!user) return
      const { data } = await getLabels(user.id)
      if (data) setLabels(data)
    }
    loadLabels()
  }, [user])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleSave()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [title, description, priority, selectedLabels])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [title, description, priority, selectedLabels])

  const handleSave = async () => {
    if (saving) return

    // Check if anything changed
    const titleChanged = title !== task.title
    const descChanged = description !== (task.description || '')
    const priorityChanged = priority !== task.priority
    const labelsChanged =
      selectedLabels.length !== (task.task_labels?.length || 0) ||
      selectedLabels.some(id => !task.task_labels?.find(tl => tl.label_id === id))

    if (!titleChanged && !descChanged && !priorityChanged && !labelsChanged) {
      onClose()
      return
    }

    setSaving(true)

    try {
      // Update task
      if (titleChanged || descChanged || priorityChanged) {
        const { error } = await updateTask(task.id, {
          title: title.trim() || task.title,
          description: description.trim() || null,
          priority
        })

        if (error) {
          showToast('Failed to save changes', 'error')
          return
        }
      }

      // Update labels if changed
      if (labelsChanged && user) {
        const { updateTaskLabels } = await import('../../lib/api')
        await updateTaskLabels(task.id, selectedLabels)
      }

      await loadTasks()
      showToast('Task updated', 'success')
    } catch (error) {
      showToast('Failed to save changes', 'error')
    } finally {
      setSaving(false)
      onClose()
    }
  }

  const toggleLabel = (labelId: string) => {
    if (selectedLabels.includes(labelId)) {
      setSelectedLabels(selectedLabels.filter(id => id !== labelId))
    } else {
      setSelectedLabels([...selectedLabels, labelId])
    }
  }

  return (
    <div
      ref={popoverRef}
      className={styles.popover}
      style={{
        top: position.top,
        left: position.left
      }}
    >
      <div className={styles.header}>
        <span>Quick Edit</span>
        <button className={styles.closeBtn} onClick={onClose}>
          <FiX />
        </button>
      </div>

      <div className={styles.content}>
        {/* Title */}
        <div className={styles.field}>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            className={styles.titleInput}
          />
        </div>

        {/* Description */}
        <div className={styles.field}>
          <label>
            <FiAlignLeft />
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add description..."
            rows={2}
            className={styles.textarea}
          />
        </div>

        {/* Priority */}
        <div className={styles.field}>
          <label>
            <FiFlag />
            Priority
          </label>
          <div className={styles.priorityBtns}>
            {(['high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                className={`${styles.priorityBtn} ${styles[p]} ${priority === p ? styles.active : ''}`}
                onClick={() => setPriority(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Labels */}
        {labels.length > 0 && (
          <div className={styles.field}>
            <label>
              <FiBookmark />
              Labels
            </label>
            <div className={styles.labelsGrid}>
              {labels.map((label) => (
                <button
                  key={label.id}
                  className={`${styles.labelBtn} ${selectedLabels.includes(label.id) ? styles.labelSelected : ''}`}
                  style={{
                    background: selectedLabels.includes(label.id) ? label.color : `${label.color}20`,
                    color: selectedLabels.includes(label.id) ? 'white' : label.color,
                    borderColor: label.color
                  }}
                  onClick={() => toggleLabel(label.id)}
                >
                  {label.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={onClose}>
          Cancel
        </button>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={saving || !title.trim()}
        >
          <FiCheck />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
