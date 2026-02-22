import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const NAV_LINKS = [
    { to: '/dashboard', label: 'Dashboard', icon: '⊞' },
    { to: '/search', label: 'Search Papers', icon: '⌕' },
]

export default function Navbar() {
    const { user, logout } = useAuth()
    const location = useLocation()

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-800/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/dashboard" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-500/30">
                            R
                        </div>
                        <span className="font-bold text-lg gradient-text hidden sm:block">ResearchHub AI</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-1">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${location.pathname === link.to
                                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                                    }`}
                            >
                                <span className="text-base">{link.icon}</span>
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-sm font-medium text-gray-200">{user?.username}</span>
                            <span className="text-xs text-gray-500">{user?.email}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm uppercase">
                            {user?.username?.charAt(0) || 'U'}
                        </div>
                        <button
                            onClick={logout}
                            className="btn-secondary text-sm px-3 py-1.5 text-xs"
                            title="Logout"
                        >
                            Sign out
                        </button>
                    </div>
                </div>

                {/* Mobile nav */}
                <div className="md:hidden flex gap-2 pb-2">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${location.pathname === link.to
                                ? 'bg-brand-600/20 text-brand-400'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                                }`}
                        >
                            {link.icon} {link.label}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    )
}
