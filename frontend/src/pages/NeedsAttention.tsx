import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insightsApi, decisionsApi } from '../api'
import { fmtDate } from '../utils'

const PRIORITY_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  critical: { label: 'CRITICAL', bg: '#fee2e2', text: '#b91c1c' },
  important: { label: 'IMPORTANT', bg: '#fef3c7', text: '#b45309' },
  insight: { label: 'INSIGHT', bg: '#e0e7ff', text: '#3730a3' },
  recommendation: { label: 'RECOMMENDATION', bg: '#dcfce7', text: '#15803d' },
}

export default function NeedsAttention() {
  const queryClient = useQueryClient()
  const [selectedPriority, setSelectedPriority] = useState<string>('all')

  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: () => insightsApi.list(),
  })

  const { data: decisions = [] } = useQuery({
    queryKey: ['decisions'],
    queryFn: decisionsApi.list,
  })

  const dismissMutation = useMutation({
    mutationFn: (id: number) => insightsApi.dismiss(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insights'] }),
  })

  const actMutation = useMutation({
    mutationFn: ({ id, action_type }: { id: number; action_type: string }) =>
      insightsApi.act(id, action_type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights'] })
      queryClient.invalidateQueries({ queryKey: ['decisions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => decisionsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decisions'] })
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: number) => decisionsApi.reject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decisions'] }),
  })

  const pendingDecisions = decisions.filter(d => d.user_decision === 'pending')
  const filteredInsights = selectedPriority === 'all'
    ? insights
    : insights.filter(i => i.priority === selectedPriority)

  const counts = {
    all: insights.length,
    critical: insights.filter(i => i.priority === 'critical').length,
    important: insights.filter(i => i.priority === 'important').length,
    recommendation: insights.filter(i => i.priority === 'recommendation').length,
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#1e1b4b' }}>
          🚨 Needs Attention & AI Insights
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Actionable alerts: zombie subscriptions, anomalous spikes, price surges, and pending agent decisions.
        </p>
      </div>

      {/* Priority Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: `All Alerts (${counts.all})` },
          { key: 'critical', label: `🔴 Critical (${counts.critical})` },
          { key: 'important', label: `🟠 Important (${counts.important})` },
          { key: 'recommendation', label: `🟢 Recommendations (${counts.recommendation})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedPriority(tab.key)}
            className="btn"
            style={{
              background: selectedPriority === tab.key ? '#4f46e5' : '#f1f5f9',
              color: selectedPriority === tab.key ? 'white' : '#475569',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pending Agent Decision Logs Review */}
      {pendingDecisions.length > 0 && (
        <div className="card" style={{ background: '#fffbeb', border: '1px solid #fde68a', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#92400e' }}>
              Pending Human-in-the-Loop Reviews ({pendingDecisions.length})
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingDecisions.map(d => (
              <div key={d.id} style={{ background: 'white', padding: '1rem', borderRadius: 8, border: '1px solid #fef08a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{d.bill_name}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Action: {d.agent_action}</div>
                  </div>
                  <span className="badge" style={{ background: '#fef3c7', color: '#b45309' }}>
                    Requires Approval
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#334155', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
                  {d.reasoning}
                </p>
                {d.draft_content && (
                  <pre style={{ background: '#1e1b4b', color: '#e0e7ff', padding: '0.75rem', borderRadius: 6, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                    {d.draft_content}
                  </pre>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ background: '#16a34a' }}
                    onClick={() => approveMutation.mutate(d.id)}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="btn"
                    style={{ background: '#fee2e2', color: '#b91c1c' }}
                    onClick={() => rejectMutation.mutate(d.id)}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights List */}
      {insightsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>No Action Items!</div>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
            All subscriptions and bills are healthy and reviewed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredInsights.map(insight => {
            const badge = PRIORITY_BADGES[insight.priority] ?? PRIORITY_BADGES.insight
            return (
              <div
                key={insight.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${badge.text}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        background: badge.bg,
                        color: badge.text,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        textTransform: 'uppercase',
                        marginRight: '0.5rem',
                      }}
                    >
                      {badge.label}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e293b' }}>
                      {insight.title}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {fmtDate(insight.created_at)}
                  </span>
                </div>

                <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {insight.message}
                </p>

                {/* Payload metadata badges */}
                {insight.payload && Object.keys(insight.payload).length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {insight.payload.annual_savings && (
                      <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                        💰 Annual Waste: ${insight.payload.annual_savings}/yr
                      </span>
                    )}
                    {insight.payload.idle_days && (
                      <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                        ⏳ Inactive: {insight.payload.idle_days} days
                      </span>
                    )}
                    {insight.payload.pct_change && (
                      <span className="badge" style={{ background: '#fce7f3', color: '#9d174d' }}>
                        📈 Surge: +{insight.payload.pct_change}%
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {insight.insight_type === 'zombie' && (
                    <button
                      className="btn btn-primary"
                      style={{ background: '#dc2626', fontSize: '0.8125rem' }}
                      onClick={() => actMutation.mutate({ id: insight.id, action_type: 'draft_cancellation' })}
                    >
                      ✉️ Draft Cancellation Email
                    </button>
                  )}
                  <button
                    className="btn"
                    style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.8125rem' }}
                    onClick={() => dismissMutation.mutate(insight.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
