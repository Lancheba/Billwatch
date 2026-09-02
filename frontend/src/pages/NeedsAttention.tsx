import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insightsApi, decisionsApi } from '../api'
import { fmtDate } from '../utils'
import { HiOutlineExclamationTriangle, HiOutlineCheck, HiOutlineXMark, HiOutlineEnvelope } from 'react-icons/hi2'

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HiOutlineExclamationTriangle size={24} style={{ color: 'var(--text-white)' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-white)', letterSpacing: '-0.02em' }}>
            Needs Attention & AI Insights
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Actionable alerts: zombie subscriptions, anomalous spikes, price surges, and pending agent decisions.
        </p>
      </div>

      {/* Priority Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: `All Alerts (${counts.all})` },
          { key: 'critical', label: `Critical (${counts.critical})` },
          { key: 'important', label: `Important (${counts.important})` },
          { key: 'recommendation', label: `Recommendations (${counts.recommendation})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedPriority(tab.key)}
            className={`glass-pill ${selectedPriority === tab.key ? 'glass-pill-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pending Agent Decision Logs Review */}
      {pendingDecisions.length > 0 && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(var(--surface-rgb), 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <HiOutlineExclamationTriangle size={20} style={{ color: 'var(--text-white)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-white)' }}>
              Pending Human-in-the-Loop Reviews ({pendingDecisions.length})
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingDecisions.map(d => (
              <div key={d.id} className="glass-card" style={{ padding: '1rem', background: 'rgba(var(--surface-rgb), 0.025)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-white)' }}>{d.bill_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Action: {d.agent_action}</div>
                  </div>
                  <span className="glass-pill" style={{ fontSize: '0.7rem' }}>
                    Requires Approval
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-silver)', margin: '0.5rem 0' }}>
                  {d.reasoning}
                </p>
                {d.draft_content && (
                  <pre style={{ background: 'rgba(0, 0, 0, 0.4)', color: 'var(--text-white)', padding: '0.75rem', borderRadius: 8, fontSize: '0.75rem', whiteSpace: 'pre-wrap', border: '1px solid rgba(var(--surface-rgb),0.1)' }}>
                    {d.draft_content}
                  </pre>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    className="glass-pill glass-pill-active"
                    onClick={() => approveMutation.mutate(d.id)}
                  >
                    <HiOutlineCheck size={14} /> Approve
                  </button>
                  <button
                    className="glass-pill"
                    onClick={() => rejectMutation.mutate(d.id)}
                  >
                    <HiOutlineXMark size={14} /> Reject
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
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-white)', marginBottom: '0.25rem' }}>No Action Items Required</div>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>
            All subscriptions and bills are healthy and reviewed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredInsights.map(insight => (
            <div
              key={insight.id}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="glass-pill" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    {insight.priority}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-white)' }}>
                    {insight.title}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {fmtDate(insight.created_at)}
                </span>
              </div>

              <p style={{ margin: 0, color: 'var(--text-silver)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {insight.message}
              </p>

              {/* Payload metadata badges */}
              {insight.payload && Object.keys(insight.payload).length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {insight.payload.annual_savings && (
                    <span className="glass-pill" style={{ fontSize: '0.75rem' }}>
                      Annual Savings: ${insight.payload.annual_savings}/yr
                    </span>
                  )}
                  {insight.payload.idle_days && (
                    <span className="glass-pill" style={{ fontSize: '0.75rem' }}>
                      Inactive: {insight.payload.idle_days} days
                    </span>
                  )}
                  {insight.payload.pct_change && (
                    <span className="glass-pill" style={{ fontSize: '0.75rem' }}>
                      Surge: +{insight.payload.pct_change}%
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                {insight.insight_type === 'zombie' && (
                  <button
                    className="glass-pill glass-pill-active"
                    style={{ fontSize: '0.8125rem' }}
                    onClick={() => actMutation.mutate({ id: insight.id, action_type: 'draft_cancellation' })}
                  >
                    <HiOutlineEnvelope size={14} /> Draft Cancellation Email
                  </button>
                )}
                <button
                  className="glass-pill"
                  style={{ fontSize: '0.8125rem' }}
                  onClick={() => dismissMutation.mutate(insight.id)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
