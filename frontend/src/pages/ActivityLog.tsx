import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { decisionsApi, type DecisionLog } from '../api'
import { fmtDate } from '../utils'

const ACTION_COLORS: Record<string, string> = {
  auto_handled: 'badge-active',
  flagged_for_review: 'badge-flagged',
  drafted_notification: 'badge-paid',
  drafted_cancellation: 'badge-cancelled',
}

export default function ActivityLog() {
  const queryClient = useQueryClient()

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['decisions'],
    queryFn: decisionsApi.list,
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => decisionsApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decisions'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: number) => decisionsApi.reject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decisions'] }),
  })

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
      <div className="spinner" />
    </div>
  )

  if (error) return (
    <div className="card" style={{ color: '#dc2626' }}>
      ⚠️ Could not load activity log.
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#1e1b4b' }}>
          🤖 Explainable Agent Decision Audit Log
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Transparent audit trail of every autonomous decision, structured factor signal, and user approval.
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>Decisions & Actions</h2>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{logs.length} logged events</span>
        </div>

        {logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            No agent decisions logged yet. Click "Run Agent" in the sidebar to trigger an autonomous review.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.map((log: DecisionLog) => {
              const isPending = log.user_decision === 'pending'
              return (
                <div
                  key={log.id}
                  style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    background: isPending ? '#fffdf5' : '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`badge ${ACTION_COLORS[log.agent_action] ?? ''}`}>
                        {log.agent_action.replace(/_/g, ' ')}
                      </span>
                      <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{log.bill_name}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {log.user_decision && (
                        <span
                          className="badge"
                          style={{
                            background: log.user_decision === 'approved' ? '#dcfce7' : log.user_decision === 'rejected' ? '#fee2e2' : '#fef3c7',
                            color: log.user_decision === 'approved' ? '#15803d' : log.user_decision === 'rejected' ? '#b91c1c' : '#b45309',
                            fontWeight: 600,
                          }}
                        >
                          User: {log.user_decision}
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {fmtDate(log.created_at)}
                      </span>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6, fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {log.reasoning}
                  </div>

                  {log.draft_content && (
                    <div style={{ background: '#1e1b4b', color: '#c7d2fe', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      {log.draft_content}
                    </div>
                  )}

                  {isPending && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button
                        className="btn btn-primary"
                        style={{ background: '#16a34a', fontSize: '0.8125rem' }}
                        onClick={() => approveMutation.mutate(log.id)}
                      >
                        ✓ Approve Action
                      </button>
                      <button
                        className="btn"
                        style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '0.8125rem' }}
                        onClick={() => rejectMutation.mutate(log.id)}
                      >
                        ✕ Reject Action
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
