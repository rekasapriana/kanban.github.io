import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getPendingInvitations, acceptTeamInvitation, declineTeamInvitation } from '../lib/api'
import type { TeamInvitation } from '../types/database'

interface UsePendingInvitationsResult {
  invitations: TeamInvitation[]
  loading: boolean
  accept: (invitationId: string) => Promise<boolean>
  decline: (invitationId: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export function usePendingInvitations(): UsePendingInvitationsResult {
  const { user } = useAuth()
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(false)

  const loadInvitations = useCallback(async () => {
    if (!user?.email) {
      setInvitations([])
      return
    }

    setLoading(true)
    const { data } = await getPendingInvitations(user.email)
    setInvitations(data || [])
    setLoading(false)
  }, [user?.email])

  useEffect(() => {
    loadInvitations()
  }, [loadInvitations])

  const accept = useCallback(async (invitationId: string): Promise<boolean> => {
    const { error } = await acceptTeamInvitation(invitationId)
    if (!error) {
      setInvitations(prev => prev.filter(i => i.id !== invitationId))
      return true
    }
    return false
  }, [])

  const decline = useCallback(async (invitationId: string): Promise<boolean> => {
    const { error } = await declineTeamInvitation(invitationId)
    if (!error) {
      setInvitations(prev => prev.filter(i => i.id !== invitationId))
      return true
    }
    return false
  }, [])

  return {
    invitations,
    loading,
    accept,
    decline,
    refresh: loadInvitations
  }
}
