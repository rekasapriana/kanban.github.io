import { useState, useEffect, useRef } from 'react'
import { FiGrid, FiChevronDown, FiPlus, FiSettings, FiUsers, FiCheck } from 'react-icons/fi'
import * as api from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import type { Board } from '../../types/database'
import styles from './BoardSwitcher.module.css'

interface BoardWithRole extends Board {
  membership_role?: 'owner' | 'admin' | 'member' | 'viewer'
}

interface BoardSwitcherProps {
  currentBoardId: string | null
  onBoardChange: (boardId: string) => void
  onCreateBoard?: () => void
}

export default function BoardSwitcher({
  currentBoardId,
  onBoardChange,
  onCreateBoard
}: BoardSwitcherProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [boards, setBoards] = useState<BoardWithRole[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load boards
  useEffect(() => {
    if (user?.id) {
      loadBoards()
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

  const loadBoards = async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await api.getUserBoards(user.id)
    if (data) {
      setBoards(data)
    }
    setLoading(false)
  }

  const handleBoardSelect = (boardId: string) => {
    onBoardChange(boardId)
    setIsOpen(false)
  }

  const handleCreateBoard = async () => {
    if (!user) return

    const name = prompt('Enter board name:')
    if (!name) return

    setLoading(true)
    const { data, error } = await api.createBoardWithMember(user.id, name)
    setLoading(false)

    if (error) {
      showToast('Failed to create board', 'error')
      return
    }

    showToast('Board created', 'success')
    loadBoards()
    if (data) {
      onBoardChange(data.id)
    }
    setIsOpen(false)
  }

  const currentBoard = boards.find(b => b.id === currentBoardId)

  return (
    <div className={styles.boardSwitcher} ref={dropdownRef}>
      <button
        className={styles.switcherBtn}
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <FiGrid className={styles.switcherIcon} />
        <span className={styles.switcherText}>
          {currentBoard?.title || 'Select Board'}
        </span>
        {currentBoard?.membership_role && currentBoard.membership_role !== 'owner' && (
          <span className={styles.roleBadge}>{currentBoard.membership_role}</span>
        )}
        <FiChevronDown className={`${styles.chevron} ${isOpen ? styles.open : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span>Your Boards</span>
          </div>

          <div className={styles.boardList}>
            {boards.length > 0 ? (
              boards.map(board => (
                <div
                  key={board.id}
                  className={`${styles.boardItem} ${board.id === currentBoardId ? styles.active : ''}`}
                  onClick={() => handleBoardSelect(board.id)}
                >
                  <div className={styles.boardIcon}>
                    <FiGrid />
                  </div>
                  <div className={styles.boardInfo}>
                    <span className={styles.boardName}>{board.title}</span>
                    {board.description && (
                      <span className={styles.boardDesc}>{board.description}</span>
                    )}
                  </div>
                  {board.id === currentBoardId && (
                    <FiCheck className={styles.checkIcon} />
                  )}
                  {board.membership_role && board.membership_role !== 'owner' && (
                    <span className={styles.itemRoleBadge}>{board.membership_role}</span>
                  )}
                </div>
              ))
            ) : (
              <div className={styles.noBoards}>
                <FiGrid />
                <p>No boards found</p>
              </div>
            )}
          </div>

          <div className={styles.dropdownFooter}>
            <button className={styles.createBoardBtn} onClick={handleCreateBoard}>
              <FiPlus /> Create New Board
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
