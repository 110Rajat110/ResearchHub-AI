import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { paperApi, workspaceApi, SearchResult, Workspace } from '../services/api'

export default function Search() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const preselectedWorkspace = searchParams.get('workspace')

    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [searching, setSearching] = useState(false)
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [selectedWorkspace, setSelectedWorkspace] = useState<number | ''>(
        preselectedWorkspace ? parseInt(preselectedWorkspace) : ''
    )
    const [importing, setImporting] = useState<string | null>(null)
    const [imported, setImported] = useState<Set<string>>(new Set())
    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    useEffect(() => {
        workspaceApi.list().then(setWorkspaces).catch(() => { })
    }, [])

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return
        setSearching(true)
        setError('')
        setResults([])
        try {
            const data = await paperApi.search(query.trim(), 15)
            setResults(data)
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Search failed. Please try again.')
        } finally {
            setSearching(false)
        }
    }

    const handleImport = async (paper: SearchResult) => {
        if (!selectedWorkspace) {
            setError('Please select a workspace first')
            return
        }
        const key = paper.external_id || paper.title
        setImporting(key)
        setError('')
        try {
            await paperApi.import({
                workspace_id: selectedWorkspace as number,
                title: paper.title,
                authors: paper.authors,
                abstract: paper.abstract,
                year: paper.year,
                doi: paper.doi,
                url: paper.url,
                source: paper.source,
                external_id: paper.external_id,
            })
            setImported((prev) => new Set([...prev, key]))
            setSuccessMsg(`"${paper.title.substring(0, 50)}..." added to workspace`)
            setTimeout(() => setSuccessMsg(''), 3000)
        } catch (err: any) {
            const detail = err?.response?.data?.detail || 'Import failed'
            if (err?.response?.status === 409) {
                setImported((prev) => new Set([...prev, key]))
                setSuccessMsg('Paper already exists in this workspace')
                setTimeout(() => setSuccessMsg(''), 2000)
            } else {
                setError(detail)
            }
        } finally {
            setImporting(null)
        }
    }

    const SUGGESTIONS = [
        'transformer architecture NLP',
        'convolutional neural network image classification',
        'large language models fine-tuning',
        'reinforcement learning robotics',
        'graph neural networks',
        'medical imaging deep learning',
    ]

    return (
        <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 pb-10">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 animate-slide-up">
                    <h1 className="text-3xl font-bold text-white mb-2">Search Research Papers</h1>
                    <p className="text-gray-400">Powered by <span className="text-brand-400 font-medium">OpenAlex</span> • 250M+ scientific papers</p>
                </div>

                {/* Search Form */}
                <div className="card mb-6 animate-fade-in">
                    <form onSubmit={handleSearch} className="flex gap-3">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder='e.g., "transformer architecture" or "medical imaging CNN"'
                            className="input-field flex-1"
                            autoFocus
                        />
                        <button type="submit" disabled={searching || !query.trim()} className="btn-primary px-6 shrink-0">
                            {searching ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Searching
                                </span>
                            ) : '⌕ Search'}
                        </button>
                    </form>

                    {/* Workspace selector */}
                    <div className="flex items-center gap-3 mt-4">
                        <label className="text-sm text-gray-400 shrink-0">Import to:</label>
                        <select
                            value={selectedWorkspace}
                            onChange={(e) => setSelectedWorkspace(e.target.value ? parseInt(e.target.value) : '')}
                            className="input-field flex-1 py-2"
                        >
                            <option value="">— Select workspace —</option>
                            {workspaces.map((ws) => (
                                <option key={ws.id} value={ws.id}>{ws.name}</option>
                            ))}
                        </select>
                        {selectedWorkspace && (
                            <Link to={`/workspace/${selectedWorkspace}`} className="btn-secondary text-xs shrink-0 py-2">
                                View Workspace
                            </Link>
                        )}
                    </div>

                    {/* Suggestions */}
                    {results.length === 0 && !searching && (
                        <div className="mt-4">
                            <p className="text-xs text-gray-600 mb-2">Try searching for:</p>
                            <div className="flex flex-wrap gap-2">
                                {SUGGESTIONS.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setQuery(s)}
                                        className="text-xs px-3 py-1.5 rounded-full bg-gray-800/60 text-gray-400 hover:text-brand-400 hover:bg-brand-500/10 border border-gray-700/50 hover:border-brand-500/30 transition-all"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Messages */}
                {successMsg && (
                    <div className="bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 text-sm px-4 py-3 rounded-lg mb-4 animate-fade-in">
                        ✓ {successMsg}
                    </div>
                )}
                {error && (
                    <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-sm px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                {/* Results Count */}
                {results.length > 0 && (
                    <p className="text-sm text-gray-500 mb-4">{results.length} results for "<span className="text-gray-300">{query}</span>"</p>
                )}

                {/* Results */}
                <div className="space-y-3">
                    {results.map((paper, i) => {
                        const key = paper.external_id || paper.title
                        const isImported = imported.has(key)
                        const isImporting = importing === key

                        return (
                            <div key={i} className="card group animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                                <div className="flex items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white text-sm sm:text-base leading-tight mb-2">
                                            {paper.title}
                                        </h3>

                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {paper.year && (
                                                <span className="badge bg-gray-800 text-gray-400 border border-gray-700/50">📅 {paper.year}</span>
                                            )}
                                            <span className="badge bg-violet-500/20 text-violet-400 border border-violet-500/30">{paper.source}</span>
                                            {paper.doi && (
                                                <span className="badge bg-gray-800 text-gray-500 border border-gray-700/50 font-mono text-xs">DOI</span>
                                            )}
                                        </div>

                                        {paper.authors && (
                                            <p className="text-gray-400 text-xs mb-2">
                                                👥 {paper.authors.split(',').slice(0, 4).join(', ')}{paper.authors.split(',').length > 4 ? ' et al.' : ''}
                                            </p>
                                        )}

                                        {paper.abstract && paper.abstract !== 'No abstract available.' && (
                                            <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">{paper.abstract}</p>
                                        )}

                                        {paper.url && (
                                            <a
                                                href={paper.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                                            >
                                                ↗ View on {paper.source === 'openalex' ? 'OpenAlex' : 'source'}
                                            </a>
                                        )}
                                    </div>

                                    {/* Import Button */}
                                    <div className="shrink-0 mt-1">
                                        {isImported ? (
                                            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                                ✓ Saved
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleImport(paper)}
                                                disabled={!selectedWorkspace || isImporting}
                                                className="btn-primary text-xs px-3 py-2 disabled:opacity-40 whitespace-nowrap"
                                                title={!selectedWorkspace ? 'Select a workspace first' : 'Import to workspace'}
                                            >
                                                {isImporting ? (
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    </span>
                                                ) : '+ Import'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {results.length === 0 && !searching && query && (
                    <div className="card text-center py-16 animate-fade-in">
                        <div className="text-4xl mb-4">🔍</div>
                        <p className="text-gray-400">No results found for "<span className="text-gray-300">{query}</span>"</p>
                        <p className="text-gray-600 text-sm mt-2">Try different keywords or check your internet connection</p>
                    </div>
                )}
            </div>
        </div>
    )
}
