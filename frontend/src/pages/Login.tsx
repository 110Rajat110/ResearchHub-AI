import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleDemoLogin = async () => {
        setError('')
        setLoading(true)
        try {
            await login('test@research.ai', 'password123')
            navigate('/dashboard')
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Demo login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await login(email, password)
            navigate('/dashboard')
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Invalid credentials. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-fade-in">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-xl shadow-brand-500/30">
                        R
                    </div>
                    <h1 className="text-3xl font-bold gradient-text">ResearchHub AI</h1>
                    <p className="text-gray-400 mt-2 text-sm">Intelligent Research Paper Management</p>
                </div>

                {/* Form Card */}
                <div className="card">
                    <h2 className="text-xl font-semibold mb-6 text-white">Welcome back</h2>

                    {error && (
                        <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-sm px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@university.edu"
                                className="input-field"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input-field"
                                required
                            />
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    {/* Demo Login Button */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="bg-gray-800/50 p-3 rounded-lg mb-3 text-center border border-gray-700">
                            <p className="text-xs text-gray-400 mb-1">Demo Account Credentials</p>
                            <p className="text-sm font-mono text-gray-300">Email: <span className="text-white">test@research.ai</span></p>
                            <p className="text-sm font-mono text-gray-300">Pass: <span className="text-white">password123</span></p>
                        </div>
                        <button 
                            onClick={handleDemoLogin} 
                            disabled={loading} 
                            className="btn-secondary w-full py-2 text-sm"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Loading Demo...
                                </span>
                            ) : '🚀 Try Demo Account'}
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-2">
                            Instant access with demo research papers
                        </p>
                    </div>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
