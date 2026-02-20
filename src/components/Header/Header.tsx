import { FiColumns, FiPlus, FiMenu } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import styles from './Header.module.css'

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { openModal } = useBoard()

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button
          className={styles.menuBtn}
          onClick={onMenuClick}
          title="Open menu"
        >
          <FiMenu />
        </button>
        <h1>
          <FiColumns />
          <span className={styles.logoText}>Kanban Pro</span>
        </h1>
      </div>

      <div className={styles.headerCenter}>
        {/* Search box only on larger screens */}
      </div>

      <div className={styles.headerRight}>
        <button
          className={styles.addBtn}
          onClick={() => openModal()}
          title="Add new task (N)"
        >
          <FiPlus />
          <span className={styles.addBtnText}>New Task</span>
        </button>
      </div>
    </header>
  )
}
