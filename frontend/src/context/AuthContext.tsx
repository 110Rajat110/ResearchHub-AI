import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi, User } from '../services/api'

export interface AuthContextType {
    user: User | null
    token: string | null
    loading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (email: string, username: string, password: string) => Promise<void>
    logout: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token')
            if (storedToken) {
                try {
                    const userData = await authApi.me()
                    setUser(userData)
                    setToken(storedToken)
                } catch {
                    localStorage.removeItem('token')
                    setToken(null)
                }
            }
            setLoading(false)
        }
        initAuth()
    }, [])

    const login = async (email: string, password: string) => {
        const resp = await authApi.login(email, password)
        localStorage.setItem('token', resp.access_token)
        setToken(resp.access_token)
        const userData = await authApi.me()
        setUser(userData)
    }

    const register = async (email: string, username: string, password: string) => {
        await authApi.register(email, username, password)
        await login(email, password)
    }

    const logout = () => {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
        window.location.href = '/login'
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}
