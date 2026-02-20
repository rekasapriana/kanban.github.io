import { useState, useEffect } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiTag, FiX } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import { getLabelWithTaskCount, createLabel, updateLabel, deleteLabel } from '../../lib/api'
import type { Label } from '../../types/database'
import styles from './Views.module.css'

interface LabelWithCount extends Label {
  task_count: number
}

export default function LabelsView() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [labels, setLabels] = useState<LabelWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    color: '#ef4444'
  })

  const colors = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    '#f97316', '#14b8a6', '#6366f1', '#d946ef'
  ]

  useEffect(() => {
    loadLabels()
  }, [user])

  const loadLabels = async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await getLabelWithTaskCount(user.id)
    if (!error && data) {
      setLabels(data)
    }
    setLoading(false)
  }

  const openCreateModal = () => {
    setEditingLabel(null)
    setFormData({ name: '', color: '#ef4444' })
    setShowModal(true)
  }

  const openEditModal = (label: Label) => {
    setEditingLabel(label)
    setFormData({
      name: label.name,
      color: label.color
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formData.name.trim()) return

    if (editingLabel) {
      // Update existing label
      const { data, error } = await updateLabel(editingLabel.id, {
        name: formData.name.trim(),
        color: formData.color
      })
      if (!error && data) {
        setLabels(labels.map(l => l.id === data.id ? data : l))
        showToast('Label updated!', 'success')
      } else {
        showToast('Failed to update label', 'error')
      }
    } else {
      // Create new label
      const { data, error } = await createLabel({
        user_id: user.id,
        name: formData.name.trim(),
        color: formData.color
      })
      if (!error && data) {
        setLabels([...labels, data])
        showToast('Label created!', 'success')
      } else {
        showToast('Failed to create label', 'error')
      }
    }
    setShowModal(false)
  }

  const handleDelete = async (labelId: string) => {
    if (!confirm('Are you sure you want to delete this label?')) return
    const { error } = await deleteLabel(labelId)
    if (!error) {
      setLabels(labels.filter(l => l.id !== labelId))
      showToast('Label deleted!', 'success')
    } else {
      showToast('Failed to delete label', 'error')
    }
  }

  if (loading) {
    return (
      <div className={styles.viewContainer}>
        <div className={styles.loading}>Loading labels...</div>
      </div>
    )
  }

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div>
          <h1>Labels</h1>
          <p>Organize your tasks with labels</p>
        </div>
        <button className={styles.primaryBtn} onClick={openCreateModal}>
          <FiPlus /> New Label
        </button>
      </div>

      <div className={styles.labelsGrid}>
        {labels.map(label => (
          <div key={label.id} className={styles.labelCard}>
            <div className={styles.labelColor} style={{ background: label.color }} />
            <div className={styles.labelContent}>
              <span className={styles.labelName}>{label.name}</span>
              <span className={styles.labelCount}>{label.task_count} task{label.task_count !== 1 ? 's' : ''}</span>
            </div>
            <div className={styles.labelActions}>
              <button onClick={() => openEditModal(label)} className={styles.actionBtn}>
                <FiEdit2 />
              </button>
              <button onClick={() => handleDelete(label.id)} className={`${styles.actionBtn} ${styles.danger}`}>
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}

        {/* Add Label */}
        <div className={styles.addLabelCard} onClick={openCreateModal}>
          <FiTag />
          <span>Add Label</span>
        </div>
      </div>

      {/* Label Usage */}
      {labels.length > 0 && (
        <div className={styles.section}>
          <h2>Your Labels</h2>
          <div className={styles.usageChart}>
            {labels.map(label => (
              <div key={label.id} className={styles.usageBar}>
                <div className={styles.usageLabel}>
                  <span className={styles.usageDot} style={{ background: label.color }} />
                  <span>{label.name}</span>
                </div>
                <div className={styles.usageProgress}>
                  <div style={{ width: `${100 / labels.length}%`, background: label.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingLabel ? 'Edit Label' : 'New Label'}</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Label Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter label name"
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label>Color</label>
                <div className={styles.colorPicker}>
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`${styles.colorOption} ${formData.color === color ? styles.selected : ''}`}
                      style={{ background: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  {editingLabel ? 'Save Changes' : 'Create Label'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
