import { useState, useCallback } from 'react'
import { FiX, FiUpload, FiFile, FiCheck, FiAlertCircle } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import { useAuth } from '../../context/AuthContext'
import { parseImportData, ImportResult } from '../../utils/exportUtils'
import * as api from '../../lib/api'
import styles from './ImportModal.module.css'

interface ImportModalProps {
  onClose: () => void
}

export default function ImportModal({ onClose }: ImportModalProps) {
  const { state, loadTasks } = useBoard()
  const { user } = useAuth()
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [conflictResolution, setConflictResolution] = useState<'skip' | 'update' | 'duplicate'>('duplicate')

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const processFile = async (file: File) => {
    setFile(file)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const parsed = parseImportData(content)

      if (parsed && parsed.tasks.length > 0) {
        setPreview(parsed.tasks.slice(0, 10)) // Show first 10 tasks
      } else {
        setPreview(null)
        setResult({
          success: false,
          tasksImported: 0,
          errors: ['Unable to parse file. Please check the format.']
        })
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const handleImport = async () => {
    if (!file || !user || !state.board) return

    setImporting(true)
    const errors: string[] = []
    let tasksImported = 0

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const content = e.target?.result as string
        const parsed = parseImportData(content)

        if (!parsed) {
          setResult({
            success: false,
            tasksImported: 0,
            errors: ['Failed to parse import data']
          })
          setImporting(false)
          return
        }

        // Create column mapping
        const columnMap = new Map(
          state.columns.map(c => [c.title.toLowerCase(), c.id])
        )
        const defaultColumnId = state.columns.find(c => c.title.toLowerCase() === 'to do')?.id || state.columns[0]?.id

        for (const taskData of parsed.tasks) {
          try {
            // Map column title to ID
            let columnId = defaultColumnId
            if (taskData.column_title) {
              columnId = columnMap.get(taskData.column_title.toLowerCase()) || defaultColumnId
            } else if (taskData.column_id && state.columns.find(c => c.id === taskData.column_id)) {
              columnId = taskData.column_id
            }

            // Create task
            const newTask: any = {
              board_id: state.board!.id,
              column_id: columnId,
              user_id: user.id,
              title: taskData.title || 'Untitled Task',
              description: taskData.description || null,
              priority: taskData.priority || 'medium',
              due_date: taskData.due_date || null,
              position: 0,
              is_archived: taskData.is_archived || false
            }

            const { data: createdTask, error: taskError } = await api.createTask(newTask)

            if (taskError) {
              errors.push(`Failed to create task "${taskData.title}": ${taskError.message}`)
              continue
            }

            // Add tags/labels if present
            if (taskData.tags && Array.isArray(taskData.tags)) {
              for (const tag of taskData.tags) {
                await api.createTag({ task_id: createdTask.id, name: tag })
              }
            }

            // Add subtasks if present
            if (taskData.subtasks && Array.isArray(taskData.subtasks)) {
              for (let i = 0; i < taskData.subtasks.length; i++) {
                const subtask = taskData.subtasks[i]
                await api.createSubtask({
                  task_id: createdTask.id,
                  title: subtask.title || subtask,
                  is_completed: subtask.is_completed || false,
                  position: i
                })
              }
            }

            tasksImported++
          } catch (err: any) {
            errors.push(`Error importing task "${taskData.title}": ${err.message}`)
          }
        }

        await loadTasks()

        setResult({
          success: tasksImported > 0,
          tasksImported,
          errors
        })
        setImporting(false)
        setPreview(null)
        setFile(null)
      }
      reader.readAsText(file)
    } catch (error: any) {
      setResult({
        success: false,
        tasksImported: 0,
        errors: [error.message]
      })
      setImporting(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Import Tasks</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className={styles.content}>
          {!result ? (
            <>
              {/* Drop Zone */}
              <div
                className={`${styles.dropZone} ${dragActive ? styles.active : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <FiUpload className={styles.uploadIcon} />
                <p className={styles.dropText}>
                  Drag and drop a file here, or{' '}
                  <label className={styles.browseLink}>
                    browse
                    <input
                      type="file"
                      accept=".json,.csv"
                      onChange={handleFileChange}
                      className={styles.fileInput}
                    />
                  </label>
                </p>
                <p className={styles.hint}>
                  Supports JSON and CSV formats
                </p>
              </div>

              {/* File Preview */}
              {file && preview && (
                <div className={styles.preview}>
                  <div className={styles.fileInfo}>
                    <FiFile />
                    <span>{file.name}</span>
                    <span className={styles.taskCount}>{preview.length}+ tasks found</span>
                  </div>

                  <div className={styles.previewList}>
                    <h4>Preview (first 10 tasks)</h4>
                    {preview.map((task, i) => (
                      <div key={i} className={styles.previewItem}>
                        <strong>{task.title}</strong>
                        <span className={styles.previewMeta}>
                          {task.priority && <span className={styles.priority}>{task.priority}</span>}
                          {task.column_title && <span>{task.column_title}</span>}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.options}>
                    <label className={styles.optionLabel}>If task already exists:</label>
                    <select
                      value={conflictResolution}
                      onChange={(e) => setConflictResolution(e.target.value as any)}
                      className={styles.select}
                    >
                      <option value="duplicate">Create duplicate</option>
                      <option value="skip">Skip</option>
                      <option value="update">Update existing</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.result}>
              {result.success ? (
                <div className={styles.successResult}>
                  <FiCheck className={styles.successIcon} />
                  <h3>Import Complete!</h3>
                  <p>{result.tasksImported} tasks imported successfully</p>
                </div>
              ) : (
                <div className={styles.errorResult}>
                  <FiAlertCircle className={styles.errorIcon} />
                  <h3>Import Failed</h3>
                  <p>No tasks were imported</p>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className={styles.errors}>
                  <h4>Warnings/Errors:</h4>
                  <ul>
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>...and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {result ? (
            <button className={styles.doneBtn} onClick={onClose}>
              Done
            </button>
          ) : (
            <>
              <button className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button
                className={styles.importBtn}
                onClick={handleImport}
                disabled={!file || !preview || importing}
              >
                {importing ? 'Importing...' : 'Import Tasks'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
