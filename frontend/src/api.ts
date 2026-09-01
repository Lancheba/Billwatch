import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('billwatch_token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

export default api

// ── Types ──────────────────────────────────────────────────────────────────

export type BillStatus = 'active' | 'flagged' | 'cancelled' | 'paid'
export type BillCategory = 'utility' | 'subscription' | 'loan' | 'other'
export type BillRecurrence = 'monthly' | 'yearly' | 'weekly' | 'one_time'

export interface Bill {
  id: number
  name: string
  category: BillCategory
  amount: string
  previous_amount: string | null
  due_date: string
  recurrence: BillRecurrence
  is_subscription: boolean
  last_used_date: string | null
  status: BillStatus
  notes: string
  created_at: string
  updated_at: string
  subscription_detail?: {
    provider_url: string | null
    usage_notes: string | null
  } | null
}

export type AgentAction =
  | 'auto_handled'
  | 'flagged_for_review'
  | 'drafted_notification'
  | 'drafted_cancellation'

export type UserDecision = 'approved' | 'rejected' | 'pending' | null

export interface DecisionLog {
  id: number
  bill: number
  bill_name: string
  agent_action: AgentAction
  reasoning: string
  draft_content: string | null
  user_decision: UserDecision
  created_at: string
}

// ── API helpers ────────────────────────────────────────────────────────────

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: T[] }).results
  }
  return []
}

export const billsApi = {
  list: () => api.get('/bills/').then(r => unwrapList<Bill>(r.data)),
  get: (id: number) => api.get<Bill>(`/bills/${id}/`).then(r => r.data),
  create: (data: Partial<Bill>) => api.post<Bill>('/bills/', data).then(r => r.data),
  update: (id: number, data: Partial<Bill>) =>
    api.patch<Bill>(`/bills/${id}/`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/bills/${id}/`),
  dueSoon: (days = 7) =>
    api.get('/bills/due-soon/', { params: { days } }).then(r => unwrapList<Bill>(r.data)),
  importCsv: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/bills/import/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const decisionsApi = {
  list: () => api.get('/decisions/').then(r => unwrapList<DecisionLog>(r.data)),
  approve: (id: number) =>
    api.post<DecisionLog>(`/decisions/${id}/approve/`).then(r => r.data),
  reject: (id: number) =>
    api.post<DecisionLog>(`/decisions/${id}/reject/`).then(r => r.data),
}

export const agentApi = {
  run: (days = 7) =>
    api.post('/agent/run/', { days }).then(r => r.data),
}

// ── Auth ───────────────────────────────────────────────────────────────────

export interface User {
  id: number
  username: string
  email: string
}

export const authApi = {
  signup: (username: string, email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/signup/', { username, email, password })
      .then(r => r.data),
  login: (username: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login/', { username, password })
      .then(r => r.data),
  me: () => api.get<User>('/auth/me/').then(r => r.data),
}
