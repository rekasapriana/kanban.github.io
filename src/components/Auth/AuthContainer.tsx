import { useState, useEffect } from 'react'
import { FiColumns } from 'react-icons/fi'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import styles from './AuthContainer.module.css'

interface AuthContainerProps {
  initialTab?: 'login' | 'register'
  isInModal?: boolean
}

export default function AuthContainer({ initialTab = 'login', isInModal = true }: AuthContainerProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  return (
    <div className={isInModal ? styles.authContainerModal : styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h1>
            <FiColumns />
            Kanban Pro
          </h1>
          <p>Sign in to manage your tasks</p>
        </div>

        <div className={styles.authTabs}>
          <button
            className={`${styles.authTab} ${activeTab === 'login' ? styles.active : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button
            className={`${styles.authTab} ${activeTab === 'register' ? styles.active : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register
          </button>
        </div>

        {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  )
}
