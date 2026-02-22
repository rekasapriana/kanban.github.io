import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react'
import { FiPlus, FiEdit2, FiType, FiFlag, FiCalendar, FiTag, FiAlignLeft, FiCheckSquare, FiX, FiFolder, FiBookmark, FiUser, FiFileText, FiChevronDown, FiPaperclip } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import { useAuth } from '../../context/AuthContext'
import { getProjects, getLabels, getTeamMembers, getProfileByEmail, updateTeamMember, getTaskTemplates, uploadTaskAttachment } from '../../lib/api'
import type { Project, Label, TeamMember, TaskTemplate } from '../../types/database'
import Button from '../UI/Button'
import styles from './TaskModal.module.css'

interface SubtaskForm {
  id?: string
  title: string
  is_completed: boolean
}

interface PendingAttachment {
  file: File
  preview?: string
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
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const isEditing = !!state.editingTask

  // Load projects, labels, and team members
  useEffect(() => {
    const loadData = async () => {
      if (!user) return

      console.log('[TaskModal] Loading data for user:', user.id)

      const [projectsRes, labelsRes, membersRes, templatesRes] = await Promise.all([
        getProjects(user.id),
        getLabels(user.id),
        getTeamMembers(user.id),
        getTaskTemplates(user.id)
      ])

      console.log('[TaskModal] Projects:', projectsRes.data?.length || 0)
      console.log('[TaskModal] Labels:', labelsRes.data?.length || 0)
      console.log('[TaskModal] Team Members raw:', membersRes.data)
      console.log('[TaskModal] Team Members error:', membersRes.error)

      if (projectsRes.data) setProjects(projectsRes.data)
      if (labelsRes.data) setLabels(labelsRes.data)
      if (templatesRes.data) setTemplates(templatesRes.data)

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
    setPendingAttachments([])
    setShowTemplateDropdown(false)
  }

  // Attachment handlers
  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newAttachments: PendingAttachment[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) continue

      const attachment: PendingAttachment = { file }
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          attachment.preview = reader.result as string
        }
        reader.readAsDataURL(file)
      }
      newAttachments.push(attachment)
    }

    setPendingAttachments([...pendingAttachments, ...newAttachments])

    // Reset input
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = ''
    }
  }

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(pendingAttachments.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      return
    }

    const taskId = await saveTask(
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

    // Upload attachments if task was created successfully
    if (taskId && pendingAttachments.length > 0 && user) {
      for (const attachment of pendingAttachments) {
        await uploadTaskAttachment(taskId, user.id, attachment.file)
      }
    }

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

  // Apply template to form
  const applyTemplate = (template: TaskTemplate) => {
    if (template.title_template) {
      setTitle(template.title_template)
    }
    if (template.description_template) {
      setDescription(template.description_template)
    }
    setPriority(template.priority)
    if (template.default_tags && template.default_tags.length > 0) {
      setTags(template.default_tags)
    }
    if (template.subtask_templates && Array.isArray(template.subtask_templates)) {
      setSubtasks(template.subtask_templates.map((s: any, index: number) => ({
        title: s.title,
        is_completed: false
      })))
    }
    setShowTemplateDropdown(false)
  }

  // Create template from current form
  const saveAsTemplate = async () => {
    const name = prompt('Nama template:')
    if (!name || !user) return

    const { createTaskTemplate } = await import('../../lib/api')
    const { error } = await createTaskTemplate({
      user_id: user.id,
      name,
      description: `Template created from task: ${title}`,
      title_template: title,
      description_template: description,
      priority,
      default_tags: tags,
      subtask_templates: subtasks.map((s, i) => ({ title: s.title, position: i }))
    })

    if (error) {
      alert('Gagal menyimpan template')
    } else {
      alert('Template disimpan!')
      // Reload templates
      const { data } = await getTaskTemplates(user.id)
      if (data) setTemplates(data)
    }
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

        {/* Template Selector - Only show when creating new task */}
        {!isEditing && templates.length > 0 && (
          <div className={styles.templateSection}>
            <div className={styles.templateDropdown}>
              <button
                type="button"
                className={styles.templateBtn}
                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              >
                <FiFileText />
                <span>Use Template</span>
                <FiChevronDown className={showTemplateDropdown ? styles.rotated : ''} />
              </button>
              {showTemplateDropdown && (
                <div className={styles.templateList}>
                  {templates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      className={styles.templateItem}
                      onClick={() => applyTemplate(template)}
                    >
                      <FiFileText />
                      <div className={styles.templateInfo}>
                        <span className={styles.templateName}>{template.name}</span>
                        {template.description && (
                          <span className={styles.templateDesc}>{template.description}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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

            {/* Attachments */}
            <div className={styles.formGroup}>
              <label>
                <FiPaperclip />
                Attachments
              </label>
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                onChange={handleAttachmentSelect}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z,.txt,.jpg,.jpeg,.png,.gif,.svg"
              />
              <div className={styles.attachmentsContainer}>
                {pendingAttachments.length > 0 && (
                  <div className={styles.pendingAttachments}>
                    {pendingAttachments.map((att, i) => (
                      <div key={i} className={styles.pendingAttachment}>
                        {att.preview ? (
                          <img src={att.preview} alt={att.file.name} />
                        ) : (
                          <div className={styles.fileIcon}>
                            <FiPaperclip />
                          </div>
                        )}
                        <div className={styles.fileInfo}>
                          <span className={styles.fileName}>{att.file.name}</span>
                          <span className={styles.fileSize}>{formatFileSize(att.file.size)}</span>
                        </div>
                        <button
                          type="button"
                          className={styles.removeFile}
                          onClick={() => removePendingAttachment(i)}
                        >
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  <FiPlus /> Add Files
                </button>
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
