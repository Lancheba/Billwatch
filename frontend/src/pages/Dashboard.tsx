import { useQuery } from '@tanstack/react-query'
import { billsApi, type Bill } from '../api'
import {
  STATUS_COLORS, fmtCurrency, fmtDate, daysUntil, dueSoonBadge, hasPriceIncrease,
} from '../utils'

const CATEGORY_ICONS: Record<string, string> = {
  utility: '⚡',
  subscription: '📺',
  loan: '🏦',
  other: '📋',
}

function StatusBadge({ status }: { status: Bill['status'] }) {
  return (
    <span className={`badge ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  )
}

function BillRow({ bill }: { bill: Bill }) {
  const days = daysUntil(bill.due_date)
  const sooner = dueSoonBadge(bill)
  const priceUp = hasPriceIncrease(bill)

  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>{CATEGORY_ICONS[bill.category] ?? '📋'}</span>
          <div>
            <div style={{ fontWeight: 500 }}>{bill.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'capitalize' }}>
              {bill.category} · {bill.recurrence}
            </div>
          </div>
        </div>
      </td>
      <td>
        <div style={{ fontWeight: 600 }}>{fmtCurrency(bill.amount)}</div>
        {priceUp && (
          <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>
            ↑ was {fmtCurrency(bill.previous_amount)}
          </div>
        )}
      </td>
      <td>
        <div>{fmtDate(bill.due_date)}</div>
        {sooner && (
          <span
            className="badge"
            style={{
              marginTop: '0.25rem',
              background: days <= 2 ? '#fef2f2' : '#fefce8',
              color: days <= 2 ? '#b91c1c' : '#92400e',
              border: `1px solid ${days <= 2 ? '#fecaca' : '#fde68a'}`,
            }}
          >
            {sooner}
          </span>
        )}
      </td>
      <td><StatusBadge status={bill.status} /></td>
      <td style={{ color: '#64748b', fontSize: '0.8125rem' }}>
        {bill.last_used_date ? fmtDate(bill.last_used_date) : '—'}
      </td>
    </tr>
  )
}

export default function Dashboard() {
  const { data: bills = [], isLoading, error } = useQuery({
    queryKey: ['bills'],
    queryFn: billsApi.list,
  })

  const counts = {
    active: bills.filter(b => b.status === 'active').length,
    flagged: bills.filter(b => b.status === 'flagged').length,
    paid: bills.filter(b => b.status === 'paid').length,
    cancelled: bills.filter(b => b.status === 'cancelled').length,
  }

  const totalMonthly = bills
    .filter(b => b.status === 'active' && b.recurrence === 'monthly')
    .reduce((s, b) => s + Number(b.amount), 0)

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
      <div className="spinner" />
    </div>
  )

  if (error) return (
    <div className="card" style={{ color: '#dc2626' }}>
      ⚠️ Could not load bills. Is the Django server running on port 8000?
    </div>
  )

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Dashboard
      </h1>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Bills', value: bills.length, color: '#1e1b4b', bg: '#eef2ff' },
          { label: 'Active', value: counts.active, color: '#15803d', bg: '#f0fdf4' },
          { label: 'Flagged', value: counts.flagged, color: '#b91c1c', bg: '#fef2f2' },
          { label: 'Monthly spend', value: fmtCurrency(totalMonthly), color: '#1d4ed8', bg: '#eff6ff' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="card" style={{ background: bg, border: `1px solid ${bg}` }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Bills table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 600, fontSize: '1rem' }}>All Bills & Subscriptions</h2>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{bills.length} items</span>
        </div>
        {bills.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            No bills yet. <a href="/add" style={{ color: '#4f46e5' }}>Add your first bill →</a>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Bill / Subscription</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Last Used</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(b => <BillRow key={b.id} bill={b} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
