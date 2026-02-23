import { useState, useEffect } from 'react'
import { FiImage, FiDroplet, FiCheck, FiRotateCcw } from 'react-icons/fi'
import styles from './Board.module.css'

interface BackgroundSettings {
  type: 'color' | 'gradient' | 'image'
  value: string
}

const PRESET_COLORS = [
  '#4f46e5', '#7c3aed', '#ec4899', '#ef4444',
  '#f59e0b', '#22c55e', '#06b6d4', '#6366f1',
  '#1e293b', '#334155', '#f8fafc', '#f1f5f9'
]

const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
]

const PRESET_IMAGES = [
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920',
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=1920',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920'
]

const BACKGROUND_KEY = 'kanban_board_background'

export default function BoardBackground() {
  const [isOpen, setIsOpen] = useState(false)
  const [background, setBackground] = useState<BackgroundSettings>({
    type: 'color',
    value: '#4f46e5'
  })

  // Load background from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BACKGROUND_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setBackground(parsed)
        applyBackground(parsed)
      }
    } catch (e) {
      console.error('Error loading background:', e)
    }
  }, [])

  // Apply background to document
  const applyBackground = (bg: BackgroundSettings) => {
    const root = document.documentElement
    if (bg.type === 'color') {
      root.style.setProperty('--board-bg', bg.value)
      root.style.setProperty('--board-bg-image', 'none')
    } else if (bg.type === 'gradient') {
      root.style.setProperty('--board-bg', 'transparent')
      root.style.setProperty('--board-bg-image', bg.value)
    } else if (bg.type === 'image') {
      root.style.setProperty('--board-bg', 'transparent')
      root.style.setProperty('--board-bg-image', `url(${bg.value})`)
    }
  }

  // Save background to localStorage
  const saveBackground = (bg: BackgroundSettings) => {
    localStorage.setItem(BACKGROUND_KEY, JSON.stringify(bg))
    setBackground(bg)
    applyBackground(bg)
  }

  const handleReset = () => {
    const defaultBg: BackgroundSettings = { type: 'color', value: '#4f46e5' }
    saveBackground(defaultBg)
  }

  return (
    <div className={styles.backgroundPicker}>
      <button
        className={styles.backgroundBtn}
        onClick={() => setIsOpen(!isOpen)}
        title="Board Background"
      >
        <FiDroplet />
      </button>

      {isOpen && (
        <div className={styles.backgroundDropdown}>
          <div className={styles.backgroundHeader}>
            <span>Board Background</span>
            <button onClick={handleReset} title="Reset to default">
              <FiRotateCcw />
            </button>
          </div>

          {/* Colors */}
          <div className={styles.backgroundSection}>
            <h4><FiDroplet /> Colors</h4>
            <div className={styles.colorGrid}>
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  className={`${styles.colorSwatch} ${background.type === 'color' && background.value === color ? styles.active : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => saveBackground({ type: 'color', value: color })}
                >
                  {background.type === 'color' && background.value === color && <FiCheck />}
                </button>
              ))}
            </div>
          </div>

          {/* Gradients */}
          <div className={styles.backgroundSection}>
            <h4>Gradients</h4>
            <div className={styles.gradientGrid}>
              {PRESET_GRADIENTS.map((gradient, i) => (
                <button
                  key={i}
                  className={`${styles.gradientSwatch} ${background.type === 'gradient' && background.value === gradient ? styles.active : ''}`}
                  style={{ background: gradient }}
                  onClick={() => saveBackground({ type: 'gradient', value: gradient })}
                >
                  {background.type === 'gradient' && background.value === gradient && <FiCheck />}
                </button>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className={styles.backgroundSection}>
            <h4><FiImage /> Images</h4>
            <div className={styles.imageGrid}>
              {PRESET_IMAGES.map((url, i) => (
                <button
                  key={i}
                  className={`${styles.imageSwatch} ${background.type === 'image' && background.value === url ? styles.active : ''}`}
                  style={{ backgroundImage: `url(${url})` }}
                  onClick={() => saveBackground({ type: 'image', value: url })}
                >
                  {background.type === 'image' && background.value === url && (
                    <span className={styles.imageCheck}><FiCheck /></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom URL */}
          <div className={styles.backgroundSection}>
            <h4>Custom Image URL</h4>
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              className={styles.customUrlInput}
              onChange={(e) => {
                if (e.target.value) {
                  saveBackground({ type: 'image', value: e.target.value })
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
