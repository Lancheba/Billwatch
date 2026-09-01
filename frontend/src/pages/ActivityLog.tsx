import { useQuery } from '@tanstack/react-query'
import { decisionsApi, type DecisionLog } from '../api'
import { ACTION_COLORS, ACTION_LABELS, fmtDateTime } from '../utils'

const ACTION_ICONS: Record<string, string> = {
  auto_handled: '✓',
  flagged_for_review: '⚑',
  drafted_notification: '🔔',
  drafted_cancellation: '✉️',
}

const DECISION_ICON: Record<string, string> = {
  approved: '✅',
  rejected: '❌',
  pending: '⏳',
}

function LogRow({ log }: { log: DecisionLog }) {
  const isAuto = log.agent_action === 'auto_handled'
  return (
    <div style={{
      display: 'flex', gap: '1rem', padding: '0.875rem 1.25rem',
      borderBottom: '1px solid #f1f5f9',
      background: isAuto ? 'white' : '#fffbeb',
    }}>
      {/* Timeline dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
          background: isAuto ? '#f0fdf4' : '#fef3c7',
          border: `2px solid ${isAuto ? '#bbf7d0' : '#fcd34d'}`,
        }}>
          {ACTION_ICONS[log.agent_action]}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.bill_name}</span>
          <span className={`badge ${ACTION_COLORS[log.agent_action]}`}>
            {ACTION_LABELS[log.agent_action]}
          </span>
          {log.user_decision && log.user_decision !== 'pending' && (
            <span style={{ fontSize: '0.8rem' }}>
              {DECISION_ICON[log.user_decision]} {log.user_decision}
            </span>
          )}
          {log.user_decision === 'pending' && !isAuto && (
            <span className="badge" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
              ⏳ pending review
            </span>
          )}
        </div>

        <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
          {log.reasoning}
        </p>

        {log.draft_content && (
          <details style={{ marginTop: '0.4rem' }}>
            <summary style={{ fontSize: '0.75rem', color: '#7c3aed', cursor: 'pointer', userSelect: 'none' }}>
              View drafted message
            </summary>
            <pre style={{
              marginTop: '0.4rem', padding: '0.75rem', background: '#f8f7ff',
              border: '1px solid #ddd6fe', borderRadius: '0.5rem',
              whiteSpace: 'pre-wrap', fontSize: '0.75rem', fontFamily: 'inherit',
              color: '#1e1b4b',
            }}>
              {log.draft_content}
            </pre>
          </details>
        )}
      </div>

      {/* Timestamp */}
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0, alignSelf: 'flex-start' }}>
        {fmtDateTime(log.created_at)}
      </div>
    </div>
  )
}

export default function ActivityLog() {
  const { data: logs = [], isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['decisions'],
    queryFn: decisionsApi.list,
    refetchInterval: 8_000,
  })

  const autoCount = logs.filter(l => l.agent_action === 'auto_handled').length
  const flaggedCount = logs.filter(l => l.agent_action !== 'auto_handled').length

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
      <div className="spinner" />
    </div>
  )
  if (error) return (
    <div className="card" style={{ color: '#dc2626' }}>⚠️ Could not load activity log.</div>
  )

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Agent Activity Log</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Every decision the agent made — auto-handled and flagged. Proof it's an agent, not a form.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem 1.25rem' }}>
          <span style={{ fontSize: '1.25rem' }}>✓</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#15803d' }}>{autoCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Auto-handled quietly</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem 1.25rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⚑</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#b45309' }}>{flaggedCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Surfaced for review</div>
          </div>
        </div>
        {dataUpdatedAt > 0 && (
          <div style={{ alignSelf: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
            Refreshing every 8s · last: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Log feed */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>Decision Feed</h2>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{logs.length} entries</span>
        </div>

        {logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🤖</div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No agent runs yet</div>
            <div style={{ fontSize: '0.875rem' }}>
              Hit <strong>Run Agent</strong> in the sidebar to start.
            </div>
          </div>
        ) : (
          logs.map(l => <LogRow key={l.id} log={l} />)
        )}
      </div>
    </div>
  )
}
