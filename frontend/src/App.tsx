import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import WorkspaceDetail from './pages/WorkspaceDetail'
import Search from './pages/Search'
import Navbar from './components/Navbar'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400">Loading ResearchHub AI...</p>
            </div>
        </div>
    )
    if (!user) return <Navigate to="/login" replace />
    return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    if (loading) return null
    if (user) return <Navigate to="/dashboard" replace />
    return <>{children}</>
}

function AppRoutes() {
    const { user } = useAuth()
    return (
        <>
            {user && <Navbar />}
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/workspace/:id" element={<ProtectedRoute><WorkspaceDetail /></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    )
}
