import { useState } from 'react'
import { FiColumns, FiCheckSquare, FiTrendingUp, FiZap, FiUsers, FiLock, FiMoon, FiSun } from 'react-icons/fi'
import { useTheme } from '../../context/ThemeContext'
import AuthContainer from '../Auth/AuthContainer'
import styles from './Home.module.css'

export default function Home() {
  const { theme, toggleTheme } = useTheme()
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  const openLogin = () => {
    setAuthMode('login')
    setShowAuth(true)
  }

  const openRegister = () => {
    setAuthMode('register')
    setShowAuth(true)
  }

  return (
    <div className={styles.home}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <FiColumns className={styles.navIcon} />
          <span>Kanban Pro</span>
        </div>
        <div className={styles.navActions}>
          <button className={styles.themeToggle} onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>
          <button className={styles.navLink} onClick={openLogin}>
            Masuk
          </button>
          <button className={styles.navButton} onClick={openRegister}>
            Daftar Gratis
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <FiZap /> Kelola tugas dengan lebih efisien
          </div>
          <h1 className={styles.heroTitle}>
            Atur Proyek Anda dengan <span className={styles.highlight}>Kanban Pro</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Platform manajemen tugas visual yang membantu tim Anda bekerja lebih produktif.
            Drag & drop, kolaborasi real-time, dan analitik lengkap.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.primaryButton} onClick={openRegister}>
              Mulai Gratis
              <span className={styles.buttonArrow}>→</span>
            </button>
            <button className={styles.secondaryButton} onClick={openLogin}>
              Sudah punya akun? Masuk
            </button>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>10K+</span>
              <span className={styles.statLabel}>Pengguna Aktif</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>50K+</span>
              <span className={styles.statLabel}>Tugas Diselesaikan</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>99.9%</span>
              <span className={styles.statLabel}>Uptime</span>
            </div>
          </div>
        </div>
        <div className={styles.heroImage}>
          <div className={styles.boardPreview}>
            <div className={styles.previewColumn}>
              <div className={styles.previewHeader}>To Do</div>
              <div className={styles.previewCard}></div>
              <div className={styles.previewCard}></div>
              <div className={styles.previewCard}></div>
            </div>
            <div className={styles.previewColumn}>
              <div className={styles.previewHeader}>In Progress</div>
              <div className={styles.previewCard}></div>
              <div className={styles.previewCard}></div>
            </div>
            <div className={styles.previewColumn}>
              <div className={styles.previewHeader}>Done</div>
              <div className={styles.previewCard}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Fitur Unggulan</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <FiCheckSquare />
            </div>
            <h3>Drag & Drop</h3>
            <p>Pindahkan tugas antar kolom dengan mudah menggunakan drag & drop yang intuitif.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <FiTrendingUp />
            </div>
            <h3>Analitik Lengkap</h3>
            <p>Pantau produktivitas tim dengan dashboard statistik yang komprehensif.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <FiZap />
            </div>
            <h3>Keyboard Shortcuts</h3>
            <p>Bekerja lebih cepat dengan shortcut keyboard yang efisien.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <FiUsers />
            </div>
            <h3>Kolaborasi Tim</h3>
            <p>Bekerja bersama tim secara real-time dengan sinkronisasi instan.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <FiLock />
            </div>
            <h3>Aman & Privat</h3>
            <p>Data Anda terenkripsi dan disimpan dengan aman di cloud.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <FiColumns />
            </div>
            <h3>Multi-Board</h3>
            <p>Buat board berbeda untuk berbagai proyek atau tim.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <h2>Siap untuk lebih produktif?</h2>
        <p>Bergabunglah dengan ribuan tim yang sudah menggunakan Kanban Pro.</p>
        <button className={styles.ctaButton} onClick={openRegister}>
          Daftar Sekarang - Gratis!
        </button>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <FiColumns />
            <span>Kanban Pro</span>
          </div>
          <p>&copy; 2026 Kanban Pro. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuth && (
        <div className={styles.modalOverlay} onClick={() => setShowAuth(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowAuth(false)}>
              ×
            </button>
            <AuthContainer initialTab={authMode} />
          </div>
        </div>
      )}
    </div>
  )
}
