import { type Bill, type BillStatus, type AgentAction, type UserDecision } from './api'

// ── Status badge helpers ───────────────────────────────────────────────────

export const STATUS_COLORS: Record<BillStatus, string> = {
  active: 'bg-green-100 text-green-800',
  flagged: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500 line-through',
  paid: 'bg-blue-100 text-blue-700',
}

export const ACTION_COLORS: Record<AgentAction, string> = {
  auto_handled: 'bg-green-50 text-green-700 border-green-200',
  flagged_for_review: 'bg-orange-50 text-orange-700 border-orange-200',
  drafted_notification: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  drafted_cancellation: 'bg-red-50 text-red-700 border-red-200',
}

export const ACTION_LABELS: Record<AgentAction, string> = {
  auto_handled: 'Auto-handled',
  flagged_for_review: 'Flagged for review',
  drafted_notification: 'Notification drafted',
  drafted_cancellation: 'Cancellation drafted',
}

export const DECISION_LABELS: Record<Exclude<UserDecision, null>, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
}

// ── Formatting helpers ─────────────────────────────────────────────────────

export function fmtCurrency(v: string | number | null | undefined): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(v))
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return '—'
  return new Date(v + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return '—'
  return new Date(v).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function daysUntil(due: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(due + 'T00:00:00')
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

export function dueSoonBadge(bill: Bill): string | null {
  const days = daysUntil(bill.due_date)
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Due today'
  if (days <= 3) return `Due in ${days}d`
  if (days <= 7) return `Due in ${days}d`
  return null
}

export function hasPriceIncrease(bill: Bill): boolean {
  if (!bill.previous_amount) return false
  return Number(bill.amount) > Number(bill.previous_amount)
}
