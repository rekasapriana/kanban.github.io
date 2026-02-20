import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react'
import { FiPlus, FiEdit2, FiType, FiFlag, FiCalendar, FiTag, FiAlignLeft, FiCheckSquare, FiX, FiFolder, FiBookmark, FiUser } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import { useAuth } from '../../context/AuthContext'
import { getProjects, getLabels, getTeamMembers, getProfileByEmail, updateTeamMember } from '../../lib/api'
import type { Project, Label, TeamMember } from '../../types/database'
import Button from '../UI/Button'
import styles from './TaskModal.module.css'

interface SubtaskForm {
  id?: string
  title: string
  is_completed: boolean
}

export default function TaskModal() {
  const { state, closeModal, saveTask } = useBoard()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [subtasks, setSubtasks] = useState<SubtaskForm[]>([])
  const [subtaskInput, setSubtaskInput] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const titleInputRef = useRef<HTMLInputElement>(null)

  const isEditing = !!state.editingTask

  // Load projects, labels, and team members
  useEffect(() => {
    const loadData = async () => {
      if (!user) return

      console.log('[TaskModal] Loading data for user:', user.id)

      const [projectsRes, labelsRes, membersRes] = await Promise.all([
        getProjects(user.id),
        getLabels(user.id),
        getTeamMembers(user.id)
      ])

      console.log('[TaskModal] Projects:', projectsRes.data?.length || 0)
      console.log('[TaskModal] Labels:', labelsRes.data?.length || 0)
      console.log('[TaskModal] Team Members raw:', membersRes.data)
      console.log('[TaskModal] Team Members error:', membersRes.error)

      if (projectsRes.data) setProjects(projectsRes.data)
      if (labelsRes.data) setLabels(labelsRes.data)

      // Process team members
      if (membersRes.data && membersRes.data.length > 0) {
        console.log('[TaskModal] Processing', membersRes.data.length, 'members...')

        const linkedMembers = await Promise.all(
          membersRes.data.map(async (member) => {
            console.log('[TaskModal] Member:', member.name, '- auth_user_id:', member.auth_user_id, '- email:', member.email)

            // If already linked, return as is
            if (member.auth_user_id) {
              console.log('[TaskModal] Member', member.name, 'already linked to auth user')
              return member
            }

            // Try to find auth user by email
            const { data: profile, error: profileError } = await getProfileByEmail(member.email)
            console.log('[TaskModal] Profile lookup for', member.email, ':', profile ? 'found' : 'not found', 'error:', profileError)

            if (profile) {
              // Update team member with auth_user_id
              console.log('[TaskModal] Attempting to link member', member.name, 'to auth user', profile.id)
              const { error: updateError } = await updateTeamMember(member.id, { auth_user_id: profile.id })

              if (updateError) {
                console.error('[TaskModal] Failed to update member:', updateError)
                return member
              }

              console.log('[TaskModal] Successfully linked member', member.name)
              return { ...member, auth_user_id: profile.id }
            }

            console.log('[TaskModal] Member', member.name, 'has no auth account yet (pending signup)')
            return member
          })
        )

        const linkedCount = linkedMembers.filter(m => m.auth_user_id).length
        const pendingCount = linkedMembers.filter(m => !m.auth_user_id).length
        console.log('[TaskModal] Final result - Linked:', linkedCount, 'Pending signup:', pendingCount)

        setTeamMembers(linkedMembers)
      } else {
        console.log('[TaskModal] No team members found for this user')
      }
    }
    loadData()
  }, [user, state.isModalOpen])

  // Load task data when editing
  useEffect(() => {
    if (state.editingTask) {
      setTitle(state.editingTask.title)
      setDescription(state.editingTask.description || '')
      setPriority(state.editingTask.priority)
      setDueDate(state.editingTask.due_date || '')
      setTags(state.editingTask.tags?.map(t => t.name) || [])
      setSubtasks(state.editingTask.subtasks?.map(s => ({
        id: s.id,
        title: s.title,
        is_completed: s.is_completed
      })) || [])
      setProjectId(state.editingTask.project_id || null)
      setSelectedAssignees(state.editingTask.task_assignees?.map(ta => ta.user_id) || [])
      setSelectedLabels(state.editingTask.task_labels?.map(tl => tl.label_id) || [])
    } else {
      resetForm()
    }
  }, [state.editingTask, state.isModalOpen])

  // Focus title input when modal opens
  useEffect(() => {
    if (state.isModalOpen && titleInputRef.current) {
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [state.isModalOpen])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDueDate('')
    setTags([])
    setTagInput('')
    setSubtasks([])
    setSubtaskInput('')
    setProjectId(null)
    setSelectedAssignees([])
    setSelectedLabels([])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      return
    }

    await saveTask(
      {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate || null
      },
      tags,
      subtasks.map(s => ({
        id: s.id,
        title: s.title,
        is_completed: s.is_completed
      })),
      selectedLabels,
      projectId,
      selectedAssignees
    )

    resetForm()
  }

  const handleClose = () => {
    closeModal()
    resetForm()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  // Tags handlers
  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag])
      }
      setTagInput('')
    }
  }

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  // Subtasks handlers
  const handleSubtaskKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSubtask()
    }
  }

  const addSubtask = () => {
    const subtaskTitle = subtaskInput.trim()
    if (subtaskTitle) {
      setSubtasks([...subtasks, { title: subtaskTitle, is_completed: false }])
      setSubtaskInput('')
    }
  }

  const toggleSubtask = (index: number) => {
    setSubtasks(subtasks.map((s, i) =>
      i === index ? { ...s, is_completed: !s.is_completed } : s
    ))
  }

  const removeSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index))
  }

  // Label toggle
  const toggleLabel = (labelId: string) => {
    if (selectedLabels.includes(labelId)) {
      setSelectedLabels(selectedLabels.filter(id => id !== labelId))
    } else {
      setSelectedLabels([...selectedLabels, labelId])
    }
  }

  if (!state.isModalOpen) return null

  return (
    <div
      className={`${styles.modalOverlay} ${state.isModalOpen ? styles.active : ''}`}
      onClick={handleOverlayClick}
    >
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>
            {isEditing ? <FiEdit2 /> : <FiPlus />}
            {isEditing ? ' Edit Task' : ' Add New Task'}
          </h3>
          <button className={styles.modalClose} onClick={handleClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {/* Title & Priority */}
            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.flex2}`}>
                <label>
                  <FiType />
                  Task Title
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter task title..."
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  <FiFlag />
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Project */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>
                  <FiFolder />
                  Project
                </label>
                <select
                  value={projectId || ''}
                  onChange={(e) => setProjectId(e.target.value || null)}
                >
                  <option value="">No Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignees - Multiple Selection */}
            <div className={styles.formGroup}>
              <label>
                <FiUser />
                Assignees ({selectedAssignees.length} selected)
              </label>
              <div className={styles.assigneesContainer}>
                {teamMembers.filter(m => m.auth_user_id).length === 0 ? (
                  <span className={styles.hint}>
                    {teamMembers.length === 0
                      ? 'No team members yet. Invite some in the Team page.'
                      : `⚠️ ${teamMembers.length} member(s) invited but not yet signed up.`
                    }
                  </span>
                ) : (
                  <div className={styles.assigneesList}>
                    {teamMembers
                      .filter(m => m.auth_user_id)
                      .map(member => (
                        <button
                          key={member.id}
                          type="button"
                          className={`${styles.assigneeBtn} ${selectedAssignees.includes(member.auth_user_id!) ? styles.selected : ''}`}
                          onClick={() => {
                            if (selectedAssignees.includes(member.auth_user_id!)) {
                              setSelectedAssignees(selectedAssignees.filter(id => id !== member.auth_user_id))
                            } else {
                              setSelectedAssignees([...selectedAssignees, member.auth_user_id!])
                            }
                          }}
                        >
                          {member.name}
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>
                  <FiCalendar />
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Labels */}
            <div className={styles.formGroup}>
              <label>
                <FiBookmark />
                Labels
              </label>
              <div className={styles.labelsContainer}>
                {labels.length === 0 ? (
                  <span className={styles.noLabels}>No labels yet. Create some in Labels page.</span>
                ) : (
                  <div className={styles.labelsList}>
                    {labels.map(label => (
                      <button
                        key={label.id}
                        type="button"
                        className={`${styles.labelBtn} ${selectedLabels.includes(label.id) ? styles.selected : ''}`}
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
                )}
              </div>
            </div>

            {/* Tags */}
            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.flex2}`}>
                <label>
                  <FiTag />
                  Tags
                </label>
                <div className={styles.tagsInputContainer}>
                  <div className={styles.tagsList}>
                    {tags.map((tag, i) => (
                      <span key={i} className={styles.tagItem}>
                        {tag}
                        <button type="button" onClick={() => removeTag(i)}>&times;</button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    className={styles.tagInput}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tag..."
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className={styles.formGroup}>
              <label>
                <FiAlignLeft />
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                rows={2}
              />
            </div>

            {/* Subtasks */}
            <div className={styles.formGroup}>
              <label>
                <FiCheckSquare />
                Subtasks
              </label>
              <div className={styles.subtasksContainer}>
                <div className={styles.subtasksList}>
                  {subtasks.map((subtask, i) => (
                    <div key={i} className={`${styles.subtaskItem} ${subtask.is_completed ? styles.completed : ''}`}>
                      <input
                        type="checkbox"
                        checked={subtask.is_completed}
                        onChange={() => toggleSubtask(i)}
                      />
                      <span>{subtask.title}</span>
                      <button type="button" onClick={() => removeSubtask(i)}>
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
                <div className={styles.addSubtask}>
                  <input
                    type="text"
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    onKeyDown={handleSubtaskKeyDown}
                    placeholder="Add subtask..."
                  />
                  <button type="button" onClick={addSubtask}>
                    <FiPlus />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              <FiPlus />
              {isEditing ? 'Save Changes' : 'Add Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
