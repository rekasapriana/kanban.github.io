import { useState, useEffect } from 'react'
import { FiThumbsUp, FiAward, FiTrendingUp, FiCheckCircle } from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import styles from './Board.module.css'

interface Vote {
  taskId: string
  votes: string[]
}

const VOTES_KEY = 'kanban_task_votes'

export default function TaskVoting({ onTaskClick }: { onTaskClick: (taskId: string) => void }) {
  const { state } = useBoard()
  const [votes, setVotes] = useState<Record<string, string[]>>({})
  const [sortBy, setSortBy] = useState<'votes' | 'recent'>('votes')

  // Load votes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(VOTES_KEY)
      if (stored) {
        setVotes(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Error loading votes:', e)
    }
  }, [])

  // Save votes to localStorage
  const saveVotes = (newVotes: Record<string, string[]>) => {
    localStorage.setItem(VOTES_KEY, JSON.stringify(newVotes))
    setVotes(newVotes)
  }

  // Toggle vote on a task
  const toggleVote = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const userId = state.selectedTaskId || 'anonymous' // Use a real user ID in production
    const currentVotes = votes[taskId] || []

    if (currentVotes.includes(userId)) {
      // Remove vote
      saveVotes({
        ...votes,
        [taskId]: currentVotes.filter(id => id !== userId)
      })
    } else {
      // Add vote
      saveVotes({
        ...votes,
        [taskId]: [...currentVotes, userId]
      })
    }
  }

  // Get tasks with vote counts
  const getTasksWithVotes = () => {
    const doneColumn = state.columns.find(c => c.title.toLowerCase() === 'done')

    return state.tasks
      .filter(task => !task.is_archived && (!doneColumn || task.column_id !== doneColumn.id))
      .map(task => ({
        ...task,
        voteCount: votes[task.id]?.length || 0,
        hasVoted: votes[task.id]?.includes(state.selectedTaskId || 'anonymous') || false
      }))
      .sort((a, b) => {
        if (sortBy === 'votes') {
          return b.voteCount - a.voteCount
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }

  const tasksWithVotes = getTasksWithVotes()

  // Stats
  const totalVotes = Object.values(votes).flat().length
  const mostVoted = tasksWithVotes[0]
  const totalTasks = tasksWithVotes.length

  return (
    <div className={styles.votingView}>
      <div className={styles.votingHeader}>
        <h2><FiThumbsUp /> Task Voting</h2>
        <div className={styles.votingSort}>
          <button
            className={sortBy === 'votes' ? styles.active : ''}
            onClick={() => setSortBy('votes')}
          >
            Most Voted
          </button>
          <button
            className={sortBy === 'recent' ? styles.active : ''}
            onClick={() => setSortBy('recent')}
          >
            Recent
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.votingStats}>
        <div className={styles.votingStat}>
          <FiThumbsUp />
          <span className={styles.votingStatValue}>{totalVotes}</span>
          <span className={styles.votingStatLabel}>Total Votes</span>
        </div>
        <div className={styles.votingStat}>
          <FiAward />
          <span className={styles.votingStatValue}>{mostVoted?.voteCount || 0}</span>
          <span className={styles.votingStatLabel}>Highest Votes</span>
        </div>
        <div className={styles.votingStat}>
          <FiTrendingUp />
          <span className={styles.votingStatValue}>{totalTasks}</span>
          <span className={styles.votingStatLabel}>Active Tasks</span>
        </div>
      </div>

      {/* Task List */}
      <div className={styles.votingList}>
        {tasksWithVotes.length === 0 ? (
          <div className={styles.votingEmpty}>
            <FiThumbsUp />
            <p>No tasks to vote on</p>
          </div>
        ) : (
          tasksWithVotes.map((task, index) => (
            <div
              key={task.id}
              className={`${styles.votingTask} ${task.hasVoted ? styles.voted : ''}`}
              onClick={() => onTaskClick(task.id)}
            >
              <div className={styles.votingRank}>
                {index < 3 ? (
                  <span className={`${styles.rankBadge} ${styles[`rank${index + 1}`]}`}>
                    {index + 1}
                  </span>
                ) : (
                  <span className={styles.rankNumber}>{index + 1}</span>
                )}
              </div>

              <div className={styles.votingTaskInfo}>
                <h4>{task.title}</h4>
                <div className={styles.votingTaskMeta}>
                  <span className={`${styles.priorityTag} ${styles[task.priority]}`}>
                    {task.priority}
                  </span>
                  <span className={styles.columnTag}>
                    {state.columns.find(c => c.id === task.column_id)?.title}
                  </span>
                </div>
              </div>

              <button
                className={styles.voteBtn}
                onClick={(e) => toggleVote(task.id, e)}
                title={task.hasVoted ? 'Remove vote' : 'Vote for this task'}
              >
                <FiThumbsUp className={task.hasVoted ? styles.votedIcon : ''} />
                <span>{task.voteCount}</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className={styles.votingInfo}>
        <FiCheckCircle />
        <span>Click the thumbs up to vote for tasks you want prioritized</span>
      </div>
    </div>
  )
}
