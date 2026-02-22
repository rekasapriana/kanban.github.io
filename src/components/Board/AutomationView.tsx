import { useState, useEffect } from 'react'
import { useBoard } from '../../context/BoardContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../lib/supabase'
import type { AutomationRule, AutomationRuleInsert } from '../../types/database'
import styles from './AutomationView.module.css'

const TRIGGER_TYPES = [
  { value: 'task_created', label: 'When a task is created' },
  { value: 'task_moved', label: 'When a task is moved to a column' },
  { value: 'task_completed', label: 'When a task is completed' },
  { value: 'due_date_approaching', label: 'When due date is approaching' },
  { value: 'priority_changed', label: 'When priority changes' }
]

const ACTION_TYPES = [
  { value: 'move_to_column', label: 'Move to column' },
  { value: 'assign_user', label: 'Assign user' },
  { value: 'add_label', label: 'Add label' },
  { value: 'set_priority', label: 'Set priority' },
  { value: 'send_notification', label: 'Send notification' }
]

export default function AutomationView() {
  const { state } = useBoard()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState('task_created')
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({})
  const [actionType, setActionType] = useState('move_to_column')
  const [actionConfig, setActionConfig] = useState<Record<string, any>>({})
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    loadRules()
  }, [state.board?.id])

  const loadRules = async () => {
    if (!state.board?.id) return

    setLoading(true)
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('board_id', state.board.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setRules(data)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setTriggerType('task_created')
    setTriggerConfig({})
    setActionType('move_to_column')
    setActionConfig({})
    setIsActive(true)
    setEditingRule(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (rule: AutomationRule) => {
    setEditingRule(rule)
    setName(rule.name)
    setDescription(rule.description || '')
    setTriggerType(rule.trigger_type)
    setTriggerConfig(rule.trigger_config || {})
    setActionType(rule.action_type)
    setActionConfig(rule.action_config || {})
    setIsActive(rule.is_active)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!state.board?.id || !user?.id || !name.trim()) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    const ruleData: AutomationRuleInsert = {
      board_id: state.board.id,
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      action_type: actionType,
      action_config: actionConfig,
      created_by: user.id
    }

    try {
      if (editingRule) {
        const { error } = await supabase
          .from('automation_rules')
          .update({
            name: ruleData.name,
            description: ruleData.description,
            is_active: ruleData.is_active,
            trigger_type: ruleData.trigger_type,
            trigger_config: ruleData.trigger_config,
            action_type: ruleData.action_type,
            action_config: ruleData.action_config
          })
          .eq('id', editingRule.id)

        if (error) throw error
        showToast('Rule updated!', 'success')
      } else {
        const { error } = await supabase
          .from('automation_rules')
          .insert(ruleData)

        if (error) throw error
        showToast('Rule created!', 'success')
      }

      setShowModal(false)
      resetForm()
      loadRules()
    } catch (error: any) {
      console.error('Save rule error:', error)
      showToast('Failed to save rule', 'error')
    }
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Delete this automation rule?')) return

    try {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', ruleId)

      if (error) throw error
      showToast('Rule deleted', 'info')
      loadRules()
    } catch (error: any) {
      console.error('Delete rule error:', error)
      showToast('Failed to delete rule', 'error')
    }
  }

  const toggleRuleActive = async (rule: AutomationRule) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id)

      if (error) throw error
      showToast(rule.is_active ? 'Rule disabled' : 'Rule enabled', 'info')
      loadRules()
    } catch (error: any) {
      console.error('Toggle rule error:', error)
      showToast('Failed to update rule', 'error')
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading automation rules...</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Automation Rules</h2>
          <p className={styles.subtitle}>Automate repetitive tasks and workflows</p>
        </div>
        <button className={styles.createBtn} onClick={openCreateModal}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <h3>No automation rules yet</h3>
          <p>Create your first rule to automate your workflow</p>
        </div>
      ) : (
        <div className={styles.ruleList}>
          {rules.map(rule => (
            <div key={rule.id} className={`${styles.ruleCard} ${!rule.is_active ? styles.inactive : ''}`}>
              <div className={styles.ruleInfo}>
                <div className={styles.ruleHeader}>
                  <h3 className={styles.ruleName}>{rule.name}</h3>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      onChange={() => toggleRuleActive(rule)}
                    />
                    <span className={styles.toggleSlider}></span>
                  </label>
                </div>
                {rule.description && (
                  <p className={styles.ruleDescription}>{rule.description}</p>
                )}
                <div className={styles.ruleMeta}>
                  <span className={styles.metaItem}>
                    <strong>Trigger:</strong> {TRIGGER_TYPES.find(t => t.value === rule.trigger_type)?.label || rule.trigger_type}
                  </span>
                  <span className={styles.metaItem}>
                    <strong>Action:</strong> {ACTION_TYPES.find(a => a.value === rule.action_type)?.label || rule.action_type}
                  </span>
                </div>
              </div>
              <div className={styles.ruleActions}>
                <button className={styles.editBtn} onClick={() => openEditModal(rule)}>
                  Edit
                </button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(rule.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingRule ? 'Edit Rule' : 'Create Automation Rule'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Rule Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Auto-assign high priority tasks"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What does this rule do?"
                  rows={2}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>When (Trigger)</label>
                  <select value={triggerType} onChange={e => setTriggerType(e.target.value)}>
                    {TRIGGER_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Then (Action)</label>
                  <select value={actionType} onChange={e => setActionType(e.target.value)}>
                    {ACTION_TYPES.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Trigger config based on trigger type */}
              {triggerType === 'task_moved' && (
                <div className={styles.formGroup}>
                  <label>Target Column</label>
                  <select
                    value={triggerConfig.column_id || ''}
                    onChange={e => setTriggerConfig({ ...triggerConfig, column_id: e.target.value })}
                  >
                    <option value="">Select column</option>
                    {state.columns.map(col => (
                      <option key={col.id} value={col.id}>{col.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {triggerType === 'due_date_approaching' && (
                <div className={styles.formGroup}>
                  <label>Days before due date</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={triggerConfig.days || 1}
                    onChange={e => setTriggerConfig({ ...triggerConfig, days: parseInt(e.target.value) })}
                  />
                </div>
              )}

              {/* Action config based on action type */}
              {actionType === 'move_to_column' && (
                <div className={styles.formGroup}>
                  <label>Move to Column</label>
                  <select
                    value={actionConfig.column_id || ''}
                    onChange={e => setActionConfig({ ...actionConfig, column_id: e.target.value })}
                  >
                    <option value="">Select column</option>
                    {state.columns.map(col => (
                      <option key={col.id} value={col.id}>{col.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {actionType === 'set_priority' && (
                <div className={styles.formGroup}>
                  <label>Set Priority</label>
                  <select
                    value={actionConfig.priority || 'medium'}
                    onChange={e => setActionConfig({ ...actionConfig, priority: e.target.value })}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                  />
                  Rule is active
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className={styles.saveBtn} onClick={handleSave}>
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
