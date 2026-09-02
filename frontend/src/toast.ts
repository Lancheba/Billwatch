// Minimal, framework-agnostic toast/notification store.
//
// This is intentionally NOT a React context. The global TanStack Query
// `QueryCache` / `MutationCache` handlers (see App.tsx) are created once,
// outside of any component tree, so they need a way to trigger a
// notification without needing access to React state. `showToast` gives
// them (and any component) that hook; `<ToastContainer />` subscribes to
// render whatever is currently active.
//
// The intended flow is:
//   useQuery({ ..., meta: { errorMessage: 'Failed to load bills.' } })
//   useMutation({ ..., meta: { errorMessage: '...', successMessage: '...' } })
// and the global cache callbacks in App.tsx call showToast() for you —
// individual pages never need to import this file directly.

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  variant: ToastVariant
  message: string
}

type Listener = (toasts: ToastItem[]) => void

let toasts: ToastItem[] = []
let listeners: Listener[] = []
let nextId = 1

const DEFAULT_DURATION_MS = 5000

function emit() {
  listeners.forEach(listener => listener(toasts))
}

/** Show a toast notification. Returns the toast's id (e.g. for manual dismissal). */
export function showToast(
  message: string,
  variant: ToastVariant = 'info',
  durationMs: number = DEFAULT_DURATION_MS
): number {
  const id = nextId++
  toasts = [...toasts, { id, variant, message }]
  emit()
  if (durationMs > 0) {
    setTimeout(() => dismissToast(id), durationMs)
  }
  return id
}

export function dismissToast(id: number) {
  toasts = toasts.filter(t => t.id !== id)
  emit()
}

/** Subscribe to toast list changes. Returns an unsubscribe function. */
export function subscribeToasts(listener: Listener): () => void {
  listeners = [...listeners, listener]
  listener(toasts)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}
