import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'

interface UserProfile {
  id: string
  auth_id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: 'SuperAdmin' | 'Admin' | 'Manager' | 'Vendeur'
  status: 'pending' | 'active' | 'rejected'
  store_id?: string
  created_by?: string
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const navigate = useNavigate()

  const signOut = async () => {
    await supabase.auth.signOut()
    setUserProfile(null)
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Use setTimeout to avoid blocking the auth callback
        setTimeout(() => {
          fetchUserProfile(session.user.id)
        }, 0)
      } else {
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Handle redirects based on user status and role
  useEffect(() => {
    if (loading || provisioning) return

    if (user) {
      const currentPath = window.location.pathname

      if (!userProfile) {
        // Profile not yet available; wait for provisioning to complete
        return
      }

      switch (userProfile.status) {
        case 'pending':
          if (currentPath !== '/pending') {
            navigate('/pending', { replace: true })
          }
          break
        case 'rejected':
          // Automatically sign out rejected users
          signOut()
          break
        case 'active':
          if (currentPath === '/login' || currentPath === '/pending') {
            if (['SuperAdmin', 'Admin'].includes(userProfile.role)) {
              navigate('/admin', { replace: true })
            } else {
              navigate('/dashboard', { replace: true })
            }
          }
          break
      }
    } else {
      const currentPath = window.location.pathname
      if (currentPath !== '/login') {
        navigate('/login', { replace: true })
      }
    }
  }, [user, userProfile, loading, provisioning, navigate])

  // Automatically disconnect users whose access is revoked while they're using the app
  useEffect(() => {
    if (!loading && user && userProfile) {
      if (userProfile.status === 'rejected') {
        signOut()
      }
    }
  }, [userProfile?.status, user, loading, signOut])

  const fetchUserProfile = async (authId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user profile:', error)
        setUserProfile(null)
      } else if (!data) {
        // No profile found: self-heal by creating the profile
        try {
          setProvisioning(true)
          const { data: userRes } = await supabase.auth.getUser()
          const authUser = userRes?.user
          const email = authUser?.email ?? ''
          const firstName = (authUser?.user_metadata as any)?.first_name ?? 'Utilisateur'
          const lastName = (authUser?.user_metadata as any)?.last_name ?? 'Nouveau'

          const { data: created, error: insertError } = await supabase
            .from('users')
            .insert({
              auth_id: authId,
              email,
              first_name: firstName,
              last_name: lastName,
              role: 'Vendeur',
              status: 'pending'
            })
            .select('*')
            .maybeSingle()

          if (insertError) {
            console.error('Error auto-creating user profile:', insertError)
            setUserProfile(null)
          } else {
            setUserProfile(created ?? null)
          }
          setProvisioning(false)
        } catch (e) {
          console.error('Error during profile self-heal:', e)
          setUserProfile(null)
          setProvisioning(false)
        }
      } else {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    })
    if (error) throw error
  }


  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}