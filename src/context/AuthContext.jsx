import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { setAccessToken, onAccessTokenChange, refreshAccessToken } from '../api/client'
import * as authApi from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    onAccessTokenChange((newToken) => {
      setToken(newToken)
      if (!newToken) setUser(null)
    })
  }, [])

  const fetchProfile = useCallback(async () => {
    const { user: profile } = await authApi.getProfile()
    setUser(profile)
    return profile
  }, [])

  // On first load, try to restore a session from the httpOnly refresh cookie
  // (e.g. the user closed the tab and came back within the 7-day window).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const newToken = await refreshAccessToken()
        if (cancelled) return
        setAccessToken(newToken)
        setToken(newToken)
        await fetchProfile()
      } catch {
        // no valid session — that's fine, user just isn't logged in
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fetchProfile])

  const login = async (email, password) => {
    const data = await authApi.login(email, password)
    setAccessToken(data.accessToken)
    setToken(data.accessToken)
    setUser(data.user)
    return data
  }

  const register = (payload) => authApi.register(payload)

  const verify = (email, otp) => authApi.verifyOtp(email, otp)

  const reverify = (email) => authApi.reverify(email)

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // best-effort — clear local state regardless
    }
    setAccessToken(null)
    setToken(null)
    setUser(null)
  }

  const updateProfile = async (payload) => {
    const data = await authApi.updateProfile(payload)
    setUser(data.user)
    return data
  }

  const uploadAvatar = async (file) => {
    const data = await authApi.uploadAvatar(file)
    setUser((prev) => (prev ? { ...prev, avatar: data.avatar } : prev))
    return data
  }

  const removeAvatar = async () => {
    const data = await authApi.removeAvatar()
    setUser((prev) => (prev ? { ...prev, avatar: null } : prev))
    return data
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    login,
    register,
    verify,
    reverify,
    logout,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    fetchProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
