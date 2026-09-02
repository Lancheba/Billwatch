import { useEffect, useState } from 'react'
import { subscribeToasts, dismissToast, type ToastItem, type ToastVariant } from './toast'
import { HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineInformationCircle, HiOutlineXMark } from 'react-icons/hi2'

const ICONS: Record<ToastVariant, typeof HiOutlineCheckCircle> = {
  success: HiOutlineCheckCircle,
  error: HiOutlineExclamationCircle,
  info: HiOutlineInformationCircle,
}

const ACCENT_COLORS: Record<ToastVariant, string> = {
  success: '#4ade80',
  error: '#f87171',
  info: 'var(--text-white)',
}

// Renders every currently-active toast (see toast.ts). Mounted once near
// the root in App.tsx so it's available on every page — including the
// public Landing/Login/Signup routes, not just the authenticated app.
export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => subscribeToasts(setToasts), [])

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        width: 'min(360px, calc(100vw - 2.5rem))',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => {
        const Icon = ICONS[t.variant]
        const accent = ACCENT_COLORS[t.variant]
        return (
          <div
            key={t.id}
            className="glass-card"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              padding: '0.85rem 1rem',
              borderRadius: 18,
              pointerEvents: 'auto',
              animation: 'toast-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Icon size={20} style={{ color: accent, flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-white)', lineHeight: 1.45 }}>
              {t.message}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 2,
                marginTop: 1,
                display: 'flex',
                flexShrink: 0,
              }}
            >
              <HiOutlineXMark size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
