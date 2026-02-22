import { useMemo } from 'react'
import { useBoard } from '../../context/BoardContext'
import { useAuth } from '../../context/AuthContext'
import { FiUsers, FiCheckCircle, FiClock, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi'
import styles from './Views.module.css'

interface WorkloadMember {
  id: string
  name: string
  avatar: string | null
  role: string
  tasks: typeof import('../../types/database').Task[]
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  highPriorityTasks: number
  capacity: number // percentage
  status: 'overloaded' | 'atCapacity' | 'underCapacity'
}

export default function WorkloadView() {
  const { state, selectTask, openDetailPanel } = useBoard()
  const { user } = useAuth()

  // Calculate workload per team member
  const workloadData = useMemo(() => {
    const memberMap = new Map<string, WorkloadMember>()

    // Get all unique assignees from tasks
    state.tasks.forEach(task => {
      if (task.task_assignees && task.task_assignees.length > 0) {
        task.task_assignees.forEach(assignee => {
          const profile = assignee.profiles
          if (!profile) return

          if (!memberMap.has(assignee.user_id)) {
            memberMap.set(assignee.user_id, {
              id: assignee.user_id,
              name: profile.full_name || profile.email?.split('@')[0] || 'Unknown',
              avatar: profile.avatar_url,
              role: 'Member',
              tasks: [],
              totalTasks: 0,
              completedTasks: 0,
              inProgressTasks: 0,
              highPriorityTasks: 0,
              capacity: 0,
              status: 'underCapacity'
            })
          }

          const member = memberMap.get(assignee.user_id)!
          member.tasks.push(task)
        })
      }
    })

    // Calculate stats for each member
    memberMap.forEach(member => {
      member.totalTasks = member.tasks.length
      member.completedTasks = member.tasks.filter(t => {
        const column = state.columns.find(c => c.id === t.column_id)
        return column?.title.toLowerCase() === 'done'
      }).length
      member.inProgressTasks = member.tasks.filter(t => {
        const column = state.columns.find(c => c.id === t.column_id)
        return column?.title.toLowerCase() === 'in progress'
      }).length
      member.highPriorityTasks = member.tasks.filter(t => t.priority === 'high').length

      // Calculate capacity (arbitrary scale: 5 tasks = 100%)
      const maxTasks = 5
      member.capacity = Math.min(100, Math.round((member.totalTasks / maxTasks) * 100))

      if (member.capacity > 100) {
        member.status = 'overloaded'
      } else if (member.capacity >= 80) {
        member.status = 'atCapacity'
      } else {
        member.status = 'underCapacity'
      }
    })

    return Array.from(memberMap.values())
  }, [state.tasks, state.columns])

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const total = workloadData.reduce((sum, m) => sum + m.totalTasks, 0)
    const completed = workloadData.reduce((sum, m) => sum + m.completedTasks, 0)
    const overloaded = workloadData.filter(m => m.status === 'overloaded').length
    const underCapacity = workloadData.filter(m => m.status === 'underCapacity').length
    const atCapacity = workloadData.filter(m => m.status === 'atCapacity').length

    return { total, completed, overloaded, underCapacity, atCapacity }
  }, [workloadData])

  const getCapacityColor = (capacity: number) => {
    if (capacity > 100) return '#ef4444'
    if (capacity >= 80) return '#f59e0b'
    return '#10b981'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const handleTaskClick = (taskId: string) => {
    selectTask(taskId)
    openDetailPanel(taskId)
  }

  // If no team members, show empty state
  if (workloadData.length === 0) {
    return (
      <div className={styles.workloadView}>
        <div className={styles.workloadHeader}>
          <div className={styles.workloadTitle}>
            <div className={styles.workloadIcon}>
              <FiUsers />
            </div>
            <div>
              <h1>Workload</h1>
              <p>Track team capacity and task distribution</p>
            </div>
          </div>
        </div>

        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><FiUsers /></div>
          <h3>No team members assigned</h3>
          <p>Assign team members to tasks to see workload distribution</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.workloadView}>
      {/* Header */}
      <div className={styles.workloadHeader}>
        <div className={styles.workloadTitle}>
          <div className={styles.workloadIcon}>
            <FiUsers />
          </div>
          <div>
            <h1>Workload</h1>
            <p>Track team capacity and task distribution</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.ganttStats}>
        <div className={`${styles.statCard} ${styles.blue}`}>
          <div className={styles.statIcon}><FiUsers /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{workloadData.length}</span>
            <span className={styles.statLabel}>Team Members</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.green}`}>
          <div className={styles.statIcon}><FiCheckCircle /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{overallStats.completed}</span>
            <span className={styles.statLabel}>Completed</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.yellow}`}>
          <div className={styles.statIcon}><FiClock /></div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{overallStats.atCapacity}</span>
            <span className={styles.statLabel}>At Capacity</span>
          </div>
        </div>
        {overallStats.overloaded > 0 && (
          <div className={`${styles.statCard} ${styles.red}`}>
            <div className={styles.statIcon}><FiAlertTriangle /></div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{overallStats.overloaded}</span>
              <span className={styles.statLabel}>Overloaded</span>
            </div>
          </div>
        )}
      </div>

      {/* Team Grid */}
      <div className={styles.workloadGrid}>
        {workloadData.map(member => (
          <div
            key={member.id}
            className={`${styles.workloadCard} ${styles[member.status]}`}
          >
            <div className={styles.workloadCardHeader}>
              <div className={styles.workloadAvatar}>
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} />
                ) : (
                  member.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className={styles.workloadMemberInfo}>
                <div className={styles.workloadMemberName}>{member.name}</div>
                <div className={styles.workloadMemberRole}>{member.role}</div>
              </div>
              <span className={`${styles.workloadStatusBadge} ${styles[member.status]}`}>
                {member.status === 'overloaded' ? 'Overloaded' :
                 member.status === 'atCapacity' ? 'At Capacity' : 'Available'}
              </span>
            </div>

            <div className={styles.workloadStats}>
              <div className={styles.workloadStat}>
                <div className={styles.workloadStatValue}>{member.totalTasks}</div>
                <div className={styles.workloadStatLabel}>Total Tasks</div>
              </div>
              <div className={styles.workloadStat}>
                <div className={styles.workloadStatValue}>{member.completedTasks}</div>
                <div className={styles.workloadStatLabel}>Completed</div>
              </div>
              <div className={styles.workloadStat}>
                <div className={styles.workloadStatValue}>{member.inProgressTasks}</div>
                <div className={styles.workloadStatLabel}>In Progress</div>
              </div>
              <div className={styles.workloadStat}>
                <div className={styles.workloadStatValue}>{member.highPriorityTasks}</div>
                <div className={styles.workloadStatLabel}>High Priority</div>
              </div>
            </div>

            <div className={styles.workloadCapacityBar}>
              <div
                className={`${styles.workloadCapacityFill} ${styles[member.status]}`}
                style={{ width: `${Math.min(100, member.capacity)}%` }}
              />
            </div>
            <div className={styles.workloadCapacityLabel}>
              {member.capacity}% capacity
            </div>

            {/* Task list */}
            {member.tasks.length > 0 && (
              <div className={styles.workloadTaskList}>
                <div className={styles.workloadTaskListTitle}>Recent Tasks</div>
                {member.tasks.slice(0, 5).map(task => (
                  <div
                    key={task.id}
                    className={styles.workloadTaskItem}
                    onClick={() => handleTaskClick(task.id)}
                  >
                    <div
                      className={styles.workloadTaskDot}
                      style={{ backgroundColor: getPriorityColor(task.priority) }}
                    />
                    <span className={styles.workloadTaskTitle}>{task.title}</span>
                  </div>
                ))}
                {member.tasks.length > 5 && (
                  <div className={styles.workloadTaskItem}>
                    <span>+{member.tasks.length - 5} more tasks</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className={styles.workloadSummary}>
        <h3>
          <FiTrendingUp style={{ marginRight: '8px', display: 'inline' }} />
          Team Distribution
        </h3>
        <div className={styles.workloadDistribution}>
          <div className={styles.workloadDistributionItem}>
            <span className={styles.workloadDistributionLabel}>Workload Status</span>
            <div className={styles.workloadDistributionBar}>
              {overallStats.overloaded > 0 && (
                <div
                  className={`${styles.workloadDistributionSegment} ${styles.overloaded}`}
                  style={{ width: `${(overallStats.overloaded / workloadData.length) * 100}%` }}
                >
                  {overallStats.overloaded}
                </div>
              )}
              {overallStats.atCapacity > 0 && (
                <div
                  className={`${styles.workloadDistributionSegment} ${styles.atCapacity}`}
                  style={{ width: `${(overallStats.atCapacity / workloadData.length) * 100}%` }}
                >
                  {overallStats.atCapacity}
                </div>
              )}
              {overallStats.underCapacity > 0 && (
                <div
                  className={`${styles.workloadDistributionSegment} ${styles.underCapacity}`}
                  style={{ width: `${(overallStats.underCapacity / workloadData.length) * 100}%` }}
                >
                  {overallStats.underCapacity}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#ef4444' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Overloaded ({overallStats.overloaded})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#f59e0b' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>At Capacity ({overallStats.atCapacity})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#10b981' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Available ({overallStats.underCapacity})</span>
          </div>
        </div>
      </div>
    </div>
  )
}
