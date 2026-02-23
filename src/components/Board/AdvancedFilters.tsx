import { useState, useEffect } from 'react'
import { FiFilter, FiX, FiChevronDown, FiCheck, FiCalendar, FiUser, FiFlag, FiTag, FiFolder, FiSave, FiBookmark, FiTrash2 } from 'react-icons/fi'
import styles from './AdvancedFilters.module.css'

interface FilterValue {
  field: string
  operator: string
  value: string | string[]
}

interface FilterPreset {
  id: string
  name: string
  filters: FilterValue[]
  createdAt: string
}

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterValue[]) => void
  priorities: string[]
  labels: { id: string; name: string; color: string }[]
  projects: { id: string; name: string; color: string }[]
  assignees: { id: string; name: string; avatar_url: string | null }[]
}

const PRESETS_KEY = 'kanban_filter_presets'

export default function AdvancedFilters({
  onFiltersChange,
  priorities,
  labels,
  projects,
  assignees
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<FilterValue[]>([])
  const [tempFilter, setTempFilter] = useState<FilterValue>({
    field: '',
    operator: 'is',
    value: ''
  })
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [presetName, setPresetName] = useState('')
  const [showSavePreset, setShowSavePreset] = useState(false)

  // Load presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRESETS_KEY)
      if (stored) {
        setPresets(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Error loading filter presets:', e)
    }
  }, [])

  // Save presets to localStorage
  const savePresetsToStorage = (newPresets: FilterPreset[]) => {
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(newPresets))
      setPresets(newPresets)
    } catch (e) {
      console.error('Error saving filter presets:', e)
    }
  }

  // Save current filters as preset
  const saveAsPreset = () => {
    if (!presetName.trim() || activeFilters.length === 0) return

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: activeFilters,
      createdAt: new Date().toISOString()
    }

    savePresetsToStorage([...presets, newPreset])
    setPresetName('')
    setShowSavePreset(false)
  }

  // Load a preset
  const loadPreset = (preset: FilterPreset) => {
    setActiveFilters(preset.filters)
    onFiltersChange(preset.filters)
    setIsOpen(false)
  }

  // Delete a preset
  const deletePreset = (presetId: string) => {
    savePresetsToStorage(presets.filter(p => p.id !== presetId))
  }

  const fieldOptions = [
    { value: 'priority', label: 'Priority', icon: <FiFlag /> },
    { value: 'assignee', label: 'Assignee', icon: <FiUser /> },
    { value: 'due_date', label: 'Due Date', icon: <FiCalendar /> },
    { value: 'label', label: 'Label', icon: <FiTag /> },
    { value: 'project', label: 'Project', icon: <FiFolder /> },
  ]

  const operatorOptions: Record<string, { value: string; label: string }[]> = {
    priority: [
      { value: 'is', label: 'is' },
      { value: 'is_not', label: 'is not' },
    ],
    assignee: [
      { value: 'is', label: 'is' },
      { value: 'is_not', label: 'is not' },
      { value: 'is_empty', label: 'is unassigned' },
    ],
    due_date: [
      { value: 'is', label: 'is' },
      { value: 'before', label: 'is before' },
      { value: 'after', label: 'is after' },
      { value: 'is_empty', label: 'has no due date' },
      { value: 'is_overdue', label: 'is overdue' },
      { value: 'is_today', label: 'is today' },
      { value: 'is_this_week', label: 'is this week' },
    ],
    label: [
      { value: 'has', label: 'has' },
      { value: 'does_not_have', label: 'does not have' },
    ],
    project: [
      { value: 'is', label: 'is' },
      { value: 'is_not', label: 'is not' },
      { value: 'is_empty', label: 'has no project' },
    ],
  }

  const getValueOptions = (field: string) => {
    switch (field) {
      case 'priority':
        return priorities.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))
      case 'assignee':
        return assignees.map(a => ({ value: a.id, label: a.name }))
      case 'label':
        return labels.map(l => ({ value: l.id, label: l.name, color: l.color }))
      case 'project':
        return projects.map(p => ({ value: p.id, label: p.name, color: p.color }))
      default:
        return []
    }
  }

  const addFilter = () => {
    if (!tempFilter.field || !tempFilter.value) return

    const newFilters = [...activeFilters, { ...tempFilter }]
    setActiveFilters(newFilters)
    onFiltersChange(newFilters)
    setTempFilter({ field: '', operator: 'is', value: '' })
  }

  const removeFilter = (index: number) => {
    const newFilters = activeFilters.filter((_, i) => i !== index)
    setActiveFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    setActiveFilters([])
    onFiltersChange([])
  }

  const getFilterDisplayText = (filter: FilterValue): string => {
    const field = fieldOptions.find(f => f.value === filter.field)?.label || filter.field
    const operator = operatorOptions[filter.field]?.find(o => o.value === filter.operator)?.label || filter.operator

    let value = filter.value
    if (filter.field === 'assignee') {
      value = assignees.find(a => a.id === filter.value)?.name || filter.value
    } else if (filter.field === 'label') {
      value = labels.find(l => l.id === filter.value)?.name || filter.value
    } else if (filter.field === 'project') {
      value = projects.find(p => p.id === filter.value)?.name || filter.value
    }

    return `${field} ${operator} ${value}`
  }

  const needsValueInput = (field: string, operator: string): boolean => {
    return !['is_empty', 'is_overdue', 'is_today', 'is_this_week'].includes(operator)
  }

  return (
    <div className={styles.advancedFilters}>
      <button
        className={`${styles.filterBtn} ${activeFilters.length > 0 ? styles.active : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <FiFilter />
        <span>Filters</span>
        {activeFilters.length > 0 && (
          <span className={styles.filterCount}>{activeFilters.length}</span>
        )}
      </button>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className={styles.activeFilterChips}>
          {activeFilters.map((filter, index) => (
            <div key={index} className={styles.filterChip}>
              <span>{getFilterDisplayText(filter)}</span>
              <button onClick={() => removeFilter(index)}>
                <FiX />
              </button>
            </div>
          ))}
          <button className={styles.clearAllBtn} onClick={clearAllFilters}>
            Clear all
          </button>
        </div>
      )}

      {/* Filter dropdown */}
      {isOpen && (
        <div className={styles.filterDropdown}>
          <div className={styles.filterRow}>
            {/* Field selector */}
            <div className={styles.filterSelect}>
              <select
                value={tempFilter.field}
                onChange={(e) => setTempFilter({ ...tempFilter, field: e.target.value, operator: 'is', value: '' })}
              >
                <option value="">Select field...</option>
                {fieldOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Operator selector */}
            {tempFilter.field && (
              <div className={styles.filterSelect}>
                <select
                  value={tempFilter.operator}
                  onChange={(e) => setTempFilter({ ...tempFilter, operator: e.target.value })}
                >
                  {operatorOptions[tempFilter.field]?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Value selector */}
            {tempFilter.field && needsValueInput(tempFilter.field, tempFilter.operator) && (
              <div className={styles.filterSelect}>
                <select
                  value={tempFilter.value}
                  onChange={(e) => setTempFilter({ ...tempFilter, value: e.target.value })}
                >
                  <option value="">Select value...</option>
                  {getValueOptions(tempFilter.field).map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Add button */}
            {tempFilter.field && (!needsValueInput(tempFilter.field, tempFilter.operator) || tempFilter.value) && (
              <button className={styles.addFilterBtn} onClick={addFilter}>
                <FiCheck />
              </button>
            )}
          </div>

          {/* Quick filters */}
          <div className={styles.quickFilters}>
            <span className={styles.quickFilterLabel}>Quick filters:</span>
            <button
              className={styles.quickFilterBtn}
              onClick={() => {
                setActiveFilters([{ field: 'due_date', operator: 'is_overdue', value: '' }])
                onFiltersChange([{ field: 'due_date', operator: 'is_overdue', value: '' }])
              }}
            >
              Overdue
            </button>
            <button
              className={styles.quickFilterBtn}
              onClick={() => {
                setActiveFilters([{ field: 'due_date', operator: 'is_today', value: '' }])
                onFiltersChange([{ field: 'due_date', operator: 'is_today', value: '' }])
              }}
            >
              Due today
            </button>
            <button
              className={styles.quickFilterBtn}
              onClick={() => {
                setActiveFilters([{ field: 'assignee', operator: 'is_empty', value: '' }])
                onFiltersChange([{ field: 'assignee', operator: 'is_empty', value: '' }])
              }}
            >
              Unassigned
            </button>
            <button
              className={styles.quickFilterBtn}
              onClick={() => {
                setActiveFilters([{ field: 'priority', operator: 'is', value: 'high' }])
                onFiltersChange([{ field: 'priority', operator: 'is', value: 'high' }])
              }}
            >
              High priority
            </button>
          </div>

          {/* Filter Presets */}
          <div className={styles.presetsSection}>
            <div className={styles.presetsHeader}>
              <FiBookmark />
              <span>Saved Filters</span>
            </div>

            {presets.length > 0 ? (
              <div className={styles.presetsList}>
                {presets.map(preset => (
                  <div key={preset.id} className={styles.presetItem}>
                    <button
                      className={styles.presetBtn}
                      onClick={() => loadPreset(preset)}
                      title={preset.filters.map(f => `${f.field} ${f.operator} ${f.value}`).join(', ')}
                    >
                      {preset.name}
                      <span className={styles.presetCount}>{preset.filters.length}</span>
                    </button>
                    <button
                      className={styles.deletePresetBtn}
                      onClick={() => deletePreset(preset.id)}
                      title="Delete preset"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noPresets}>No saved filters yet</p>
            )}

            {/* Save Preset */}
            {activeFilters.length > 0 && (
              <div className={styles.savePresetSection}>
                {showSavePreset ? (
                  <div className={styles.savePresetForm}>
                    <input
                      type="text"
                      placeholder="Preset name..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveAsPreset()}
                    />
                    <button onClick={saveAsPreset} disabled={!presetName.trim()}>
                      <FiCheck />
                    </button>
                    <button onClick={() => setShowSavePreset(false)}>
                      <FiX />
                    </button>
                  </div>
                ) : (
                  <button
                    className={styles.savePresetBtn}
                    onClick={() => setShowSavePreset(true)}
                  >
                    <FiSave />
                    Save current filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
