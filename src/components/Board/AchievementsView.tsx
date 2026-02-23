import { useState, useEffect, useMemo } from 'react'
import {
  FiAward,
  FiCheckCircle,
  FiTarget,
  FiTrendingUp,
  FiZap,
  FiStar,
  FiCalendar,
  FiLayers,
  FiLock,
  FiUnlock
} from 'react-icons/fi'
import { useBoard } from '../../context/BoardContext'
import styles from './Board.module.css'

interface Achievement {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: 'tasks' | 'streak' | 'productivity' | 'milestone'
  requirement: number
  points: number
  unlocked: boolean
  progress: number
  unlockedAt?: string
}

const ACHIEVEMENTS_KEY = 'kanban_achievements'

export default function AchievementsView() {
  const { state } = useBoard()
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set())

  // Get done column
  const doneColumn = state.columns.find(c => c.title.toLowerCase() === 'done')
  const completedTasks = doneColumn
    ? state.tasks.filter(t => t.column_id === doneColumn.id)
    : []

  // Calculate stats for achievements
  const stats = useMemo(() => {
    // Tasks completed today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const completedToday = completedTasks.filter(t => {
      const updated = new Date(t.updated_at)
      updated.setHours(0, 0, 0, 0)
      return updated.getTime() === today.getTime()
    }).length

    // Tasks completed this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const completedThisWeek = completedTasks.filter(t =>
      new Date(t.updated_at) >= weekAgo
    ).length

    // High priority tasks completed
    const highPriorityCompleted = completedTasks.filter(t => t.priority === 'high').length

    // Total tasks created
    const totalCreated = state.tasks.length

    // On-time completions (completed before due date)
    const onTimeCompletions = completedTasks.filter(t => {
      if (!t.due_date) return false
      return new Date(t.updated_at) <= new Date(t.due_date)
    }).length

    // Tasks with all fields filled
    const detailedTasks = state.tasks.filter(t =>
      t.title && t.description && t.due_date && t.priority
    ).length

    // Unique days with completions
    const completionDays = new Set(
      completedTasks.map(t => new Date(t.updated_at).toDateString())
    ).size

    // Consecutive days (streak)
    let streak = 0
    const sortedDays = Array.from(completionDays).sort((a, b) =>
      new Date(b).getTime() - new Date(a).getTime()
    )
    const currentDate = new Date()
    for (const day of sortedDays) {
      const dayDate = new Date(day)
      const diffDays = Math.floor((currentDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === streak) {
        streak++
      } else {
        break
      }
    }

    return {
      completedTotal: completedTasks.length,
      completedToday,
      completedThisWeek,
      highPriorityCompleted,
      totalCreated,
      onTimeCompletions,
      detailedTasks,
      completionDays,
      streak
    }
  }, [state.tasks, state.columns, completedTasks])

  // Define all achievements
  const achievements: Achievement[] = useMemo(() => [
    // Task Achievements
    {
      id: 'first_task',
      name: 'First Steps',
      description: 'Complete your first task',
      icon: <FiCheckCircle />,
      category: 'tasks',
      requirement: 1,
      points: 10,
      unlocked: stats.completedTotal >= 1,
      progress: Math.min(stats.completedTotal, 1)
    },
    {
      id: 'task_master_10',
      name: 'Getting Started',
      description: 'Complete 10 tasks',
      icon: <FiTarget />,
      category: 'tasks',
      requirement: 10,
      points: 25,
      unlocked: stats.completedTotal >= 10,
      progress: Math.min(stats.completedTotal, 10)
    },
    {
      id: 'task_master_50',
      name: 'Task Master',
      description: 'Complete 50 tasks',
      icon: <FiTarget />,
      category: 'tasks',
      requirement: 50,
      points: 100,
      unlocked: stats.completedTotal >= 50,
      progress: Math.min(stats.completedTotal, 50)
    },
    {
      id: 'task_master_100',
      name: 'Productivity Ninja',
      description: 'Complete 100 tasks',
      icon: <FiZap />,
      category: 'tasks',
      requirement: 100,
      points: 250,
      unlocked: stats.completedTotal >= 100,
      progress: Math.min(stats.completedTotal, 100)
    },
    {
      id: 'task_master_500',
      name: 'Legend',
      description: 'Complete 500 tasks',
      icon: <FiStar />,
      category: 'tasks',
      requirement: 500,
      points: 1000,
      unlocked: stats.completedTotal >= 500,
      progress: Math.min(stats.completedTotal, 500)
    },
    // Streak Achievements
    {
      id: 'streak_3',
      name: 'Consistent',
      description: 'Complete tasks 3 days in a row',
      icon: <FiTrendingUp />,
      category: 'streak',
      requirement: 3,
      points: 30,
      unlocked: stats.streak >= 3,
      progress: Math.min(stats.streak, 3)
    },
    {
      id: 'streak_7',
      name: 'Week Warrior',
      description: 'Complete tasks 7 days in a row',
      icon: <FiCalendar />,
      category: 'streak',
      requirement: 7,
      points: 75,
      unlocked: stats.streak >= 7,
      progress: Math.min(stats.streak, 7)
    },
    {
      id: 'streak_30',
      name: 'Unstoppable',
      description: 'Complete tasks 30 days in a row',
      icon: <FiAward />,
      category: 'streak',
      requirement: 30,
      points: 500,
      unlocked: stats.streak >= 30,
      progress: Math.min(stats.streak, 30)
    },
    // Productivity Achievements
    {
      id: 'daily_5',
      name: 'Daily Achiever',
      description: 'Complete 5 tasks in a single day',
      icon: <FiZap />,
      category: 'productivity',
      requirement: 5,
      points: 50,
      unlocked: stats.completedToday >= 5,
      progress: Math.min(stats.completedToday, 5)
    },
    {
      id: 'daily_10',
      name: 'Speed Demon',
      description: 'Complete 10 tasks in a single day',
      icon: <FiZap />,
      category: 'productivity',
      requirement: 10,
      points: 100,
      unlocked: stats.completedToday >= 10,
      progress: Math.min(stats.completedToday, 10)
    },
    {
      id: 'high_priority_5',
      name: 'Crisis Handler',
      description: 'Complete 5 high priority tasks',
      icon: <FiStar />,
      category: 'productivity',
      requirement: 5,
      points: 75,
      unlocked: stats.highPriorityCompleted >= 5,
      progress: Math.min(stats.highPriorityCompleted, 5)
    },
    {
      id: 'on_time_10',
      name: 'Time Manager',
      description: 'Complete 10 tasks before due date',
      icon: <FiCheckCircle />,
      category: 'productivity',
      requirement: 10,
      points: 100,
      unlocked: stats.onTimeCompletions >= 10,
      progress: Math.min(stats.onTimeCompletions, 10)
    },
    // Milestone Achievements
    {
      id: 'creator_10',
      name: 'Creator',
      description: 'Create 10 tasks',
      icon: <FiLayers />,
      category: 'milestone',
      requirement: 10,
      points: 20,
      unlocked: stats.totalCreated >= 10,
      progress: Math.min(stats.totalCreated, 10)
    },
    {
      id: 'creator_50',
      name: 'Architect',
      description: 'Create 50 tasks',
      icon: <FiLayers />,
      category: 'milestone',
      requirement: 50,
      points: 75,
      unlocked: stats.totalCreated >= 50,
      progress: Math.min(stats.totalCreated, 50)
    },
    {
      id: 'detailed_5',
      name: 'Detail Oriented',
      description: 'Create 5 tasks with all fields filled',
      icon: <FiAward />,
      category: 'milestone',
      requirement: 5,
      points: 50,
      unlocked: stats.detailedTasks >= 5,
      progress: Math.min(stats.detailedTasks, 5)
    }
  ], [stats])

  // Load unlocked achievements from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACHIEVEMENTS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setUnlockedAchievements(new Set(parsed.unlocked || []))
      }
    } catch (e) {
      console.error('Error loading achievements:', e)
    }
  }, [])

  // Save unlocked achievements
  useEffect(() => {
    const currentlyUnlocked = achievements
      .filter(a => a.unlocked)
      .map(a => a.id)

    const newUnlocks = currentlyUnlocked.filter(id => !unlockedAchievements.has(id))

    if (newUnlocks.length > 0) {
      const allUnlocked = new Set([...unlockedAchievements, ...newUnlocks])
      setUnlockedAchievements(allUnlocked)
      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify({
        unlocked: Array.from(allUnlocked),
        lastUpdated: new Date().toISOString()
      }))
    }
  }, [achievements, unlockedAchievements])

  // Calculate total points
  const totalPoints = achievements
    .filter(a => unlockedAchievements.has(a.id))
    .reduce((sum, a) => sum + a.points, 0)

  // Group by category
  const groupedAchievements = {
    tasks: achievements.filter(a => a.category === 'tasks'),
    streak: achievements.filter(a => a.category === 'streak'),
    productivity: achievements.filter(a => a.category === 'productivity'),
    milestone: achievements.filter(a => a.category === 'milestone')
  }

  const categoryLabels = {
    tasks: { name: 'Tasks', icon: <FiCheckCircle /> },
    streak: { name: 'Streak', icon: <FiTrendingUp /> },
    productivity: { name: 'Productivity', icon: <FiZap /> },
    milestone: { name: 'Milestones', icon: <FiAward /> }
  }

  return (
    <div className={styles.achievementsView}>
      <div className={styles.achievementsHeader}>
        <h2><FiAward /> Achievements</h2>
        <div className={styles.pointsDisplay}>
          <FiStar className={styles.pointsIcon} />
          <span className={styles.pointsValue}>{totalPoints}</span>
          <span className={styles.pointsLabel}>points</span>
        </div>
      </div>

      {/* Stats Summary */}
      <div className={styles.achievementsStats}>
        <div className={styles.achievementStat}>
          <span className={styles.achievementStatValue}>{unlockedAchievements.size}</span>
          <span className={styles.achievementStatLabel}>Unlocked</span>
        </div>
        <div className={styles.achievementStat}>
          <span className={styles.achievementStatValue}>{achievements.length}</span>
          <span className={styles.achievementStatLabel}>Total</span>
        </div>
        <div className={styles.achievementStat}>
          <span className={styles.achievementStatValue}>{stats.streak}</span>
          <span className={styles.achievementStatLabel}>Day Streak</span>
        </div>
        <div className={styles.achievementStat}>
          <span className={styles.achievementStatValue}>{stats.completedToday}</span>
          <span className={styles.achievementStatLabel}>Today</span>
        </div>
      </div>

      {/* Achievements by Category */}
      <div className={styles.achievementsCategories}>
        {Object.entries(groupedAchievements).map(([category, items]) => (
          <div key={category} className={styles.achievementCategory}>
            <div className={styles.categoryHeader}>
              {categoryLabels[category as keyof typeof categoryLabels].icon}
              <h3>{categoryLabels[category as keyof typeof categoryLabels].name}</h3>
              <span className={styles.categoryCount}>
                {items.filter(a => unlockedAchievements.has(a.id)).length}/{items.length}
              </span>
            </div>

            <div className={styles.achievementsGrid}>
              {items.map(achievement => {
                const isUnlocked = unlockedAchievements.has(achievement.id)
                const progressPercent = (achievement.progress / achievement.requirement) * 100

                return (
                  <div
                    key={achievement.id}
                    className={`${styles.achievementCard} ${isUnlocked ? styles.unlocked : ''}`}
                  >
                    <div className={styles.achievementIcon}>
                      {isUnlocked ? achievement.icon : <FiLock />}
                    </div>
                    <div className={styles.achievementInfo}>
                      <h4>{isUnlocked ? achievement.name : '???'}</h4>
                      <p>{isUnlocked ? achievement.description : 'Keep working to unlock!'}</p>
                      {!isUnlocked && (
                        <div className={styles.achievementProgress}>
                          <div className={styles.progressBar}>
                            <div
                              className={styles.progressFill}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span>{achievement.progress}/{achievement.requirement}</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.achievementPoints}>
                      <FiStar />
                      <span>{achievement.points}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
