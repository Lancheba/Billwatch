import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi, type BillBrief } from '../api'
import { fmtCurrency, fmtDate } from '../utils'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function FinancialCalendar() {
  const today = new Date()
  const [year, setYear] = useState<number>(today.getFullYear())
  const [month, setMonth] = useState<number>(today.getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['financial-calendar', year, month],
    queryFn: () => dashboardApi.calendar(year, month),
  })

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear(y => y - 1)
    } else {
      setMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear(y => y + 1)
    } else {
      setMonth(m => m + 1)
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayIndex = new Date(year, month - 1, 1).getDay()

  const dayCards = []
  for (let i = 0; i < firstDayIndex; i++) {
    dayCards.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    dayCards.push(dayStr)
  }

  const selectedBills = (selectedDay && data?.days[selectedDay]) ? data.days[selectedDay] : []

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#1e1b4b' }}>
            📅 Smart Financial Calendar
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
            Track payment spikes, daily totals, and upcoming bill due dates across the month.
          </p>
        </div>

        {/* Month Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn" onClick={prevMonth} style={{ background: '#f1f5f9' }}>
            ◀
          </button>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', minWidth: 160, textAlign: 'center' }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button className="btn" onClick={nextMonth} style={{ background: '#f1f5f9' }}>
            ▶
          </button>
        </div>
      </div>

      {/* Month Rollup Summary */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>MONTHLY TOTAL DUE</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e3a8a' }}>
              {fmtCurrency(data.month_total)}
            </div>
          </div>
          {data.highest_expense_day && (
            <div className="card" style={{ background: '#fffbeb', border: '1px solid #fef08a' }}>
              <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>PEAK EXPENSE DAY</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309' }}>
                {fmtDate(data.highest_expense_day)} ({fmtCurrency(data.day_totals[data.highest_expense_day])})
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="card" style={{ padding: '1rem' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '0.8125rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, paddingTop: 6 }}>
            {dayCards.map((dayStr, idx) => {
              if (!dayStr) {
                return <div key={`empty-${idx}`} style={{ minHeight: 90, background: '#f8fafc', borderRadius: 6 }} />
              }
              const dayNum = parseInt(dayStr.split('-')[2], 10)
              const bills = data?.days[dayStr] || []
              const total = data?.day_totals[dayStr]
              const isPeak = data?.highest_expense_day === dayStr && bills.length > 0
              const isSelected = selectedDay === dayStr

              return (
                <div
                  key={dayStr}
                  onClick={() => setSelectedDay(dayStr)}
                  style={{
                    minHeight: 90,
                    padding: '0.4rem',
                    borderRadius: 6,
                    background: isSelected ? '#e0e7ff' : isPeak ? '#fef3c7' : bills.length > 0 ? '#f0fdf4' : '#ffffff',
                    border: isSelected ? '2px solid #4f46e5' : isPeak ? '1px solid #fde68a' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isSelected ? '#3730a3' : '#1e293b' }}>
                      {dayNum}
                    </span>
                    {total && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d' }}>
                        {fmtCurrency(total)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                    {bills.slice(0, 2).map(b => (
                      <div
                        key={b.id}
                        style={{
                          fontSize: '0.65rem',
                          background: 'white',
                          padding: '1px 4px',
                          borderRadius: 3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          border: '1px solid #e2e8f0',
                          fontWeight: 500,
                        }}
                      >
                        {b.name}
                      </div>
                    ))}
                    {bills.length > 2 && (
                      <div style={{ fontSize: '0.65rem', color: '#64748b', textAlign: 'center' }}>
                        +{bills.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected Day Bills Drawer */}
      {selectedDay && (
        <div className="card" style={{ marginTop: '1.5rem', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e1b4b' }}>
              Bills Due on {fmtDate(selectedDay)}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              ✕ Close
            </button>
          </div>
          {selectedBills.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No bills due on this date.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {selectedBills.map((b: BillBrief) => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.75rem 1rem', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.category} · {b.recurrence}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e293b' }}>
                    {fmtCurrency(b.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
