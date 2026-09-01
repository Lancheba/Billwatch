import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billsApi, dashboardApi, decisionsApi } from '../api'
import { fmtCurrency } from '../utils'

export default function WhatIfSimulator() {
  const queryClient = useQueryClient()
  const [excludedIds, setExcludedIds] = useState<number[]>([])

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: billsApi.list,
  })

  const { data: simulation } = useQuery({
    queryKey: ['what-if-simulation', excludedIds],
    queryFn: () => dashboardApi.whatIf(excludedIds),
    enabled: true,
  })

  const toggleExclude = (id: number) => {
    setExcludedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectAllZombies = () => {
    const zombieIds = bills
      .filter(b => b.is_subscription && (!b.last_used_date || (new Date().getTime() - new Date(b.last_used_date).getTime()) > 45 * 86400000))
      .map(b => b.id)
    setExcludedIds(zombieIds)
  }

  const cancelSimulatedMutation = useMutation({
    mutationFn: async () => {
      for (const id of excludedIds) {
        const b = bills.find(x => x.id === id)
        if (b) {
          await decisionsApi.approve(id).catch(() => {})
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
      alert('Drafted cancellation workflows triggered for simulated exclusions!')
    },
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#1e1b4b' }}>
          🔮 Financial What-If Simulator
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Toggle subscriptions and bills on or off to simulate budget impact, monthly savings, and health score changes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Left Column: Bill Checklist */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Select Bills to Cancel / Exclude
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn"
                onClick={selectAllZombies}
                style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem' }}
              >
                Exclude Zombies
              </button>
              <button
                className="btn"
                onClick={() => setExcludedIds([])}
                style={{ background: '#f1f5f9', fontSize: '0.75rem' }}
              >
                Reset
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 520, overflowY: 'auto' }}>
            {bills.map(b => {
              const isExcluded = excludedIds.includes(b.id)
              return (
                <label
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 8,
                    background: isExcluded ? '#fee2e2' : '#f8fafc',
                    border: isExcluded ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={isExcluded}
                      onChange={() => toggleExclude(b.id)}
                      style={{ width: 18, height: 18 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, textDecoration: isExcluded ? 'line-through' : 'none', color: isExcluded ? '#991b1b' : '#1e293b' }}>
                        {b.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {b.category} · {b.recurrence} {b.is_subscription && '· 📺 Subscription'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: isExcluded ? '#dc2626' : '#1e293b' }}>
                    {fmtCurrency(b.amount)}
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Right Column: Real-time Simulation Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Savings Metric Card */}
          <div className="card" style={{ background: '#f0fdf4', border: '2px solid #86efac' }}>
            <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
              Simulated Savings ({excludedIds.length} bills excluded)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', margin: '0.75rem 0' }}>
              <div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#15803d' }}>
                  {fmtCurrency(simulation?.savings.monthly ?? '0.00')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#166534' }}>saved per month</div>
              </div>
              <div style={{ borderLeft: '1px solid #bbf7d0', paddingLeft: '1rem' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d' }}>
                  {fmtCurrency(simulation?.savings.annual ?? '0.00')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#166534' }}>saved per year ({simulation?.savings.pct_reduced ?? 0}% cut)</div>
              </div>
            </div>
          </div>

          {/* Budget Comparison Card */}
          {simulation && (
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>
                📊 Spend & Health Score Impact
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Commitments</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                    {fmtCurrency(simulation.baseline.monthly_total)}/mo
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                    Health Score: <strong>{simulation.baseline.health_score}</strong>
                  </div>
                </div>

                <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: 6, border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>Simulated Commitments</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1d4ed8' }}>
                    {fmtCurrency(simulation.simulated.monthly_total)}/mo
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: 4 }}>
                    New Score: <strong>{simulation.simulated.health_score}</strong> (+{simulation.simulated.health_score - simulation.baseline.health_score} pts)
                  </div>
                </div>
              </div>

              {/* Category Shift */}
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                Category Spend Shift
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(simulation.baseline.by_category).map(([cat, baseAmt]) => {
                  const simAmt = simulation.simulated.by_category[cat] || '0.00'
                  return (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ textTransform: 'capitalize' }}>{cat}</span>
                      <span>
                        <span style={{ textDecoration: baseAmt !== simAmt ? 'line-through' : 'none', color: '#94a3b8' }}>
                          {fmtCurrency(baseAmt)}
                        </span>
                        {' → '}
                        <strong style={{ color: baseAmt !== simAmt ? '#16a34a' : '#1e293b' }}>
                          {fmtCurrency(simAmt)}
                        </strong>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {excludedIds.length > 0 && (
            <button
              className="btn btn-primary"
              style={{ background: '#4f46e5', justifyContent: 'center', padding: '0.75rem' }}
              onClick={() => cancelSimulatedMutation.mutate()}
            >
              🚀 Act on Simulation: Draft Cancellations for {excludedIds.length} Bill(s)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
