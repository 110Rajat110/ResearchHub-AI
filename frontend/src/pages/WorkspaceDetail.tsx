import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { workspaceApi, paperApi, chatApi, Paper, Workspace, Message, Conversation } from '../services/api'

export default function WorkspaceDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const workspaceId = parseInt(id || '0')

    const [workspace, setWorkspace] = useState<Workspace | null>(null)
    const [papers, setPapers] = useState<Paper[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [deleteId, setDeleteId] = useState<number | null>(null)

    // Chat state
    const [chatOpen, setChatOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [chatLoading, setChatLoading] = useState(false)
    const [conversationId, setConversationId] = useState<number | undefined>()
    const [conversations, setConversations] = useState<Conversation[]>([])
    const chatEndRef = useRef<HTMLDivElement>(null)
    const [showHistory, setShowHistory] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            try {
                const [ws, papersData] = await Promise.all([
                    workspaceApi.get(workspaceId),
                    paperApi.list(workspaceId),
                ])
                setWorkspace(ws)
                setPapers(papersData)
            } catch {
                setError('Failed to load workspace')
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [workspaceId])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleDeletePaper = async (paperId: number) => {
        try {
            await paperApi.delete(paperId)
            setPapers((prev) => prev.filter((p) => p.id !== paperId))
        } catch {
            setError('Failed to delete paper')
        } finally {
            setDeleteId(null)
        }
    }

    const handleSendMessage = async () => {
        if (!input.trim() || chatLoading) return
        const userMsg = input.trim()
        setInput('')
        const currentMessages = [...messages, { id: Date.now(), role: 'user' as const, content: userMsg, created_at: new Date().toISOString(), conversation_id: conversationId || 0 }]
        setMessages(currentMessages)
        setChatLoading(true)
        try {
            const res = await chatApi.send(workspaceId, userMsg, conversationId)
            setConversationId(res.conversation_id)
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: res.reply,
                created_at: new Date().toISOString(),
                conversation_id: res.conversation_id,
            }])
        } catch (e: any) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: `⚠️ Error: ${e?.response?.data?.detail || 'Failed to get response. Please check your Groq API key.'}`,
                created_at: new Date().toISOString(),
                conversation_id: conversationId || 0,
            }])
        } finally {
            setChatLoading(false)
        }
    }

    const loadHistory = async () => {
        try {
            const hist = await chatApi.history(workspaceId)
            setConversations(hist)
            setShowHistory(true)
        } catch { /* ignore */ }
    }

    const loadConversation = (conv: Conversation) => {
        setConversationId(conv.id)
        setMessages(conv.messages)
        setShowHistory(false)
    }

    const newChat = () => {
        setConversationId(undefined)
        setMessages([])
        setShowHistory(false)
    }

    if (loading) return (
        <div className="min-h-screen pt-24 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    if (error) return (
        <div className="min-h-screen pt-24 flex items-center justify-center">
            <div className="card text-center">
                <p className="text-red-400">{error}</p>
                <button onClick={() => navigate('/dashboard')} className="btn-secondary mt-4">Back to Dashboard</button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen pt-20 px-4 sm:px-6 lg:px-8 pb-10">
            <div className="max-w-7xl mx-auto">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 animate-fade-in">
                    <Link to="/dashboard" className="hover:text-brand-400 transition-colors">Dashboard</Link>
                    <span>/</span>
                    <span className="text-gray-300">{workspace?.name}</span>
                </div>

                {/* Workspace Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-slide-up">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{workspace?.name}</h1>
                        {workspace?.description && <p className="text-gray-400 mt-1">{workspace.description}</p>}
                        <div className="flex items-center gap-4 mt-2">
                            <span className="badge bg-brand-500/20 text-brand-400 border border-brand-500/30">
                                📄 {papers.length} papers
                            </span>
                            <span className="text-xs text-gray-600">Created {new Date(workspace?.created_at || '').toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link to={`/search?workspace=${workspaceId}`} className="btn-primary flex items-center gap-2">
                            <span>⌕</span> Add Papers
                        </Link>
                        <button onClick={() => { setChatOpen(true); }} className="btn-secondary flex items-center gap-2">
                            <span>🤖</span> AI Chat
                        </button>
                    </div>
                </div>

                {/* Delete Paper Modal */}
                {deleteId !== null && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="card w-full max-w-sm animate-fade-in">
                            <h3 className="text-lg font-semibold text-white mb-2">Remove Paper?</h3>
                            <p className="text-gray-400 text-sm mb-6">This paper will be removed from this workspace.</p>
                            <div className="flex gap-3">
                                <button onClick={() => handleDeletePaper(deleteId)} className="btn-danger flex-1">Remove</button>
                                <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Papers Grid */}
                {papers.length === 0 ? (
                    <div className="card text-center py-16">
                        <div className="text-5xl mb-4">📚</div>
                        <h3 className="text-xl font-semibold text-white mb-2">No papers yet</h3>
                        <p className="text-gray-400 mb-6">Search and import papers to this workspace to enable AI analysis</p>
                        <Link to={`/search?workspace=${workspaceId}`} className="btn-primary">Search Papers</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {papers.map((paper) => (
                            <div key={paper.id} className="card group animate-fade-in">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <h3 className="font-semibold text-white leading-tight text-sm sm:text-base flex-1">
                                        {paper.title}
                                    </h3>
                                    <button
                                        onClick={() => setDeleteId(paper.id)}
                                        className="text-gray-600 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                                        title="Remove paper"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-3">
                                    {paper.year && (
                                        <span className="badge bg-gray-800 text-gray-400 border border-gray-700/50">
                                            📅 {paper.year}
                                        </span>
                                    )}
                                    <span className="badge bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                        {paper.source}
                                    </span>
                                </div>

                                {paper.authors && (
                                    <p className="text-gray-400 text-xs mb-3 font-medium">
                                        👥 {paper.authors.split(',').slice(0, 3).join(', ')}{paper.authors.split(',').length > 3 ? ' et al.' : ''}
                                    </p>
                                )}

                                {paper.abstract && (
                                    <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">{paper.abstract}</p>
                                )}

                                {paper.url && (
                                    <a
                                        href={paper.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 mt-3 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        ↗ View paper
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* AI Chat Panel */}
                {chatOpen && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end p-0 sm:p-4">
                        <div className="glass border border-gray-700/60 w-full sm:w-[420px] h-screen sm:h-[640px] flex flex-col animate-slide-in-right">
                            {/* Chat Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-xs font-bold">
                                        AI
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">ResearchHub AI</p>
                                        <p className="text-xs text-gray-500">{papers.length} papers in context • Llama 3.3 70B</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={loadHistory} className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-800 transition-colors">
                                        History
                                    </button>
                                    <button onClick={newChat} className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded hover:bg-gray-800 transition-colors">
                                        New
                                    </button>
                                    <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-gray-300 ml-1">✕</button>
                                </div>
                            </div>

                            {/* History Panel */}
                            {showHistory && conversations.length > 0 && (
                                <div className="border-b border-gray-800/60 max-h-48 overflow-y-auto">
                                    {conversations.map((conv) => (
                                        <button
                                            key={conv.id}
                                            onClick={() => loadConversation(conv)}
                                            className="w-full text-left px-4 py-2.5 hover:bg-gray-800/60 text-sm text-gray-300 border-b border-gray-800/40 last:border-0"
                                        >
                                            <p className="truncate font-medium">{conv.title}</p>
                                            <p className="text-xs text-gray-500">{new Date(conv.created_at).toLocaleDateString()}</p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                                {messages.length === 0 && (
                                    <div className="text-center py-8">
                                        <div className="text-4xl mb-3">🤖</div>
                                        <p className="text-gray-400 text-sm font-medium">Ask me anything about your research papers</p>
                                        <div className="mt-4 space-y-2">
                                            {[
                                                'Summarize the main findings across all papers',
                                                'What methodologies are commonly used?',
                                                'Compare the key differences between papers',
                                            ].map((suggestion) => (
                                                <button
                                                    key={suggestion}
                                                    onClick={() => setInput(suggestion)}
                                                    className="block w-full text-left text-xs text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 px-3 py-2 rounded-lg transition-all"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'assistant' && (
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-xs font-bold shrink-0 mr-2 mt-0.5">
                                                AI
                                            </div>
                                        )}
                                        <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${msg.role === 'user'
                                                ? 'bg-brand-600/30 border border-brand-500/30 text-gray-100'
                                                : 'bg-gray-800/60 border border-gray-700/40 text-gray-200'
                                            }`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}

                                {chatLoading && (
                                    <div className="flex justify-start">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-xs font-bold shrink-0 mr-2 mt-0.5">
                                            AI
                                        </div>
                                        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl px-4 py-3">
                                            <div className="flex gap-1.5">
                                                <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input */}
                            <div className="px-4 py-3 border-t border-gray-800/60">
                                <div className="flex gap-2">
                                    <input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                                        placeholder="Ask about your research papers..."
                                        className="input-field flex-1 py-2 text-sm"
                                        disabled={chatLoading}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!input.trim() || chatLoading}
                                        className="btn-primary px-3 py-2 disabled:opacity-40"
                                    >
                                        ↑
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
