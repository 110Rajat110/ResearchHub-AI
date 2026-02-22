import axios from 'axios'

const BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token from localStorage on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Auto-logout on 401
api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
    id: number
    email: string
    username: string
    created_at: string
}

export interface Workspace {
    id: number
    name: string
    description: string
    created_at: string
    owner_id: number
    paper_count: number
}

export interface Paper {
    id: number
    title: string
    authors: string
    abstract: string
    year?: number
    doi?: string
    url?: string
    source: string
    imported_at: string
    workspace_id: number
}

export interface SearchResult {
    title: string
    authors: string
    abstract: string
    year?: number
    doi?: string
    url?: string
    source: string
    external_id?: string
}

export interface Message {
    id: number
    role: 'user' | 'assistant'
    content: string
    created_at: string
    conversation_id: number
}

export interface Conversation {
    id: number
    title: string
    created_at: string
    workspace_id: number
    messages: Message[]
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
    register: async (email: string, username: string, password: string) => {
        const res = await api.post('/auth/register', { email, username, password })
        return res.data as User
    },
    login: async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password })
        return res.data as { access_token: string; token_type: string }
    },
    me: async () => {
        const res = await api.get('/auth/me')
        return res.data as User
    },
}

// ─── Workspaces ───────────────────────────────────────────────────────────────

export const workspaceApi = {
    list: async () => {
        const res = await api.get('/workspaces/')
        return res.data as Workspace[]
    },
    create: async (name: string, description: string) => {
        const res = await api.post('/workspaces/', { name, description })
        return res.data as Workspace
    },
    get: async (id: number) => {
        const res = await api.get(`/workspaces/${id}`)
        return res.data as Workspace
    },
    delete: async (id: number) => {
        await api.delete(`/workspaces/${id}`)
    },
}

// ─── Papers ───────────────────────────────────────────────────────────────────

export const paperApi = {
    search: async (q: string, limit = 15) => {
        const res = await api.get('/papers/search', { params: { q, limit } })
        return res.data as SearchResult[]
    },
    import: async (data: {
        workspace_id: number
        title: string
        authors: string
        abstract: string
        year?: number
        doi?: string
        url?: string
        source?: string
        external_id?: string
    }) => {
        const res = await api.post('/papers/import', data)
        return res.data as Paper
    },
    list: async (workspaceId: number) => {
        const res = await api.get(`/papers/workspace/${workspaceId}`)
        return res.data as Paper[]
    },
    delete: async (paperId: number) => {
        await api.delete(`/papers/${paperId}`)
    },
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chatApi = {
    send: async (workspaceId: number, message: string, conversationId?: number) => {
        const res = await api.post('/chat/', {
            workspace_id: workspaceId,
            message,
            conversation_id: conversationId,
        })
        return res.data as { conversation_id: number; reply: string }
    },
    history: async (workspaceId: number) => {
        const res = await api.get(`/chat/history/${workspaceId}`)
        return res.data as Conversation[]
    },
    deleteConversation: async (conversationId: number) => {
        await api.delete(`/chat/conversation/${conversationId}`)
    },
}

export default api
