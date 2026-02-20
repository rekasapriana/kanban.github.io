import { useState, useEffect } from 'react'
import { FiPlus, FiStar, FiClock, FiEdit2, FiTrash2, FiX, FiFolder, FiGrid, FiList } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { getProjectsWithTaskCount, createProject, updateProject, deleteProject } from '../../lib/api'
import type { Project } from '../../types/database'
import styles from './Views.module.css'

interface ProjectWithCount extends Project {
  task_count: number
}

export default function ProjectsView() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<ProjectWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#5048e5'
  })

  const colors = [
    '#5048e5', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ]

  useEffect(() => {
    loadProjects()
  }, [user])

  const loadProjects = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await getProjectsWithTaskCount(user.id)
    if (data) {
      setProjects(data)
    }
    setLoading(false)
  }

  const toggleStar = async (id: string, currentStarred: boolean) => {
    console.log('[ProjectsView] Toggling star for project:', id, 'current:', currentStarred)
    const { data, error } = await updateProject(id, { is_starred: !currentStarred })
    console.log('[ProjectsView] Update result - data:', data, 'error:', error)

    if (error) {
      console.error('[ProjectsView] Failed to update project star:', error)
      alert('Failed to update project: ' + error.message)
    } else {
      setProjects(projects.map(p =>
        p.id === id ? { ...p, is_starred: !currentStarred } : p
      ))
    }
  }

  const openCreateModal = () => {
    setEditingProject(null)
    setFormData({ name: '', description: '', color: '#5048e5' })
    setShowModal(true)
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formData.name.trim()) return

    if (editingProject) {
      const { data, error } = await updateProject(editingProject.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        color: formData.color
      })
      if (!error && data) {
        setProjects(projects.map(p => p.id === data.id ? data : p))
      }
    } else {
      const { data, error } = await createProject({
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        color: formData.color,
        is_starred: false
      })
      if (!error && data) {
        setProjects([data, ...projects])
      }
    }
    setShowModal(false)
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    const { error } = await deleteProject(projectId)
    if (!error) {
      setProjects(projects.filter(p => p.id !== projectId))
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const starredProjects = projects.filter(p => p.is_starred)
  console.log('[ProjectsView] Projects:', projects.map(p => ({ id: p.id, name: p.name, is_starred: p.is_starred })))
  console.log('[ProjectsView] Starred projects:', starredProjects.length)

  const stats = {
    total: projects.length,
    starred: starredProjects.length
  }

  if (loading) {
    return (
      <div className={styles.projectsView}>
        <div className={styles.loading}>Loading projects...</div>
      </div>
    )
  }

  return (
    <div className={styles.projectsView}>
      {/* Header */}
      <div className={styles.projectsHeader}>
        <div className={styles.projectsTitle}>
          <div className={styles.projectsIcon}>
            <FiFolder />
          </div>
          <div>
            <h1>Projects</h1>
            <p>Organize your work with projects</p>
          </div>
        </div>
        <div className={styles.projectsActions}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === 'grid' ? styles.active : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <FiGrid />
            </button>
            <button
              className={`${styles.viewToggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
            >
              <FiList />
            </button>
          </div>
          <button className={styles.newProjectBtn} onClick={openCreateModal}>
            <FiPlus /> New Project
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.projectsStats}>
        <div className={styles.projectStatCard}>
          <div className={styles.projectStatIcon}>
            <FiFolder />
          </div>
          <div className={styles.projectStatInfo}>
            <span className={styles.projectStatValue}>{stats.total}</span>
            <span className={styles.projectStatLabel}>Total Projects</span>
          </div>
        </div>
        <div className={styles.projectStatCard}>
          <div className={styles.projectStatIcon}>
            <FiStar />
          </div>
          <div className={styles.projectStatInfo}>
            <span className={styles.projectStatValue}>{stats.starred}</span>
            <span className={styles.projectStatLabel}>Starred</span>
          </div>
        </div>
      </div>

      {/* Starred Projects */}
      {starredProjects.length > 0 && (
        <div className={styles.projectSection}>
          <div className={styles.sectionHeader}>
            <h2><FiStar /> Starred</h2>
          </div>
          <div className={`${styles.projectsGrid} ${viewMode === 'list' ? styles.listView : ''}`}>
            {starredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                viewMode={viewMode}
                onToggleStar={() => toggleStar(project.id, project.is_starred)}
                onEdit={() => openEditModal(project)}
                onDelete={() => handleDelete(project.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Projects */}
      <div className={styles.projectSection}>
        <div className={styles.sectionHeader}>
          <h2><FiFolder /> All Projects</h2>
        </div>
        <div className={`${styles.projectsGrid} ${viewMode === 'list' ? styles.listView : ''}`}>
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              viewMode={viewMode}
              onToggleStar={() => toggleStar(project.id, project.is_starred)}
              onEdit={() => openEditModal(project)}
              onDelete={() => handleDelete(project.id)}
              formatDate={formatDate}
            />
          ))}

          {/* Add New Project */}
          <div className={styles.addProjectCard} onClick={openCreateModal}>
            <div className={styles.addProjectIcon}>
              <FiPlus />
            </div>
            <span>Create New Project</span>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className={styles.emptyProjects}>
          <div className={styles.emptyProjectsIcon}>
            <FiFolder />
          </div>
          <h3>No projects yet</h3>
          <p>Create your first project to start organizing your work</p>
          <button className={styles.newProjectBtn} onClick={openCreateModal}>
            <FiPlus /> New Project
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingProject ? 'Edit Project' : 'New Project'}</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Project Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter project name"
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Color</label>
                <div className={styles.colorPicker}>
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`${styles.colorOption} ${formData.color === color ? styles.selected : ''}`}
                      style={{ background: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Project Card Component
function ProjectCard({
  project,
  viewMode,
  onToggleStar,
  onEdit,
  onDelete,
  formatDate
}: {
  project: ProjectWithCount
  viewMode: 'grid' | 'list'
  onToggleStar: () => void
  onEdit: () => void
  onDelete: () => void
  formatDate: (date: string) => string
}) {
  if (viewMode === 'list') {
    return (
      <div className={styles.projectListItem}>
        <div className={styles.projectListColor} style={{ background: project.color }} />
        <div className={styles.projectListInfo}>
          <h3>{project.name}</h3>
          <p>{project.description || 'No description'}</p>
        </div>
        <div className={styles.projectListMeta}>
          <span><FiClock /> {formatDate(project.updated_at)}</span>
          <span className={styles.projectTaskBadge}>{project.task_count} task{project.task_count !== 1 ? 's' : ''}</span>
        </div>
        <div className={styles.projectListActions}>
          <button className={styles.starBtn} onClick={onToggleStar}>
            <FiStar className={project.is_starred ? styles.starred : ''} />
          </button>
          <button onClick={onEdit}><FiEdit2 /></button>
          <button onClick={onDelete}><FiTrash2 /></button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.projectCard}>
      <div className={styles.projectCardHeader} style={{ background: project.color }}>
        <button className={styles.projectStarBtn} onClick={onToggleStar}>
          <FiStar className={project.is_starred ? styles.starred : ''} />
        </button>
      </div>
      <div className={styles.projectCardBody}>
        <h3>{project.name}</h3>
        <p>{project.description || 'No description'}</p>
        <div className={styles.projectCardMeta}>
          <span><FiClock /> {formatDate(project.updated_at)}</span>
        </div>
      </div>
      <div className={styles.projectCardFooter}>
        <span className={styles.projectTaskBadge}>{project.task_count} task{project.task_count !== 1 ? 's' : ''}</span>
        <div className={styles.projectCardActions}>
          <button onClick={onEdit}><FiEdit2 /></button>
          <button onClick={onDelete}><FiTrash2 /></button>
        </div>
      </div>
    </div>
  )
}
