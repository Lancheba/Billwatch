import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { decisionsApi, type DecisionLog } from '../api'
import { ACTION_COLORS, ACTION_LABELS, fmtDateTime } from '../utils'
import { useState } from 'react'

function DecisionCard({ log }: { log: DecisionLog }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)

  const approveMut = useMutation({
    mutationFn: () => decisionsApi.approve(log.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decisions'] }),
  })
  const rejectMut = useMutation({
    mutationFn: () => decisionsApi.reject(log.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decisions'] }),
  })

  const isPending = log.user_decision === 'pending'
  const isApproved = log.user_decision === 'approved'
  const isRejected = log.user_decision === 'rejected'

  return (
    <div className="card" style={{ marginBottom: '1rem', border: '1px solid #fcd34d' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>{log.bill_name}</span>
            <span className={`badge ${ACTION_COLORS[log.agent_action]}`}>
              {ACTION_LABELS[log.agent_action]}
            </span>
            {isApproved && <span className="badge bg-green-100 text-green-800">✓ Approved</span>}
            {isRejected && <span className="badge bg-gray-100 text-gray-500">✗ Rejected</span>}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            {fmtDateTime(log.created_at)}
          </div>
        </div>

        {/* Approve / Reject buttons */}
        {isPending && (
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button
              className="btn btn-success"
              onClick={() => approveMut.mutate()}
              disabled={approveMut.isPending}
            >
              {approveMut.isPending ? '…' : '✓ Approve'}
            </button>
            <button
              className="btn btn-danger"
              onClick={() => rejectMut.mutate()}
              disabled={rejectMut.isPending}
            >
              {rejectMut.isPending ? '…' : '✗ Reject'}
            </button>
          </div>
        )}
      </div>

      {/* Reasoning */}
      <div style={{
        marginTop: '0.75rem', padding: '0.75rem', background: '#f8fafc',
        borderRadius: '0.5rem', fontSize: '0.875rem', color: '#334155',
      }}>
        <strong>Agent reasoning:</strong> {log.reasoning}
      </div>

      {/* Draft content */}
      {log.draft_content && (
        <div style={{ marginTop: '0.75rem' }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.8125rem' }}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? '▲ Hide draft' : '▼ Show drafted message'}
          </button>
          {expanded && (
            <pre style={{
              marginTop: '0.5rem', padding: '1rem', background: '#f1f5f9',
              borderRadius: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.8125rem',
              color: '#1e293b', border: '1px solid #e2e8f0', fontFamily: 'inherit',
            }}>
              {log.draft_content}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export default function NeedsAttention() {
  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['decisions'],
    queryFn: decisionsApi.list,
    refetchInterval: 10_000,
  })

  const flagged = logs.filter(
    l => l.agent_action !== 'auto_handled'
  )
  const pending = flagged.filter(l => l.user_decision === 'pending')
  const resolved = flagged.filter(l => l.user_decision !== 'pending')

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
      <div className="spinner" />
    </div>
  )
  if (error) return (
    <div className="card" style={{ color: '#dc2626' }}>
      ⚠️ Could not load decisions.
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Needs Your Attention</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Review and approve or reject the agent's drafted actions.
          </p>
        </div>
        {pending.length > 0 && (
          <span className="badge" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: '0.875rem' }}>
            {pending.length} pending
          </span>
        )}
      </div>

      {flagged.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>All clear!</div>
          <div style={{ fontSize: '0.875rem' }}>
            No bills need attention right now. Hit <strong>Run Agent</strong> to check for updates.
          </div>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem', color: '#b91c1c' }}>
                ⚠️ Awaiting your decision ({pending.length})
              </h2>
              {pending.map(l => <DecisionCard key={l.id} log={l} />)}
            </section>
          )}

          {resolved.length > 0 && (
            <section>
              <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.75rem', color: '#64748b' }}>
                Previously resolved ({resolved.length})
              </h2>
              {resolved.map(l => <DecisionCard key={l.id} log={l} />)}
            </section>
          )}
        </>
      )}
    </div>
  )
}
