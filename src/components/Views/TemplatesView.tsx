import { useState, useEffect } from 'react'
import { FiFileText, FiPlus, FiTrash2, FiEdit2, FiCopy, FiX } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import * as api from '../../lib/api'
import type { TaskTemplate, TaskTemplateInsert } from '../../types/database'
import styles from './Views.module.css'

export default function TemplatesView() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    title_template: '',
    description_template: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    default_tags: '',
    subtask_templates: ''
  })

  useEffect(() => {
    loadTemplates()
  }, [user])

  const loadTemplates = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await api.getTaskTemplates(user.id)
      if (fetchError) {
        console.error('Error loading templates:', fetchError)
        setError('Gagal memuat template. Pastikan tabel task_templates sudah dibuat.')
      } else if (data) {
        setTemplates(data)
      }
    } catch (err) {
      console.error('Exception loading templates:', err)
      setError('Terjadi kesalahan saat memuat template.')
    }
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      title_template: '',
      description_template: '',
      priority: 'medium',
      default_tags: '',
      subtask_templates: ''
    })
    setEditingTemplate(null)
  }

  const handleOpenModal = (template?: TaskTemplate) => {
    if (template) {
      setEditingTemplate(template)
      setFormData({
        name: template.name,
        description: template.description || '',
        title_template: template.title_template || '',
        description_template: template.description_template || '',
        priority: template.priority,
        default_tags: (template.default_tags || []).join(', '),
        subtask_templates: (template.subtask_templates as any[])?.map((s: any) => s.title).join('\n') || ''
      })
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    resetForm()
  }

  const handleSave = async () => {
    if (!user || !formData.name.trim()) {
      showToast('Nama template harus diisi', 'error')
      return
    }

    const subtaskTemplates = formData.subtask_templates
      .split('\n')
      .filter(s => s.trim())
      .map((title, index) => ({ title: title.trim(), position: index }))

    const templateData: TaskTemplateInsert = {
      user_id: user.id,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      title_template: formData.title_template.trim() || null,
      description_template: formData.description_template.trim() || null,
      priority: formData.priority,
      default_labels: [],
      default_tags: formData.default_tags.split(',').map(t => t.trim()).filter(t => t),
      subtask_templates: subtaskTemplates
    }

    let error
    if (editingTemplate) {
      const result = await api.updateTaskTemplate(editingTemplate.id, templateData)
      error = result.error
    } else {
      const result = await api.createTaskTemplate(templateData)
      error = result.error
    }

    if (error) {
      showToast('Gagal menyimpan template', 'error')
      return
    }

    showToast(editingTemplate ? 'Template diperbarui' : 'Template dibuat', 'success')
    handleCloseModal()
    loadTemplates()
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Hapus template ini?')) return

    const { error } = await api.deleteTaskTemplate(templateId)
    if (error) {
      showToast('Gagal menghapus template', 'error')
      return
    }

    showToast('Template dihapus', 'info')
    loadTemplates()
  }

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div>
          <h1>Templates</h1>
          <p>Kelola template tugas untuk pembuatan cepat</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => handleOpenModal()}>
          <FiPlus /> New Template
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.purple}`}>
          <div className={styles.statIcon}><FiFileText /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{templates.length}</span>
            <span className={styles.statLabel}>Templates</span>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className={styles.section}>
        {loading ? (
          <div className={styles.emptyState}>
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><FiFileText /></div>
            <h3>Error</h3>
            <p>{error}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Jalankan migration 007_add_advanced_features.sql di Supabase
            </p>
            <button className={styles.primaryBtn} onClick={() => handleOpenModal()}>
              <FiPlus /> Buat Template
            </button>
          </div>
        ) : templates.length > 0 ? (
          <div className={styles.projectsGrid}>
            {templates.map(template => (
              <div key={template.id} className={styles.projectCard}>
                <div className={styles.projectHeader}>
                  <div className={styles.projectColor} style={{ background: '#8b5cf6' }}>
                    <FiFileText />
                  </div>
                  <div className={styles.projectCardActions}>
                    <button
                      className={styles.iconBtn}
                      onClick={() => handleOpenModal(template)}
                      title="Edit"
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className={`${styles.iconBtn} ${styles.danger}`}
                      onClick={() => handleDelete(template.id)}
                      title="Delete"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
                <h3>{template.name}</h3>
                {template.description && (
                  <p>{template.description}</p>
                )}
                <div className={styles.templateMeta}>
                  {template.title_template && (
                    <span className={styles.templateTag}>Title: {template.title_template}</span>
                  )}
                  <span className={styles.templateTag}>Priority: {template.priority}</span>
                  {template.default_tags && template.default_tags.length > 0 && (
                    <span className={styles.templateTag}>Tags: {template.default_tags.join(', ')}</span>
                  )}
                  {template.subtask_templates && Array.isArray(template.subtask_templates) && template.subtask_templates.length > 0 && (
                    <span className={styles.templateTag}>Subtasks: {(template.subtask_templates as any[]).length}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><FiFileText /></div>
            <h3>Belum ada template</h3>
            <p>Buat template untuk mempercepat pembuatan tugas</p>
            <button className={styles.primaryBtn} onClick={() => handleOpenModal()}>
              <FiPlus /> Buat Template
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modal} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingTemplate ? 'Edit Template' : 'New Template'}</h3>
              <button onClick={handleCloseModal}><FiX /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Template Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Bug Report, Feature Request"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this template for?"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Default Title</label>
                <input
                  type="text"
                  value={formData.title_template}
                  onChange={(e) => setFormData({ ...formData, title_template: e.target.value })}
                  placeholder="Default task title"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Default Description</label>
                <textarea
                  value={formData.description_template}
                  onChange={(e) => setFormData({ ...formData, description_template: e.target.value })}
                  placeholder="Default task description"
                  rows={3}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Default Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.default_tags}
                  onChange={(e) => setFormData({ ...formData, default_tags: e.target.value })}
                  placeholder="bug, urgent, frontend"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Subtasks (one per line)</label>
                <textarea
                  value={formData.subtask_templates}
                  onChange={(e) => setFormData({ ...formData, subtask_templates: e.target.value })}
                  placeholder="Research&#10;Design&#10;Implementation&#10;Testing"
                  rows={4}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.secondaryBtn} onClick={handleCloseModal}>
                Cancel
              </button>
              <button className={styles.primaryBtn} onClick={handleSave}>
                <FiFileText /> {editingTemplate ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
