import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { workspaceApi, Workspace } from '../services/api'
import { useAuth } from '../context/useAuth'

export default function Dashboard() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [creating, setCreating] = useState(false)
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [error, setError] = useState('')

    const fetchWorkspaces = async () => {
        try {
            const data = await workspaceApi.list()
            setWorkspaces(data)
        } catch {
            setError('Failed to load workspaces')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchWorkspaces() }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        setCreating(true)
        try {
            const ws = await workspaceApi.create(name.trim(), description.trim())
            setWorkspaces((prev) => [ws, ...prev])
            setName(''); setDescription(''); setShowCreate(false)
        } catch {
            setError('Failed to create workspace')
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await workspaceApi.delete(id)
            setWorkspaces((prev) => prev.filter((w) => w.id !== id))
        } catch {
            setError('Failed to delete workspace')
        } finally {
            setDeleteId(null)
        }
    }

    const WORKSPACE_COLORS = [
        'from-brand-500 to-violet-500',
        'from-cyan-500 to-blue-500',
        'from-emerald-500 to-teal-500',
        'from-orange-500 to-red-500',
        'from-pink-500 to-rose-500',
    ]

    return (
        <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 pb-10">
            <div className="max-w-7xl mx-auto">
                {/* Hero section */}
                <div className="mb-8 animate-slide-up">
                    <h1 className="text-3xl font-bold text-white">
                        Welcome back, <span className="gradient-text">{user?.username}</span>
                    </h1>
                    <p className="text-gray-400 mt-1">Manage your research workspaces and explore AI-powered insights</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Workspaces', value: workspaces.length, icon: '⊞' },
                        { label: 'Total Papers', value: workspaces.reduce((a, w) => a + (w.paper_count || 0), 0), icon: '📄' },
                        { label: 'AI Ready', value: 'Llama 3.3 70B', icon: '🤖' },
                        { label: 'Database', value: 'OpenAlex', icon: '🔬' },
                    ].map((stat) => (
                        <div key={stat.label} className="card text-center">
                            <div className="text-2xl mb-1">{stat.icon}</div>
                            <div className="text-xl font-bold text-white">{stat.value}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-sm px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                {/* Workspaces Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">My Workspaces</h2>
                    <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
                        <span className="text-lg">+</span> New Workspace
                    </button>
                </div>

                {/* Create Modal */}
                {showCreate && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="card w-full max-w-md animate-fade-in">
                            <h3 className="text-lg font-semibold text-white mb-4">Create Workspace</h3>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Workspace Name *</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Deep Learning Research"
                                        className="input-field"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief description of this research area..."
                                        className="input-field h-24 resize-none"
                                        rows={3}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button type="submit" disabled={creating} className="btn-primary flex-1">
                                        {creating ? 'Creating...' : 'Create'}
                                    </button>
                                    <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirm Modal */}
                {deleteId !== null && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="card w-full max-w-sm animate-fade-in">
                            <h3 className="text-lg font-semibold text-white mb-2">Delete Workspace?</h3>
                            <p className="text-gray-400 text-sm mb-6">This will permanently delete the workspace and all its papers and conversations.</p>
                            <div className="flex gap-3">
                                <button onClick={() => handleDelete(deleteId)} className="btn-danger flex-1">Delete</button>
                                <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Workspace Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="card animate-pulse h-44">
                                <div className="h-4 bg-gray-800 rounded w-2/3 mb-3" />
                                <div className="h-3 bg-gray-800 rounded w-full mb-2" />
                                <div className="h-3 bg-gray-800 rounded w-4/5" />
                            </div>
                        ))}
                    </div>
                ) : workspaces.length === 0 ? (
                    <div className="card text-center py-16">
                        <div className="text-5xl mb-4">🔬</div>
                        <h3 className="text-xl font-semibold text-white mb-2">No workspaces yet</h3>
                        <p className="text-gray-400 mb-6">Create your first workspace to organize your research papers</p>
                        <button onClick={() => setShowCreate(true)} className="btn-primary">Create Workspace</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {workspaces.map((ws, i) => (
                            <div key={ws.id} className="card hover:scale-[1.01] cursor-pointer group animate-fade-in"
                                onClick={() => navigate(`/workspace/${ws.id}`)}>
                                {/* Color bar */}
                                <div className={`h-1.5 w-full rounded-full bg-gradient-to-r ${WORKSPACE_COLORS[i % WORKSPACE_COLORS.length]} mb-4`} />

                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors duration-200 text-lg leading-tight">
                                        {ws.name}
                                    </h3>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteId(ws.id) }}
                                        className="text-gray-600 hover:text-red-400 transition-colors p-1 -mr-1 opacity-0 group-hover:opacity-100"
                                        title="Delete workspace"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {ws.description && (
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{ws.description}</p>
                                )}

                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-800/60">
                                    <span className="badge bg-brand-500/20 text-brand-400 border border-brand-500/30">
                                        📄 {ws.paper_count} papers
                                    </span>
                                    <span className="text-xs text-gray-600">
                                        {new Date(ws.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
