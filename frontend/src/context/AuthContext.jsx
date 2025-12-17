import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../utils/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  // Token is handled by api.js interceptors
  useEffect(() => {
    // No need to set axios defaults - api.js handles Authorization headers
  }, [token])

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await authAPI.verify()
          if (response.data.valid) {
            setUser(response.data.user)
          } else {
            logout()
          }
        } catch (error) {
          logout()
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, []) // Only run once on mount

  const login = async (username, password) => {
    try {
      const response = await authAPI.login({ username, password })

      const { token: newToken, user: userData } = response.data
      setToken(newToken)
      setUser(userData)
      localStorage.setItem('token', newToken)

      return { success: true, user: userData }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      }
    }
  }

  const signup = async (userData) => {
    try {
      const response = await authAPI.signup(userData)

      const { token: newToken, user: newUser } = response.data
      setToken(newToken)
      setUser(newUser)
      localStorage.setItem('token', newToken)

      return { success: true, user: newUser }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Signup failed'
      }
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    // Authorization header is handled by api.js interceptors
  }

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
