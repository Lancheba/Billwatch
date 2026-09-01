import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from './api'
import type { User } from './api'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  signup: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('billwatch_token')
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('billwatch_token')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (username: string, password: string) => {
    const data = await authApi.login(username, password)
    localStorage.setItem('billwatch_token', data.token)
    setUser(data.user)
  }

  const signup = async (username: string, email: string, password: string) => {
    const data = await authApi.signup(username, email, password)
    localStorage.setItem('billwatch_token', data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('billwatch_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
