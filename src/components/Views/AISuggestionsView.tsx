import { useState } from 'react'
import {
  FiZap,
  FiTag,
  FiFlag,
  FiFolder,
  FiCheck,
  FiRefreshCw,
  FiSettings,
  FiInfo
} from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import { useToast } from '../../hooks/useToast'
import styles from './Views.module.css'

interface Suggestion {
  id: string
  type: 'priority' | 'label' | 'column' | 'assignee'
  taskId: string
  taskTitle: string
  suggestion: string
  confidence: number
  reason: string
}

export default function AISuggestionsView() {
  const { state } = useBoard()
  const { showToast } = useToast()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [autoApply, setAutoApply] = useState(false)

  // Generate AI suggestions (simulated)
  const generateSuggestions = async () => {
    setLoading(true)

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500))

    const newSuggestions: Suggestion[] = []
    const keywords = {
      urgent: ['urgent', 'asap', 'critical', 'emergency', 'hotfix', 'bug'],
      high: ['important', 'deadline', 'priority', 'release', 'production'],
      low: ['later', 'someday', 'nice to have', 'minor', 'cleanup']
    }

    // Analyze tasks for suggestions
    state.tasks.filter(t => !t.is_archived).forEach(task => {
      const titleLower = task.title.toLowerCase()
      const descLower = (task.description || '').toLowerCase()

      // Priority suggestions
      if (task.priority === 'medium') {
        if (keywords.urgent.some(k => titleLower.includes(k) || descLower.includes(k))) {
          newSuggestions.push({
            id: `priority-${task.id}`,
            type: 'priority',
            taskId: task.id,
            taskTitle: task.title,
            suggestion: 'high',
            confidence: 85,
            reason: 'Contains urgent keywords: urgent, critical, asap'
          })
        }
        if (keywords.low.some(k => titleLower.includes(k) || descLower.includes(k))) {
          newSuggestions.push({
            id: `priority-${task.id}`,
            type: 'priority',
            taskId: task.id,
            taskTitle: task.title,
            suggestion: 'low',
            confidence: 75,
            reason: 'Contains low-priority indicators'
          })
        }
      }

      // Label suggestions
      const labelKeywords: Record<string, string[]> = {
        'bug': ['bug', 'error', 'crash', 'fix', 'issue'],
        'feature': ['feature', 'add', 'new', 'implement'],
        'documentation': ['docs', 'document', 'readme', 'guide'],
        'testing': ['test', 'spec', 'coverage'],
        'design': ['design', 'ui', 'ux', 'style', 'css'],
        'backend': ['api', 'server', 'database', 'backend'],
        'frontend': ['frontend', 'react', 'vue', 'component']
      }

      Object.entries(labelKeywords).forEach(([label, words]) => {
        if (words.some(w => titleLower.includes(w) || descLower.includes(w))) {
          const hasLabel = task.tags?.some(t => t.name.toLowerCase() === label)
          if (!hasLabel) {
            newSuggestions.push({
              id: `label-${task.id}-${label}`,
              type: 'label',
              taskId: task.id,
              taskTitle: task.title,
              suggestion: label,
              confidence: 70,
              reason: `Task mentions "${label}" related keywords`
            })
          }
        }
      })

      // Column suggestions (for tasks in "To Do" for too long)
      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceCreated > 7 && task.column_id === state.columns[0]?.id) {
        newSuggestions.push({
          id: `column-${task.id}`,
          type: 'column',
          taskId: task.id,
          taskTitle: task.title,
          suggestion: 'archive',
          confidence: 60,
          reason: 'Task has been in "To Do" for over 7 days'
        })
      }
    })

    setSuggestions(newSuggestions.slice(0, 20)) // Limit to 20 suggestions
    setLoading(false)
    showToast(`Found ${newSuggestions.length} suggestions`, 'success')
  }

  const applySuggestion = (suggestion: Suggestion) => {
    // In real app, this would update the task
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
    showToast(`Applied: ${suggestion.suggestion}`, 'success')
  }

  const dismissSuggestion = (suggestion: Suggestion) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
  }

  const applyAll = () => {
    setSuggestions([])
    showToast('All suggestions applied', 'success')
  }

  const getSuggestionIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'priority': return <FiFlag />
      case 'label': return <FiTag />
      case 'column': return <FiFolder />
      case 'assignee': return <FiFolder />
    }
  }

  const getSuggestionColor = (type: Suggestion['type']) => {
    switch (type) {
      case 'priority': return '#ef4444'
      case 'label': return '#8b5cf6'
      case 'column': return '#06b6d4'
      case 'assignee': return '#22c55e'
    }
  }

  return (
    <div className={styles.viewContainer}>
      <div className={styles.viewHeader}>
        <div>
          <h1><FiZap /> AI Suggestions</h1>
          <p>Smart recommendations to optimize your workflow</p>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.autoApplyLabel}>
            <input
              type="checkbox"
              checked={autoApply}
              onChange={(e) => setAutoApply(e.target.checked)}
            />
            Auto-apply suggestions
          </label>
          <button
            className={styles.primaryBtn}
            onClick={generateSuggestions}
            disabled={loading}
          >
            {loading ? (
              <><FiRefreshCw className={styles.spinning} /> Analyzing...</>
            ) : (
              <><FiZap /> Generate Suggestions</>
            )}
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className={styles.infoBanner}>
        <FiInfo />
        <div>
          <strong>AI-Powered Analysis</strong>
          <p>Analyze your tasks for priority, labels, and organization improvements based on content and patterns.</p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.purple}`}>
          <div className={styles.statIcon}><FiZap /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{suggestions.length}</span>
            <span className={styles.statLabel}>Suggestions</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.blue}`}>
          <div className={styles.statIcon}><FiFlag /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{suggestions.filter(s => s.type === 'priority').length}</span>
            <span className={styles.statLabel}>Priority</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.green}`}>
          <div className={styles.statIcon}><FiTag /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{suggestions.filter(s => s.type === 'label').length}</span>
            <span className={styles.statLabel}>Labels</span>
          </div>
        </div>
      </div>

      {/* Suggestions List */}
      <div className={styles.section}>
        {suggestions.length > 0 && (
          <div className={styles.suggestionActions}>
            <span>{suggestions.length} suggestions available</span>
            <button className={styles.applyAllBtn} onClick={applyAll}>
              Apply All
            </button>
          </div>
        )}

        <div className={styles.suggestionsList}>
          {suggestions.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><FiZap /></div>
              <h3>No suggestions yet</h3>
              <p>Click "Generate Suggestions" to analyze your tasks</p>
            </div>
          ) : (
            suggestions.map(suggestion => (
              <div key={suggestion.id} className={styles.suggestionCard}>
                <div
                  className={styles.suggestionIcon}
                  style={{ backgroundColor: `${getSuggestionColor(suggestion.type)}20`, color: getSuggestionColor(suggestion.type) }}
                >
                  {getSuggestionIcon(suggestion.type)}
                </div>

                <div className={styles.suggestionContent}>
                  <div className={styles.suggestionHeader}>
                    <h4>{suggestion.taskTitle}</h4>
                    <span className={styles.confidenceBadge}>
                      {suggestion.confidence}% confidence
                    </span>
                  </div>
                  <div className={styles.suggestionDetail}>
                    <span
                      className={styles.suggestionTag}
                      style={{ backgroundColor: getSuggestionColor(suggestion.type) }}
                    >
                      {suggestion.suggestion}
                    </span>
                    <span className={styles.suggestionReason}>{suggestion.reason}</span>
                  </div>
                </div>

                <div className={styles.suggestionActions}>
                  <button
                    className={styles.applyBtn}
                    onClick={() => applySuggestion(suggestion)}
                    title="Apply suggestion"
                  >
                    <FiCheck />
                  </button>
                  <button
                    className={styles.dismissBtn}
                    onClick={() => dismissSuggestion(suggestion)}
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
