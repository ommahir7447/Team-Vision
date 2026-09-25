import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('smartattend_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('smartattend_token') || null)

  const login = useCallback((userData, jwtToken) => {
    setUser(userData)
    setToken(jwtToken)
    localStorage.setItem('smartattend_user', JSON.stringify(userData))
    localStorage.setItem('smartattend_token', jwtToken)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('smartattend_user')
    localStorage.removeItem('smartattend_token')
    localStorage.removeItem('student_profile_photo_local')
  }, [])

  const isAuthenticated = !!token
  const role = user?.role || null

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, role }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
