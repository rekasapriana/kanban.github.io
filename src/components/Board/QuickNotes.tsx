import { useState, useEffect } from 'react'
import { FiPlus, FiX, FiEdit2, FiCheck, FiFileText } from 'react-icons/fi'
import styles from './Board.module.css'

interface QuickNote {
  id: string
  content: string
  color: string
  createdAt: string
}

const NOTES_KEY = 'kanban_quick_notes'
const COLORS = ['#fef3c7', '#fce7f3', '#dbeafe', '#d1fae5', '#e9d5ff', '#fed7aa']

export default function QuickNotes() {
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  // Load notes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTES_KEY)
      if (stored) {
        setNotes(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Error loading quick notes:', e)
    }
  }, [])

  // Save notes to localStorage
  const saveNotes = (newNotes: QuickNote[]) => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(newNotes))
      setNotes(newNotes)
    } catch (e) {
      console.error('Error saving quick notes:', e)
    }
  }

  const addNote = () => {
    if (!newNote.trim()) return

    const note: QuickNote = {
      id: Date.now().toString(),
      content: newNote.trim(),
      color: newColor,
      createdAt: new Date().toISOString()
    }

    saveNotes([note, ...notes])
    setNewNote('')
    setNewColor(COLORS[0])
    setIsAdding(false)
  }

  const deleteNote = (id: string) => {
    saveNotes(notes.filter(n => n.id !== id))
  }

  const startEdit = (note: QuickNote) => {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  const saveEdit = (id: string) => {
    if (!editContent.trim()) return

    saveNotes(notes.map(n =>
      n.id === id ? { ...n, content: editContent.trim() } : n
    ))
    setEditingId(null)
    setEditContent('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  return (
    <div className={`${styles.quickNotes} ${isExpanded ? styles.expanded : ''}`}>
      <div className={styles.quickNotesHeader} onClick={() => setIsExpanded(!isExpanded)}>
        <FiFileText />
        <span>Quick Notes</span>
        <span className={styles.noteCount}>{notes.length}</span>
        <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className={styles.quickNotesContent}>
          {/* Add Note Button */}
          {!isAdding ? (
            <button
              className={styles.addNoteBtn}
              onClick={(e) => {
                e.stopPropagation()
                setIsAdding(true)
              }}
            >
              <FiPlus /> Add Note
            </button>
          ) : (
            <div className={styles.addNoteForm}>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write a quick note..."
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <div className={styles.colorPicker}>
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`${styles.colorBtn} ${newColor === color ? styles.active : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setNewColor(color)
                    }}
                  />
                ))}
              </div>
              <div className={styles.noteActions}>
                <button onClick={addNote} disabled={!newNote.trim()}>
                  <FiCheck /> Save
                </button>
                <button onClick={() => setIsAdding(false)}>
                  <FiX /> Cancel
                </button>
              </div>
            </div>
          )}

          {/* Notes List */}
          <div className={styles.notesList}>
            {notes.map(note => (
              <div
                key={note.id}
                className={styles.noteCard}
                style={{ backgroundColor: note.color }}
              >
                {editingId === note.id ? (
                  <div className={styles.editNoteForm}>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                    <div className={styles.noteActions}>
                      <button onClick={() => saveEdit(note.id)}>
                        <FiCheck />
                      </button>
                      <button onClick={cancelEdit}>
                        <FiX />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>{note.content}</p>
                    <div className={styles.noteCardActions}>
                      <button onClick={() => startEdit(note)} title="Edit">
                        <FiEdit2 />
                      </button>
                      <button onClick={() => deleteNote(note.id)} title="Delete">
                        <FiX />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {notes.length === 0 && !isAdding && (
            <p className={styles.noNotes}>No notes yet. Click "Add Note" to create one.</p>
          )}
        </div>
      )}
    </div>
  )
}
