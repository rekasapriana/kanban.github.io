import { useState, useEffect, useCallback } from 'react'
import { FiPlus, FiMail, FiShield, FiEdit2, FiTrash2, FiX, FiUsers, FiUserCheck, FiUser, FiSearch, FiCheck, FiAlertCircle, FiClock, FiSend } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import { getTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember, getProfileByEmail, getSentInvitations, createTeamInvitation, cancelTeamInvitation } from '../../lib/api'
import type { TeamMember, TeamInvitation } from '../../types/database'
import styles from './Views.module.css'

export default function TeamView() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'admin' | 'member' | 'viewer' | 'pending'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'member' as 'admin' | 'member' | 'viewer'
  })

  const loadTeamMembers = useCallback(async (userId: string) => {
    console.log('[TeamView] Loading team members for user:', userId)
    setLoading(true)

    // Load team members
    const { data, error } = await getTeamMembers(userId)

    console.log('[TeamView] getTeamMembers result:', { data: data?.length, error })

    // Load pending invitations
    const { data: invitationsData } = await getSentInvitations(userId)
    if (invitationsData) {
      setInvitations(invitationsData.filter(i => i.status === 'pending'))
    }

    if (!error && data) {
      // Tampilkan data dulu (fast initial load)
      setMembers(data)
      setLoading(false)

      // Linking di background hanya untuk member yang belum linked
      // dan belum pernah dicoba linking (cache di localStorage)
      const linkingCache = JSON.parse(localStorage.getItem('team_linking_cache') || '{}')

      const unlinkedMembers = data.filter(m => !m.auth_user_id && !linkingCache[m.id])

      if (unlinkedMembers.length > 0) {
        // Mark as attempted to prevent retry
        unlinkedMembers.forEach(m => {
          linkingCache[m.id] = true
        })
        localStorage.setItem('team_linking_cache', JSON.stringify(linkingCache))

        // Do linking in background (non-blocking)
        Promise.all(
          unlinkedMembers.map(async (member) => {
            const { data: profile } = await getProfileByEmail(member.email)
            if (profile) {
              await updateTeamMember(member.id, { auth_user_id: profile.id })
              return { ...member, auth_user_id: profile.id }
            }
            return member
          })
        ).then(linkedMembers => {
          // Update state dengan hasil linking
          setMembers(prev => prev.map(m => {
            const linked = linkedMembers.find(l => l.id === m.id && l.auth_user_id)
            return linked || m
          }))
        })
      }
    } else {
      setLoading(false)
    }
  }, [])

  // Load data saat component mount
  useEffect(() => {
    console.log('[TeamView] useEffect - user:', !!user, 'userId:', user?.id)

    if (user?.id) {
      loadTeamMembers(user.id)
    } else {
      setLoading(false)
    }
  }, [user?.id, loadTeamMembers])

  const openCreateModal = () => {
    setEditingMember(null)
    setFormData({ name: '', email: '', role: 'member' })
    setShowModal(true)
  }

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member)
    setFormData({
      name: member.name,
      email: member.email,
      role: member.role
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formData.name.trim() || !formData.email.trim()) return

    if (editingMember) {
      // Update existing member
      const { data, error } = await updateTeamMember(editingMember.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role
      })
      if (!error && data) {
        setMembers(members.map(m => m.id === data.id ? data : m))
        showToast('Member updated!', 'success')
      }
    } else {
      // Create invitation (not directly adding member)
      const { data, error } = await createTeamInvitation({
        team_owner_id: user.id,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role
      })

      if (!error && data) {
        setInvitations([...invitations, data])
        showToast('Invitation sent! Waiting for acceptance.', 'success')
      } else if (error) {
        showToast(error.message || 'Failed to send invitation', 'error')
      }
    }
    setShowModal(false)
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Cancel this invitation?')) return

    const { error } = await cancelTeamInvitation(invitationId)
    if (!error) {
      setInvitations(invitations.filter(i => i.id !== invitationId))
      showToast('Invitation cancelled', 'info')
    }
  }

  const handleDelete = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return
    const { error } = await deleteTeamMember(memberId)
    if (!error) {
      setMembers(members.filter(m => m.id !== memberId))
      showToast('Member removed!', 'success')
    }
  }

  const filteredMembers = members.filter(m => {
    const matchesFilter = filter === 'all' || m.role === filter
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const filteredInvitations = invitations.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const roleConfig = {
    admin: { label: 'Admin', color: 'red', icon: FiShield },
    member: { label: 'Member', color: 'blue', icon: FiUser },
    viewer: { label: 'Viewer', color: 'gray', icon: FiUserCheck },
  }

  const stats = {
    total: members.length,
    pending: invitations.length,
    online: members.filter(m => m.status === 'online').length,
    admins: members.filter(m => m.role === 'admin').length
  }

  if (loading) {
    return (
      <div className={styles.teamView}>
        <div className={styles.loading}>Loading team members...</div>
      </div>
    )
  }

  // Jika user belum login setelah auth initialized
  if (!user) {
    return (
      <div className={styles.teamView}>
        <div className={styles.emptyTeam}>
          <FiUsers />
          <h3>Please login to view team members</h3>
          <p>You need to be logged in to manage your team</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.teamView}>
      {/* Header */}
      <div className={styles.teamHeader}>
        <div className={styles.teamTitle}>
          <div className={styles.teamIcon}>
            <FiUsers />
          </div>
          <div>
            <h1>Team Members</h1>
            <p>Manage your team and collaborations</p>
          </div>
        </div>
        <button className={styles.inviteBtn} onClick={openCreateModal}>
          <FiPlus /> Invite Member
        </button>
      </div>

      {/* Stats Cards */}
      <div className={styles.teamStatsRow}>
        <div className={styles.teamStatCard}>
          <div className={styles.teamStatIcon}>
            <FiUsers />
          </div>
          <div className={styles.teamStatInfo}>
            <span className={styles.teamStatValue}>{stats.total}</span>
            <span className={styles.teamStatLabel}>Total Members</span>
          </div>
        </div>
        <div className={styles.teamStatCard}>
          <div className={styles.teamStatIcon}>
            <FiClock />
          </div>
          <div className={styles.teamStatInfo}>
            <span className={styles.teamStatValue}>{stats.pending}</span>
            <span className={styles.teamStatLabel}>Pending Invites</span>
          </div>
        </div>
        <div className={styles.teamStatCard}>
          <div className={styles.teamStatIcon}>
            <FiUserCheck />
          </div>
          <div className={styles.teamStatInfo}>
            <span className={styles.teamStatValue}>{stats.online}</span>
            <span className={styles.teamStatLabel}>Online Now</span>
          </div>
        </div>
        <div className={styles.teamStatCard}>
          <div className={styles.teamStatIcon}>
            <FiShield />
          </div>
          <div className={styles.teamStatInfo}>
            <span className={styles.teamStatValue}>{stats.admins}</span>
            <span className={styles.teamStatLabel}>Admins</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className={styles.teamFilters}>
        <div className={styles.teamSearch}>
          <FiSearch />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.teamFilterTabs}>
          <button
            className={`${styles.teamFilterTab} ${filter === 'all' ? styles.active : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({members.length})
          </button>
          <button
            className={`${styles.teamFilterTab} ${filter === 'pending' ? styles.active : ''}`}
            onClick={() => setFilter('pending')}
          >
            <FiClock /> Pending ({invitations.length})
          </button>
          <button
            className={`${styles.teamFilterTab} ${filter === 'admin' ? styles.active : ''}`}
            onClick={() => setFilter('admin')}
          >
            Admins ({members.filter(m => m.role === 'admin').length})
          </button>
          <button
            className={`${styles.teamFilterTab} ${filter === 'member' ? styles.active : ''}`}
            onClick={() => setFilter('member')}
          >
            Members ({members.filter(m => m.role === 'member').length})
          </button>
          <button
            className={`${styles.teamFilterTab} ${filter === 'viewer' ? styles.active : ''}`}
            onClick={() => setFilter('viewer')}
          >
            Viewers ({members.filter(m => m.role === 'viewer').length})
          </button>
        </div>
      </div>

      {/* Pending Invitations */}
      {filter === 'pending' && (
        <div className={styles.invitationsSection}>
          <h3><FiSend /> Pending Invitations</h3>
          {filteredInvitations.length === 0 ? (
            <div className={styles.emptyInvitations}>
              <FiClock />
              <p>No pending invitations</p>
            </div>
          ) : (
            <div className={styles.invitationsGrid}>
              {filteredInvitations.map(invitation => (
                <div key={invitation.id} className={styles.invitationCard}>
                  <div className={styles.invitationAvatar}>
                    <span>{invitation.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className={styles.invitationInfo}>
                    <h4>{invitation.name}</h4>
                    <p><FiMail /> {invitation.email}</p>
                    <span className={`${styles.invitationRole} ${styles[invitation.role]}`}>
                      {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                    </span>
                  </div>
                  <div className={styles.invitationActions}>
                    <span className={styles.pendingBadge}>
                      <FiClock /> Waiting...
                    </span>
                    <button
                      className={styles.cancelBtn}
                      onClick={() => handleCancelInvitation(invitation.id)}
                      title="Cancel invitation"
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members Grid - only show when not viewing pending */}
      {filter !== 'pending' && (
      <div className={styles.membersGrid}>
        {filteredMembers.map(member => {
          const RoleIcon = roleConfig[member.role].icon
          return (
            <div key={member.id} className={styles.memberCard}>
              <div className={styles.memberCardHeader}>
                <div className={styles.memberAvatar}>
                  <span>{member.name.charAt(0).toUpperCase()}</span>
                  <span className={`${styles.memberStatusDot} ${styles[member.status]}`} />
                </div>
                <div className={styles.memberCardActions}>
                  <button onClick={() => openEditModal(member)} title="Edit">
                    <FiEdit2 />
                  </button>
                  <button onClick={() => handleDelete(member.id)} title="Remove">
                    <FiTrash2 />
                  </button>
                </div>
              </div>
              <div className={styles.memberCardBody}>
                <h3>{member.name}</h3>
                <p><FiMail /> {member.email}</p>
              </div>
              <div className={styles.memberCardFooter}>
                <span className={`${styles.memberRole} ${styles[member.role]}`}>
                  <RoleIcon /> {roleConfig[member.role].label}
                </span>
                {member.auth_user_id ? (
                  <span className={styles.linkedStatus}>
                    <FiCheck /> Linked
                  </span>
                ) : (
                  <span className={styles.pendingStatus}>
                    <FiAlertCircle /> Pending Signup
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* Add Member Card */}
        <div className={styles.addMemberCard} onClick={openCreateModal}>
          <div className={styles.addMemberIcon}>
            <FiPlus />
          </div>
          <span>Invite New Member</span>
        </div>
      </div>
      )}

      {/* Empty State */}
      {filteredMembers.length === 0 && filter !== 'pending' && !loading && (
        <div className={styles.emptyTeam}>
          <FiUsers />
          <h3>No team members found</h3>
          <p>Invite members to start collaborating</p>
          <button className={styles.inviteBtn} onClick={openCreateModal}>
            <FiPlus /> Invite Member
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingMember ? 'Edit Member' : 'Invite Member'}</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter member name"
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as typeof formData.role })}
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryBtn} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  {editingMember ? 'Save Changes' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
