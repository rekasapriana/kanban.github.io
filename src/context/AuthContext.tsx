import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import * as api from '../lib/api'
import type { User } from '../lib/supabase'
import type { Profile } from '../types/database'
import { useToast } from '../hooks/useToast'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signInGoogle: () => Promise<void>
  signOutUser: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const { showToast } = useToast()

  // Auto-link team member to auth user on login
  const linkTeamMember = useCallback(async (userId: string, userEmail: string) => {
    try {
      console.log('[Auth] Auto-linking team member for:', userEmail)
      const { error } = await api.linkTeamMemberByAuth(userId, userEmail)
      if (error) {
        console.error('[Auth] Failed to link team member:', error)
      } else {
        console.log('[Auth] Team member linked successfully')
      }
    } catch (err) {
      console.error('[Auth] Link team member error:', err)
    }
  }, [])

  const fetchProfile = useCallback(async (userId: string, userEmail?: string, userName?: string) => {
    try {
      const { data, error } = await api.getProfile(userId)

      if (error) {
        const { data: newProfile, error: createError } = await api.createProfile(
          userId,
          userEmail || '',
          userName
        )

        if (createError) {
          console.error('Failed to create profile:', createError)
        } else {
          setProfile(newProfile)
        }
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    let initialized = false
    console.log('[Auth] Setting up auth listener...')

    const init = () => {
      if (!initialized && mounted) {
        initialized = true
        setLoading(false)
        setInitialized(true)
        console.log('[Auth] Initialized')
      }
    }

    // Listen for auth changes - this handles initial session too
    const { data: { subscription } } = api.onAuthStateChange((event, session) => {
      console.log('[Auth] State change:', event, session ? 'has session' : 'no session')

      if (!mounted) return

      // Handle all relevant auth events
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          setUser(session.user as User)
          // Fetch profile in background - don't await
          fetchProfile(
            session.user.id,
            session.user.email,
            session.user.user_metadata?.full_name
          )
          // Auto-link team member
          if (session.user.email) {
            linkTeamMember(session.user.id, session.user.email)
          }
        }
        init()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        init()
      }
    })

    // Fallback - initialize after 3 seconds if no event fires
    const fallbackTimer = setTimeout(() => {
      console.log('[Auth] Fallback timer triggered')
      init()
    }, 3000)

    return () => {
      mounted = false
      clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const { error } = await api.signInWithEmail(email, password)
    setLoading(false)

    if (error) {
      showToast(error.message, 'error')
      throw error
    }
    showToast('Login successful!', 'success')
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true)
    const { error } = await api.signUpWithEmail(email, password, fullName)
    setLoading(false)

    if (error) {
      showToast(error.message, 'error')
      throw error
    }
    showToast('Account created! Please check your email.', 'success')
  }

  const signInGoogle = async () => {
    const { error } = await api.signInWithGoogle()
    if (error) {
      showToast(error.message, 'error')
      throw error
    }
  }

  const signOutUser = async () => {
    const { error } = await api.signOut()
    if (error) {
      showToast(error.message, 'error')
      throw error
    }
    showToast('Logged out successfully', 'info')
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email, user.user_metadata?.full_name)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      initialized,
      signIn,
      signUp,
      signInGoogle,
      signOutUser,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
