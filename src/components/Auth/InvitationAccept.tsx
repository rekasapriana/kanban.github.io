import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../lib/supabase'
import { FiCheck, FiX, FiLoader, FiMail } from 'react-icons/fi'
import styles from './InvitationAccept.module.css'

export default function InvitationAccept() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const token = searchParams.get('token')

  useEffect(() => {
    loadInvitation()
  }, [token])

  const loadInvitation = async () => {
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    try {
      // Get invitation
      const { data: invitationData, error: inviteError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .single()

      if (inviteError || !invitationData) {
        setError('Invitation not found or already accepted')
        setLoading(false)
        return
      }

      // Get project info separately
      let projectData = null
      if (invitationData.project_id) {
        const { data: proj } = await supabase
          .from('projects')
          .select('*')
          .eq('id', invitationData.project_id)
          .single()
        projectData = proj
      }

      setInvitation({ ...invitationData, projects: projectData })
    } catch (err) {
      console.error('Load invitation error:', err)
      setError('Failed to load invitation')
    }

    setLoading(false)
  }

  const handleAccept = async () => {
    if (!user) {
      showToast('Please login first', 'error')
      navigate('/')
      return
    }

    if (!invitation) return

    setProcessing(true)
    console.log('[InvitationAccept] Accepting invitation:', invitation)

    try {
      // 1. Update invitation status
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      if (updateError) {
        console.error('[InvitationAccept] Error updating invitation:', updateError)
        throw updateError
      }
      console.log('[InvitationAccept] Invitation status updated')

      // 2. Create team member (user_id = team owner, auth_user_id = invited user)
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          user_id: invitation.team_owner_id, // Team owner
          name: invitation.name,
          email: invitation.email,
          role: invitation.role,
          auth_user_id: user.id, // Invited user
          status: 'online'
        })

      if (memberError) {
        console.error('[InvitationAccept] Error creating team member:', memberError)
        // Continue even if this fails (might already exist)
      } else {
        console.log('[InvitationAccept] Team member created')
      }

      // 3. Add user to project_members if project_id exists
      if (invitation.project_id) {
        console.log('[InvitationAccept] Adding to project_members:', {
          project_id: invitation.project_id,
          user_id: user.id,
          role: invitation.role
        })

        const { error: projectMemberError } = await supabase
          .from('project_members')
          .insert({
            project_id: invitation.project_id,
            user_id: user.id,
            role: invitation.role,
            invited_by: invitation.team_owner_id
          })

        if (projectMemberError) {
          console.error('[InvitationAccept] Error adding to project_members:', projectMemberError)
          // Continue even if this fails - user might already be a member
        } else {
          console.log('[InvitationAccept] Added to project_members successfully')
        }
      }

      showToast('Invitation accepted! Redirecting to project...', 'success')

      // Store project ID for filtering and redirect
      if (invitation.project_id) {
        localStorage.setItem('selected_project_id', invitation.project_id)
      }

      // Redirect to main app after short delay
      setTimeout(() => {
        navigate('/')
      }, 1500)

    } catch (err: any) {
      console.error('[InvitationAccept] Accept error:', err)
      showToast('Failed to accept invitation: ' + (err.message || 'Unknown error'), 'error')
    }

    setProcessing(false)
  }

  const handleDecline = async () => {
    if (!invitation) return

    setProcessing(true)

    try {
      await supabase
        .from('team_invitations')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitation.id)

      showToast('Invitation declined', 'info')
      navigate('/')
    } catch (err) {
      showToast('Failed to decline invitation', 'error')
    }

    setProcessing(false)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>
            <FiLoader className={styles.spin} />
            <span>Loading invitation...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.error}>
            <FiX />
            <h3>Oops!</h3>
            <p>{error}</p>
            <button onClick={() => navigate('/')} className={styles.backBtn}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.needLogin}>
            <FiMail />
            <h3>Login Required</h3>
            <p>Please login to accept this invitation to join <strong>{invitation?.projects?.name || 'the project'}</strong></p>
            <button onClick={() => navigate('/')} className={styles.loginBtn}>
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.projectIcon} style={{ backgroundColor: invitation?.projects?.color || '#3b82f6' }}>
            {invitation?.projects?.name?.charAt(0) || 'P'}
          </div>
          <h2>You're Invited!</h2>
          <p className={styles.projectName}>
            Join project: <strong>{invitation?.projects?.name || 'Unknown Project'}</strong>
          </p>
        </div>

        <div className={styles.details}>
          <div className={styles.detailItem}>
            <span className={styles.label}>Invited by</span>
            <span className={styles.value}>{invitation?.name || 'Team Owner'}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.label}>Email</span>
            <span className={styles.value}>{invitation?.email}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.label}>Role</span>
            <span className={`${styles.value} ${styles[invitation?.role]}`}>
              {invitation?.role?.charAt(0).toUpperCase() + invitation?.role?.slice(1)}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.acceptBtn}
            onClick={handleAccept}
            disabled={processing}
          >
            <FiCheck /> Accept Invitation
          </button>
          <button
            className={styles.declineBtn}
            onClick={handleDecline}
            disabled={processing}
          >
            <FiX /> Decline
          </button>
        </div>

        {processing && (
          <div className={styles.processing}>
            <FiLoader className={styles.spin} />
            <span>Processing...</span>
          </div>
        )}
      </div>
    </div>
  )
}
