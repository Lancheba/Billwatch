import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { decisionsApi, type DecisionLog } from '../api'
import { fmtDate } from '../utils'
import { HiOutlineDocument, HiOutlineCheck, HiOutlineXMark } from 'react-icons/hi2'

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
    <div className="glass-card" style={{ color: '#ffffff' }}>
      Notice: Could not load activity log.
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HiOutlineDocument size={24} style={{ color: '#ffffff' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Agent Decision Audit Log
          </h1>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Transparent audit trail of every autonomous decision, structured factor signal, and user approval.
        </p>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1rem', margin: 0, color: '#ffffff' }}>Decisions & Actions</h2>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{logs.length} logged events</span>
        </div>

        {logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            No agent decisions logged yet. Click "Run AI Watcher" in the sidebar to trigger an autonomous review.
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
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="glass-pill" style={{ fontSize: '0.75rem' }}>
                        {log.agent_action.replace(/_/g, ' ')}
                      </span>
                      <strong style={{ fontSize: '1rem', color: '#ffffff' }}>{log.bill_name}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {log.user_decision && (
                        <span className="glass-pill" style={{ fontSize: '0.7rem' }}>
                          User: {log.user_decision}
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {fmtDate(log.created_at)}
                      </span>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 10, fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.5, whiteSpace: 'pre-wrap', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {log.reasoning}
                  </div>

                  {log.draft_content && (
                    <div style={{ background: 'rgba(0,0,0,0.5)', color: '#ffffff', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.75rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {log.draft_content}
                    </div>
                  )}

                  {isPending && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button
                        className="glass-pill glass-pill-active"
                        style={{ fontSize: '0.8125rem' }}
                        onClick={() => approveMutation.mutate(log.id)}
                      >
                        <HiOutlineCheck size={14} /> Approve Action
                      </button>
                      <button
                        className="glass-pill"
                        style={{ fontSize: '0.8125rem' }}
                        onClick={() => rejectMutation.mutate(log.id)}
                      >
                        <HiOutlineXMark size={14} /> Reject Action
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
