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

export interface PriceHistoryItem {
  id: number
  amount: string
  recorded_at: string
  notes: string
}

export interface Bill {
  id: number
  name: string
  merchant?: string
  category: BillCategory
  amount: string
  previous_amount: string | null
  due_date: string
  recurrence: BillRecurrence
  is_subscription: boolean
  confidence_score?: number
  usage_frequency?: string
  last_used_date: string | null
  status: BillStatus
  notes: string
  created_at: string
  updated_at: string
  price_history?: PriceHistoryItem[]
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

export type InsightPriority = 'critical' | 'important' | 'insight' | 'recommendation'
export type InsightType = 'zombie' | 'anomaly' | 'savings' | 'risk' | 'price_increase'

export interface AIInsight {
  id: number
  bill: number | null
  bill_name?: string | null
  insight_type: InsightType
  priority: InsightPriority
  title: string
  message: string
  payload: Record<string, any>
  created_at: string
  dismissed: boolean
}

export interface DashboardSummary {
  monthly_commitments: {
    total: string
    by_category: Record<string, string>
  }
  due_soon: {
    window_days: number
    count: number
    bills: BillBrief[]
  }
  price_increases: {
    count: number
    monthly_impact: string
    bills: (BillBrief & { previous_amount: string; increase: string; pct_change: number })[]
  }
  next_30_days: {
    total: string
    by_category: Record<string, string>
    by_recurrence?: Record<string, string>
  }
  spending_trend: {
    current_month_total: string
    previous_month_total: string
    pct_change: number | null
  }
  potential_savings: {
    monthly: string
    annual: string
    zombie_count: number
    stale_subscriptions: (BillBrief & { idle_days?: number; annual_savings?: string })[]
  }
  financial_health: {
    score: number
    grade: string
    rating: string
    color: string
    factors: {
      type: string
      impact: string
      message: string
      status: 'good' | 'warning' | 'danger'
    }[]
    monthly_commitments: string
    total_annual_waste: string
  }
}

export interface BillBrief {
  id: number
  name: string
  merchant?: string
  category: BillCategory
  amount: string
  previous_amount?: string | null
  due_date: string
  recurrence: BillRecurrence
  is_subscription: boolean
  confidence_score?: number
  last_used_date?: string | null
  status?: BillStatus
}

export interface CalendarMonthData {
  year: number
  month: number
  days: Record<string, BillBrief[]>
  day_totals: Record<string, string>
  highest_expense_day: string | null
  month_total: string
}

export interface WhatIfResult {
  baseline: {
    monthly_total: string
    annual_total: string
    by_category: Record<string, string>
    health_score: number
  }
  simulated: {
    monthly_total: string
    annual_total: string
    by_category: Record<string, string>
    health_score: number
  }
  savings: {
    monthly: string
    annual: string
    pct_reduced: number
  }
  excluded_count: number
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
  detectRecurring: () => api.post('/bills/detect-recurring/').then(r => r.data),
  detectZombies: (threshold_days = 45) =>
    api.post('/bills/detect-zombies/', { threshold_days }).then(r => r.data),
  detectAnomalies: () => api.post('/bills/detect-anomalies/').then(r => r.data),
  scanReceipt: (raw_text: string, file?: File) => {
    const form = new FormData()
    if (raw_text) form.append('raw_text', raw_text)
    if (file) form.append('file', file)
    return api.post('/bills/scan/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  scanEmail: () => api.post('/bills/scan-email/').then(r => r.data),
}

export const insightsApi = {
  list: (params?: { priority?: string; all?: number }) =>
    api.get('/insights/', { params }).then(r => unwrapList<AIInsight>(r.data)),
  dismiss: (id: number) =>
    api.post(`/insights/${id}/dismiss/`).then(r => r.data),
  act: (id: number, action_type = 'draft_cancellation') =>
    api.post(`/insights/${id}/act/`, { action_type }).then(r => r.data),
}

export const dashboardApi = {
  summary: (days = 7) =>
    api.get<DashboardSummary>('/dashboard/summary/', { params: { days } }).then(r => r.data),
  calendar: (year?: number, month?: number) =>
    api.get<CalendarMonthData>('/dashboard/calendar/', { params: { year, month } }).then(r => r.data),
  whatIf: (exclude_bill_ids: number[], add_bills: any[] = []) =>
    api.post<WhatIfResult>('/dashboard/what-if/', { exclude_bill_ids, add_bills }).then(r => r.data),
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
  chat: (message: string) =>
    api.post<{
      reply: string
      suggestions: string[]
      timestamp: string
      context: Record<string, any>
    }>('/agent/chat/', { message }).then(r => r.data),
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
