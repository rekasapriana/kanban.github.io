import { useState } from 'react'
import { FiMail, FiCheck, FiX, FiUserPlus } from 'react-icons/fi'
import { usePendingInvitations } from '../../hooks/usePendingInvitations'
import { useToast } from '../../hooks/useToast'
import styles from './InvitationNotifications.module.css'

export default function InvitationNotifications() {
  const { invitations, loading, accept, decline } = usePendingInvitations()
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)

  const handleAccept = async (invitationId: string, teamName: string) => {
    const success = await accept(invitationId)
    if (success) {
      showToast(`You joined ${teamName}'s team!`, 'success')
    } else {
      showToast('Failed to accept invitation', 'error')
    }
  }

  const handleDecline = async (invitationId: string) => {
    const success = await decline(invitationId)
    if (success) {
      showToast('Invitation declined', 'info')
    } else {
      showToast('Failed to decline invitation', 'error')
    }
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Team Invitations"
      >
        <FiMail />
        {invitations.length > 0 && (
          <span className={styles.badge}>{invitations.length}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className={styles.overlay} onClick={() => setIsOpen(false)} />
          <div className={styles.dropdown}>
            <div className={styles.header}>
              <FiUserPlus />
              <span>Team Invitations</span>
            </div>
            <div className={styles.list}>
              {invitations.length === 0 ? (
                <div className={styles.empty}>
                  <FiMail />
                  <p>No pending invitations</p>
                </div>
              ) : (
                invitations.map(invitation => (
                  <div key={invitation.id} className={styles.invitation}>
                    <div className={styles.invitationInfo}>
                      <div className={styles.invitationAvatar}>
                        {invitation.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.invitationDetails}>
                        <strong>{invitation.name}</strong>
                        <span>invited you to join their team as <b>{invitation.role}</b></span>
                      </div>
                    </div>
                    <div className={styles.invitationActions}>
                      <button
                        className={styles.acceptBtn}
                        onClick={() => handleAccept(invitation.id, invitation.name)}
                        disabled={loading}
                      >
                        <FiCheck /> Accept
                      </button>
                      <button
                        className={styles.declineBtn}
                        onClick={() => handleDecline(invitation.id)}
                        disabled={loading}
                      >
                        <FiX /> Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
