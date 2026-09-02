import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billsApi, dashboardApi, decisionsApi } from '../api'
import { fmtCurrency } from '../utils'
import { HiOutlineSparkles, HiOutlineArrowTrendingUp } from 'react-icons/hi2'

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HiOutlineSparkles size={24} style={{ color: 'var(--text-white)' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-white)', letterSpacing: '-0.02em' }}>
            Financial What-If Simulator
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
          Toggle subscriptions and bills on or off to simulate budget impact, monthly savings, and health score changes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* Left Column: Bill Checklist */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-white)' }}>
              Select Bills to Cancel / Exclude
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="glass-pill"
                onClick={selectAllZombies}
                style={{ fontSize: '0.75rem' }}
              >
                Exclude Zombies
              </button>
              <button
                className="glass-pill"
                onClick={() => setExcludedIds([])}
                style={{ fontSize: '0.75rem' }}
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
                    borderRadius: 14,
                    background: isExcluded ? 'rgba(var(--surface-rgb), 0.08)' : 'rgba(var(--surface-rgb), 0.025)',
                    border: isExcluded ? '1px solid rgba(var(--surface-rgb), 0.3)' : '1px solid rgba(var(--surface-rgb), 0.07)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={isExcluded}
                      onChange={() => toggleExclude(b.id)}
                      style={{ width: 18, height: 18, accentColor: 'var(--invert-solid)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, textDecoration: isExcluded ? 'line-through' : 'none', color: isExcluded ? 'var(--text-secondary)' : 'var(--text-white)' }}>
                        {b.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {b.category} · {b.recurrence}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: isExcluded ? 'var(--text-secondary)' : 'var(--text-white)' }}>
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
          <div className="glass-card" style={{ borderColor: 'rgba(var(--surface-rgb), 0.3)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Simulated Savings ({excludedIds.length} bills excluded)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', margin: '0.75rem 0' }}>
              <div>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-white)' }}>
                  {fmtCurrency(simulation?.savings.monthly ?? '0.00')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>saved per month</div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(var(--surface-rgb),0.1)', paddingLeft: '1rem' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-white)' }}>
                  {fmtCurrency(simulation?.savings.annual ?? '0.00')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>saved per year ({simulation?.savings.pct_reduced ?? 0}% cut)</div>
              </div>
            </div>
          </div>

          {/* Budget Comparison Card */}
          {simulation && (
            <div className="glass-card">
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-white)' }}>
                Spend & Health Score Impact
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(var(--surface-rgb),0.02)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Commitments</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-white)' }}>
                    {fmtCurrency(simulation.baseline.monthly_total)}/mo
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    Health Score: <strong>{simulation.baseline.health_score}</strong>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(var(--surface-rgb),0.08)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-white)' }}>Simulated Commitments</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-white)' }}>
                    {fmtCurrency(simulation.simulated.monthly_total)}/mo
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-white)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <HiOutlineArrowTrendingUp size={14} />
                    <span>New Score: <strong>{simulation.simulated.health_score}</strong> (+{simulation.simulated.health_score - simulation.baseline.health_score} pts)</span>
                  </div>
                </div>
              </div>

              {/* Category Shift */}
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-silver)', marginBottom: '0.5rem' }}>
                Category Spend Shift
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(simulation.baseline.by_category).map(([cat, baseAmt]) => {
                  const simAmt = simulation.simulated.by_category[cat] || '0.00'
                  return (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ textTransform: 'capitalize', color: 'var(--text-silver)' }}>{cat}</span>
                      <span>
                        <span style={{ textDecoration: baseAmt !== simAmt ? 'line-through' : 'none', color: 'var(--text-muted)' }}>
                          {fmtCurrency(baseAmt)}
                        </span>
                        {' → '}
                        <strong style={{ color: 'var(--text-white)' }}>
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
              className="glass-pill glass-pill-active"
              style={{ justifyContent: 'center', padding: '0.85rem', width: '100%', fontSize: '0.9rem' }}
              onClick={() => cancelSimulatedMutation.mutate()}
            >
              Draft Cancellations for {excludedIds.length} Bill(s)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
