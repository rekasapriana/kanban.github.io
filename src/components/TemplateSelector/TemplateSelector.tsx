import { useState, useEffect, useRef } from 'react'
import { FiFileText, FiPlus, FiChevronDown, FiTrash2 } from 'react-icons/fi'
import * as api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import type { TaskTemplate } from '../../types/database'
import styles from './TemplateSelector.module.css'

interface TemplateSelectorProps {
  onSelectTemplate: (templateId: string) => void
  onCreateFromTemplate: (template: TaskTemplate) => void
}

export default function TemplateSelector({ onSelectTemplate, onCreateFromTemplate }: TemplateSelectorProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load templates
  useEffect(() => {
    if (user?.id) {
      loadTemplates()
    }
  }, [user?.id])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadTemplates = async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await api.getTaskTemplates(user.id)
    if (data) {
      setTemplates(data)
    }
    setLoading(false)
  }

  const handleSelectTemplate = (template: TaskTemplate) => {
    onCreateFromTemplate(template)
    setIsOpen(false)
  }

  const handleDeleteTemplate = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation()
    if (!confirm('Delete this template?')) return

    const { error } = await api.deleteTaskTemplate(templateId)
    if (error) {
      showToast('Failed to delete template', 'error')
      return
    }

    showToast('Template deleted', 'info')
    loadTemplates()
  }

  return (
    <div className={styles.templateSelector} ref={dropdownRef}>
      <button
        className={styles.selectorBtn}
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <FiFileText />
        <span>Templates</span>
        <FiChevronDown className={isOpen ? styles.rotated : ''} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span>Task Templates</span>
          </div>

          {templates.length > 0 ? (
            <div className={styles.templateList}>
              {templates.map(template => (
                <div
                  key={template.id}
                  className={styles.templateItem}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className={styles.templateIcon}>
                    <FiFileText />
                  </div>
                  <div className={styles.templateInfo}>
                    <span className={styles.templateName}>{template.name}</span>
                    {template.description && (
                      <span className={styles.templateDesc}>{template.description}</span>
                    )}
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => handleDeleteTemplate(e, template.id)}
                    title="Delete template"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noTemplates}>
              <FiFileText />
              <p>No templates yet</p>
              <span>Create templates to quickly create tasks with predefined settings</span>
            </div>
          )}

          <div className={styles.dropdownFooter}>
            <button className={styles.createBtn}>
              <FiPlus /> Create Template
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
