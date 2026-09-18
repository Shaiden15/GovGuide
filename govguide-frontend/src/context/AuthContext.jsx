import { useEffect, useState } from 'react'
import { AuthContext } from './auth-context'
import { supabase } from '../lib/supabaseClient'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) return { success: false, error: error.message }

    // If email confirmation is required, Supabase returns a user with no session yet.
    const needsConfirmation = !data.session
    return { success: true, needsConfirmation }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    user: session?.user ?? null,
    isAuthenticated: !!session,
    loading,
    login,
    signUp,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
