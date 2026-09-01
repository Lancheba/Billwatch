import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dashboardApi, type BillBrief } from '../api'
import { STATUS_COLORS, fmtCurrency, fmtDate, daysUntil, dueSoonBadge } from '../utils'

const CATEGORY_ICONS: Record<string, string> = {
  utility: '⚡',
  subscription: '📺',
  loan: '🏦',
  other: '📋',
}

export default function Dashboard() {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.summary(7),
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="card" style={{ color: '#dc2626' }}>
        ⚠️ Could not load dashboard summary. Make sure the backend server is running.
      </div>
    )
  }

  const health = summary.financial_health
  const commitments = summary.monthly_commitments
  const savings = summary.potential_savings
  const increases = summary.price_increases
  const forecast = summary.next_30_days

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Top Banner / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#1e1b4b' }}>
            Financial Overview
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            AI-driven bill aggregation, zombie detector, and cashflow forecast.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/simulator" className="btn" style={{ background: '#e0e7ff', color: '#3730a3' }}>
            🔮 What-If Simulator
          </Link>
          <Link to="/chat" className="btn btn-primary" style={{ background: '#4f46e5' }}>
            💬 Ask AI Assistant
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Monthly Commitments */}
        <div className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>
            Monthly Commitments
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e3a8a', margin: '0.5rem 0' }}>
            {fmtCurrency(commitments.total)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
            Normalized across all recurring cycles
          </div>
        </div>

        {/* Financial Health Score */}
        <div className="card" style={{ background: '#f8fafc', border: `2px solid ${health.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase' }}>
              Health & Risk Score
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', background: health.color, padding: '2px 8px', borderRadius: 12 }}>
              Grade {health.grade}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '0.5rem 0' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: health.color }}>
              {health.score}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>/ 100 ({health.rating})</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {health.factors.length} risk factor(s) evaluated
          </div>
        </div>

        {/* Savings Engine / Zombie Waste */}
        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 600, textTransform: 'uppercase' }}>
            Potential Savings
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#b91c1c', margin: '0.5rem 0' }}>
            {fmtCurrency(savings.annual)}
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#dc2626' }}>/yr</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
            {savings.zombie_count} inactive zombie subscription(s) detected
          </div>
        </div>

        {/* 30-Day Cashflow Need */}
        <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
            30-Day Cashflow Need
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d', margin: '0.5rem 0' }}>
            {fmtCurrency(forecast.total)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>
            Expected total outflow in next 30 days
          </div>
        </div>
      </div>

      {/* Row 2: Price Increases & Health Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Price Increases Alert Card */}
        <div className="card" style={{ border: increases.count > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0', background: increases.count > 0 ? '#fffbeb' : '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#92400e' }}>
              📈 Price Increase Detection
            </h2>
            <span className="badge" style={{ background: '#fef3c7', color: '#b45309' }}>
              {increases.count} detected
            </span>
          </div>
          {increases.count === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              ✓ No recent price increases detected. All bills match baseline.
            </p>
          ) : (
            <div>
              <p style={{ fontSize: '0.8125rem', color: '#78350f', marginBottom: '0.75rem' }}>
                Impact: <strong>+{fmtCurrency(increases.monthly_impact)}/mo</strong> across {increases.count} bill(s).
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {increases.bills.map(b => (
                  <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.5rem 0.75rem', borderRadius: 6, border: '1px solid #fef08a' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{b.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        was {fmtCurrency(b.previous_amount)} → now {fmtCurrency(b.amount)}
                      </div>
                    </div>
                    <span className="badge" style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                      +{b.pct_change}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Category Breakdown Card */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1e293b' }}>
            📊 Category Commitments
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(commitments.by_category).map(([cat, amt]) => {
              const num = parseFloat(amt)
              const total = parseFloat(commitments.total) || 1
              const pct = Math.round((num / total) * 100)
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                      {CATEGORY_ICONS[cat] ?? '📋'} {cat}
                    </span>
                    <span style={{ fontWeight: 600 }}>{fmtCurrency(amt)} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#4f46e5', borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Due Soon Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0, color: '#1e1b4b' }}>
              🗓️ Due in Next 7 Days
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Immediate cashflow obligations
            </span>
          </div>
          <Link to="/calendar" style={{ fontSize: '0.8125rem', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
            View Full Calendar →
          </Link>
        </div>
        {summary.due_soon.bills.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
            🎉 No bills due within the next 7 days!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Bill / Merchant</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Recurrence</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.due_soon.bills.map((b: BillBrief) => {
                  const days = daysUntil(b.due_date)
                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{CATEGORY_ICONS[b.category] ?? '📋'}</span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{b.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.merchant || b.category}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{fmtCurrency(b.amount)}</td>
                      <td>
                        <div>{fmtDate(b.due_date)}</div>
                        <span className="badge" style={{ background: days <= 2 ? '#fee2e2' : '#fef3c7', color: days <= 2 ? '#b91c1c' : '#92400e' }}>
                          {dueSoonBadge(b as any) || `${days} days left`}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize', color: '#475569' }}>{b.recurrence}</td>
                      <td>
                        <span className={`badge ${STATUS_COLORS[b.status ?? 'active']}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
