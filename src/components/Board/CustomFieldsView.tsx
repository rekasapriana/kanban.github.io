import { useState, useEffect } from 'react'
import { useBoard } from '../../context/BoardContext'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../lib/supabase'
import type { CustomField, CustomFieldInsert } from '../../types/database'
import styles from './CustomFieldsView.module.css'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'url', label: 'URL' }
]

// Predefined field templates
const FIELD_TEMPLATES = [
  {
    name: 'Payment Status',
    field_type: 'select',
    options: [
      { value: 'unpaid', label: 'Unpaid' },
      { value: 'pending', label: 'Pending' },
      { value: 'paid', label: 'Paid' }
    ],
    is_required: false
  },
  {
    name: 'Priority Level',
    field_type: 'select',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' }
    ],
    is_required: false
  },
  {
    name: 'Estimated Hours',
    field_type: 'number',
    options: [],
    is_required: false
  },
  {
    name: 'Client Name',
    field_type: 'text',
    options: [],
    is_required: false
  },
  {
    name: 'Document Link',
    field_type: 'url',
    options: [],
    is_required: false
  },
  {
    name: 'Start Date',
    field_type: 'date',
    options: [],
    is_required: false
  },
  {
    name: 'Approved',
    field_type: 'checkbox',
    options: [],
    is_required: false
  },
  {
    name: 'Task Type',
    field_type: 'select',
    options: [
      { value: 'bug', label: 'Bug' },
      { value: 'feature', label: 'Feature' },
      { value: 'improvement', label: 'Improvement' },
      { value: 'documentation', label: 'Documentation' }
    ],
    is_required: false
  }
]

export default function CustomFieldsView() {
  const { state } = useBoard()
  const { showToast } = useToast()
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [fieldType, setFieldType] = useState('text')
  const [options, setOptions] = useState<{ value: string; label: string }[]>([])
  const [isRequired, setIsRequired] = useState(false)
  const [newOption, setNewOption] = useState('')

  useEffect(() => {
    loadFields()
  }, [state.board?.id])

  const loadFields = async () => {
    if (!state.board?.id) return

    setLoading(true)
    const { data, error } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('board_id', state.board.id)
      .order('position', { ascending: true })

    if (!error && data) {
      setFields(data)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setName('')
    setFieldType('text')
    setOptions([])
    setIsRequired(false)
    setNewOption('')
    setEditingField(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (field: CustomField) => {
    setEditingField(field)
    setName(field.name)
    setFieldType(field.field_type)
    setOptions(field.options || [])
    setIsRequired(field.is_required)
    setShowModal(true)
  }

  const addOption = () => {
    if (!newOption.trim()) return
    setOptions([...options, { value: newOption.trim().toLowerCase().replace(/\s+/g, '-'), label: newOption.trim() }])
    setNewOption('')
  }

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!state.board?.id || !name.trim()) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    // Validate options for select types
    if ((fieldType === 'select' || fieldType === 'multiselect') && options.length === 0) {
      showToast('Please add at least one option', 'error')
      return
    }

    const fieldData: CustomFieldInsert = {
      board_id: state.board.id,
      name: name.trim(),
      field_type: fieldType,
      options: fieldType === 'select' || fieldType === 'multiselect' ? options : [],
      is_required: isRequired,
      position: fields.length
    }

    try {
      if (editingField) {
        const { error } = await supabase
          .from('custom_fields')
          .update({
            name: fieldData.name,
            field_type: fieldData.field_type,
            options: fieldData.options,
            is_required: fieldData.is_required
          })
          .eq('id', editingField.id)

        if (error) throw error
        showToast('Field updated!', 'success')
      } else {
        const { error } = await supabase
          .from('custom_fields')
          .insert(fieldData)

        if (error) throw error
        showToast('Field created!', 'success')
      }

      setShowModal(false)
      resetForm()
      loadFields()
    } catch (error: any) {
      console.error('Save field error:', error)
      showToast('Failed to save field', 'error')
    }
  }

  const handleDelete = async (fieldId: string) => {
    if (!confirm('Delete this custom field? All values will be lost.')) return

    try {
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', fieldId)

      if (error) throw error
      showToast('Field deleted', 'info')
      loadFields()
    } catch (error: any) {
      console.error('Delete field error:', error)
      showToast('Failed to delete field', 'error')
    }
  }

  // Quick add from template
  const handleAddTemplate = async (template: typeof FIELD_TEMPLATES[0]) => {
    if (!state.board?.id) return

    // Check if field with same name already exists
    if (fields.some(f => f.name.toLowerCase() === template.name.toLowerCase())) {
      showToast(`Field "${template.name}" already exists`, 'error')
      return
    }

    try {
      const fieldData: CustomFieldInsert = {
        board_id: state.board.id,
        name: template.name,
        field_type: template.field_type,
        options: template.options,
        is_required: template.is_required,
        position: fields.length
      }

      const { error } = await supabase
        .from('custom_fields')
        .insert(fieldData)

      if (error) throw error
      showToast(`"${template.name}" field added!`, 'success')
      loadFields()
    } catch (error: any) {
      console.error('Add template error:', error)
      showToast('Failed to add field', 'error')
    }
  }

  // Get field type icon
  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝'
      case 'number': return '🔢'
      case 'date': return '📅'
      case 'select': return '📋'
      case 'multiselect': return '📑'
      case 'checkbox': return '☑️'
      case 'url': return '🔗'
      default: return '📄'
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading custom fields...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Custom Fields</h2>
          <p className={styles.subtitle}>Add custom fields to tasks for additional data</p>
        </div>
        <button className={styles.createBtn} onClick={openCreateModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Field
        </button>
      </div>

      {/* Field Templates Section */}
      <div className={styles.templatesSection}>
        <h3 className={styles.templatesTitle}>Quick Add Templates</h3>
        <p className={styles.templatesSubtitle}>Click to quickly add common custom fields</p>
        <div className={styles.templatesGrid}>
          {FIELD_TEMPLATES.map((template, index) => {
            const alreadyExists = fields.some(f => f.name.toLowerCase() === template.name.toLowerCase())
            return (
              <button
                key={index}
                className={`${styles.templateCard} ${alreadyExists ? styles.templateAdded : ''}`}
                onClick={() => handleAddTemplate(template)}
                disabled={alreadyExists}
                title={alreadyExists ? 'Already added' : `Add ${template.name} field`}
              >
                <span className={styles.templateIcon}>{getFieldIcon(template.field_type)}</span>
                <span className={styles.templateName}>{template.name}</span>
                <span className={styles.templateType}>
                  {FIELD_TYPES.find(t => t.value === template.field_type)?.label}
                </span>
                {alreadyExists && <span className={styles.addedBadge}>✓ Added</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Fields */}
      <div className={styles.activeFieldsSection}>
        <h3 className={styles.sectionTitle}>Active Fields ({fields.length})</h3>
        {fields.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No custom fields added yet. Use templates above or create your own.</p>
          </div>
        ) : (
          <div className={styles.fieldList}>
            {fields.map(field => (
              <div key={field.id} className={styles.fieldCard}>
                <div className={styles.fieldInfo}>
                  <div className={styles.fieldIcon}>
                    {getFieldIcon(field.field_type)}
                  </div>
                  <div className={styles.fieldDetails}>
                    <h3 className={styles.fieldName}>
                      {field.name}
                      {field.is_required && <span className={styles.required}>*</span>}
                    </h3>
                    <p className={styles.fieldType}>
                      {FIELD_TYPES.find(t => t.value === field.field_type)?.label}
                      {field.options && field.options.length > 0 && ` (${field.options.length} options)`}
                    </p>
                  </div>
                </div>
                <div className={styles.fieldActions}>
                  <button className={styles.editBtn} onClick={() => openEditModal(field)}>
                    Edit
                  </button>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(field.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingField ? 'Edit Custom Field' : 'Add Custom Field'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Field Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Budget, Customer, Status"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Field Type *</label>
                <select value={fieldType} onChange={e => setFieldType(e.target.value)}>
                  {FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {(fieldType === 'select' || fieldType === 'multiselect') && (
                <div className={styles.formGroup}>
                  <label>Options</label>
                  <div className={styles.optionsInput}>
                    <input
                      type="text"
                      value={newOption}
                      onChange={e => setNewOption(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                      placeholder="Type option and press Enter"
                    />
                    <button type="button" onClick={addOption}>Add</button>
                  </div>
                  {options.length > 0 && (
                    <div className={styles.optionsList}>
                      {options.map((opt, i) => (
                        <div key={i} className={styles.optionTag}>
                          {opt.label}
                          <button onClick={() => removeOption(i)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={e => setIsRequired(e.target.checked)}
                  />
                  Required field
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className={styles.saveBtn} onClick={handleSave}>
                {editingField ? 'Update Field' : 'Add Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
