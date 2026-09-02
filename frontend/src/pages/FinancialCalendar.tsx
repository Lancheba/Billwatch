import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi, type BillBrief } from '../api'
import { fmtCurrency, fmtDate } from '../utils'
import { HiOutlineCalendar, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineXMark } from 'react-icons/hi2'

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
    meta: { errorMessage: 'Failed to load the financial calendar.' },
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HiOutlineCalendar size={24} style={{ color: 'var(--text-white)' }} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-white)', letterSpacing: '-0.02em' }}>
              Financial Calendar
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
            Track payment spikes, daily totals, and upcoming bill due dates across the month.
          </p>
        </div>

        {/* Month Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="glass-icon-btn" onClick={prevMonth} style={{ width: 36, height: 36 }}>
            <HiOutlineChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', minWidth: 160, textAlign: 'center', color: 'var(--text-white)' }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button className="glass-icon-btn" onClick={nextMonth} style={{ width: 36, height: 36 }}>
            <HiOutlineChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Month Rollup Summary */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MONTHLY TOTAL DUE</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-white)', marginTop: 4 }}>
              {fmtCurrency(data.month_total)}
            </div>
          </div>
          {data.highest_expense_day && (
            <div className="glass-card">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PEAK EXPENSE DAY</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-white)', marginTop: 4 }}>
                {fmtDate(data.highest_expense_day)} ({fmtCurrency(data.day_totals[data.highest_expense_day])})
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(var(--surface-rgb),0.06)' }}>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
          <div>SUN</div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, paddingTop: 8 }}>
            {dayCards.map((dayStr, idx) => {
              if (!dayStr) {
                return <div key={`empty-${idx}`} style={{ minHeight: 90, background: 'rgba(var(--surface-rgb),0.01)', borderRadius: 12 }} />
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
                    padding: '0.5rem',
                    borderRadius: 14,
                    background: isSelected ? 'rgba(var(--surface-rgb), 0.15)' : isPeak ? 'rgba(var(--surface-rgb), 0.08)' : bills.length > 0 ? 'rgba(var(--surface-rgb), 0.04)' : 'rgba(var(--surface-rgb), 0.02)',
                    border: isSelected ? '1.5px solid var(--text-white)' : '1px solid rgba(var(--surface-rgb),0.08)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isSelected ? 'var(--text-white)' : 'var(--text-silver)' }}>
                      {dayNum}
                    </span>
                    {total && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-white)' }}>
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
                          background: 'rgba(var(--surface-rgb),0.06)',
                          color: 'var(--text-white)',
                          padding: '1px 5px',
                          borderRadius: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          border: '1px solid rgba(var(--surface-rgb),0.1)',
                          fontWeight: 500,
                        }}
                      >
                        {b.name}
                      </div>
                    ))}
                    {bills.length > 2 && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
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
        <div className="glass-card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-white)' }}>
              Bills Due on {fmtDate(selectedDay)}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="glass-icon-btn"
              style={{ width: 32, height: 32 }}
            >
              <HiOutlineXMark size={16} />
            </button>
          </div>
          {selectedBills.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No bills due on this date.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {selectedBills.map((b: BillBrief) => (
                <div key={b.id} className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{b.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.category} · {b.recurrence}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-white)' }}>
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
