import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../api'

// Real React Icons & Brand Icons
import { SiNetflix, SiSpotify } from 'react-icons/si'
import { 
  HiOutlineCreditCard, 
  HiOutlineDocumentText, 
  HiOutlineBell, 
  HiOutlineAdjustmentsHorizontal,
  HiOutlineLightBulb,
  HiOutlineShieldCheck,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineSparkles,
  HiOutlineTv,
  HiOutlineBriefcase,
  HiOutlineMusicalNote,
  HiOutlineCloud,
  HiOutlineEllipsisHorizontal,
  HiOutlineArrowTrendingUp,
  HiOutlineHome,
  HiOutlineClock
} from 'react-icons/hi2'
import { RiStackLine } from 'react-icons/ri'

export default function Dashboard() {
  const [selectedMonth] = useState('September 2026')
  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.summary(7),
    meta: { errorMessage: 'Failed to load dashboard summary.' },
  })

  // Format currency in Indian Rupee format matching the design
  const formatInr = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    if (isNaN(num)) return '₹0'
    return '₹' + Math.round(num).toLocaleString('en-IN')
  }

  // Values matching design with real data fallbacks
  const monthlyTotal = summary?.monthly_commitments ? parseFloat(summary.monthly_commitments.total) : 18450
  const totalSpend = monthlyTotal > 0 ? monthlyTotal : 18450

  const subTotal = 4299
  const billsTotal = 11151
  const emiTotal = 3000

  const healthScore = summary?.financial_health?.score ?? 74

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: 0, color: 'var(--text-white)', letterSpacing: '-0.02em' }}>
            Good morning, Arjun
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Here's what's happening with your finances today.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="glass-icon-btn" title="Notifications">
            <HiOutlineBell size={18} />
          </button>
          <button className="glass-icon-btn" title="Filter & View Settings">
            <HiOutlineAdjustmentsHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Row 1: Top 4 KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {/* Total Monthly Spending */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Total Monthly Spending
            </div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(var(--surface-rgb),0.06)', border: '1px solid rgba(var(--surface-rgb),0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-white)' }}>
              <HiOutlineCreditCard size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-white)', margin: '0.625rem 0 0.25rem', letterSpacing: '-0.02em' }}>
            {formatInr(totalSpend)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>↑ 12% vs last month</span>
          </div>
        </div>

        {/* Subscriptions */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Subscriptions
            </div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(var(--surface-rgb),0.06)', border: '1px solid rgba(var(--surface-rgb),0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-white)' }}>
              <RiStackLine size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-white)', margin: '0.625rem 0 0.25rem', letterSpacing: '-0.02em' }}>
            {formatInr(subTotal)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            ↑ 8% vs last month
          </div>
        </div>

        {/* Bills */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Bills
            </div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(var(--surface-rgb),0.06)', border: '1px solid rgba(var(--surface-rgb),0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-white)' }}>
              <HiOutlineDocumentText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-white)', margin: '0.625rem 0 0.25rem', letterSpacing: '-0.02em' }}>
            {formatInr(billsTotal)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            ↑ 15% vs last month
          </div>
        </div>

        {/* EMIs */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              EMIs
            </div>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(var(--surface-rgb),0.06)', border: '1px solid rgba(var(--surface-rgb),0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-white)' }}>
              <HiOutlineCreditCard size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-white)', margin: '0.625rem 0 0.25rem', letterSpacing: '-0.02em' }}>
            {formatInr(emiTotal)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            No change
          </div>
        </div>
      </div>

      {/* Row 2: Spending Overview & Upcoming Payments */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        {/* Spending Overview Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-white)' }}>
                Spending Overview
              </h2>
            </div>
            <button className="glass-pill" style={{ fontSize: '0.75rem' }}>
              This Month ▾
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem', alignItems: 'center' }}>
            {/* Left: Wave / Spline Chart */}
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Spending</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: 2 }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-white)', letterSpacing: '-0.02em' }}>
                    {formatInr(totalSpend)}
                  </span>
                  <span className="glass-pill" style={{ padding: '2px 8px', fontSize: '0.7rem', color: 'var(--text-white)' }}>
                    vs last month ↑ 12%
                  </span>
                </div>
              </div>

              {/* Glowing SVG Wave Chart */}
              <div style={{ position: 'relative', width: '100%', height: 130 }}>
                <svg viewBox="0 0 320 120" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--text-white)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--text-white)" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="30" y1="20" x2="310" y2="20" stroke="rgba(var(--surface-rgb),0.05)" strokeDasharray="3 3" />
                  <line x1="30" y1="55" x2="310" y2="55" stroke="rgba(var(--surface-rgb),0.05)" strokeDasharray="3 3" />
                  <line x1="30" y1="90" x2="310" y2="90" stroke="rgba(var(--surface-rgb),0.05)" strokeDasharray="3 3" />

                  {/* Y Axis Labels */}
                  <text x="5" y="24" fill="var(--text-muted)" fontSize="8">₹20K</text>
                  <text x="5" y="59" fill="var(--text-muted)" fontSize="8">₹10K</text>
                  <text x="5" y="94" fill="var(--text-muted)" fontSize="8">₹0</text>

                  {/* Area Fill */}
                  <path
                    d="M 40 85 C 80 80, 110 50, 150 55 C 190 60, 230 30, 270 35 C 290 38, 305 45, 305 45 L 305 95 L 40 95 Z"
                    fill="url(#areaGrad)"
                  />

                  {/* Spline Stroke */}
                  <path
                    d="M 40 85 C 80 80, 110 50, 150 55 C 190 60, 230 30, 270 35 C 290 38, 305 45, 305 45"
                    fill="none"
                    stroke="var(--text-white)"
                    strokeWidth="2.5"
                    filter="url(#glow)"
                  />

                  {/* Nodes */}
                  <circle cx="40" cy="85" r="3.5" fill="var(--text-white)" stroke="var(--bg-deep)" strokeWidth="2" />
                  <circle cx="150" cy="55" r="3.5" fill="var(--text-white)" stroke="var(--bg-deep)" strokeWidth="2" />
                  <circle cx="270" cy="35" r="3.5" fill="var(--text-white)" stroke="var(--bg-deep)" strokeWidth="2" />
                  <circle cx="305" cy="45" r="4.5" fill="var(--text-white)" filter="url(#glow)" />

                  {/* Month X Labels */}
                  <text x="40" y="112" fill="var(--text-secondary)" fontSize="9" textAnchor="middle">May</text>
                  <text x="105" y="112" fill="var(--text-secondary)" fontSize="9" textAnchor="middle">Jun</text>
                  <text x="170" y="112" fill="var(--text-secondary)" fontSize="9" textAnchor="middle">Jul</text>
                  <text x="235" y="112" fill="var(--text-secondary)" fontSize="9" textAnchor="middle">Aug</text>
                  <text x="300" y="112" fill="var(--text-white)" fontWeight="700" fontSize="9" textAnchor="middle">Sep</text>
                </svg>
              </div>
            </div>

            {/* Right: Donut Chart & Category Breakdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              {/* Monochromatic Donut */}
              <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(var(--surface-rgb),0.06)" strokeWidth="12" />
                  {/* Bills Segment 60% */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="var(--text-white)" strokeWidth="12" strokeDasharray="143 238" strokeDashoffset="0" />
                  {/* Subscriptions Segment 23% */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(var(--surface-rgb),0.5)" strokeWidth="12" strokeDasharray="55 238" strokeDashoffset="-143" />
                  {/* EMIs Segment 17% */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(var(--surface-rgb),0.2)" strokeWidth="12" strokeDasharray="40 238" strokeDashoffset="-198" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-white)' }}>{formatInr(totalSpend)}</div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>Total</div>
                </div>
              </div>

              {/* Legend List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--invert-solid)' }} />
                  <span style={{ color: 'var(--text-silver)' }}>Bills: <strong>₹11,151 (60%)</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(var(--surface-rgb),0.5)' }} />
                  <span style={{ color: 'var(--text-silver)' }}>Subscriptions: <strong>₹4,299 (23%)</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(var(--surface-rgb),0.25)' }} />
                  <span style={{ color: 'var(--text-silver)' }}>EMIs: <strong>₹3,000 (17%)</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(var(--surface-rgb),0.1)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Others: <strong>₹2,000 (11%)</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Payments Card with Real Brand Icons */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-white)' }}>
              Upcoming Payments
            </h2>
            <Link to="/calendar" className="glass-pill" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}>
              View All
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {[
              { icon: SiNetflix, name: 'Netflix', type: 'Subscription', date: '05 Sep', amount: '₹649', days: '2 days' },
              { icon: HiOutlineLightBulb, name: 'Electricity Bill', type: 'Bill', date: '08 Sep', amount: '₹1,450', days: '5 days' },
              { icon: SiSpotify, name: 'Spotify', type: 'Subscription', date: '12 Sep', amount: '₹119', days: '9 days' },
              { icon: HiOutlineShieldCheck, name: 'Insurance Premium', type: 'Bill', date: '15 Sep', amount: '₹2,300', days: '12 days' },
            ].map((item, idx) => {
              const IconComponent = item.icon
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 16,
                    background: 'rgba(var(--surface-rgb), 0.025)',
                    border: '1px solid rgba(var(--surface-rgb), 0.07)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: 'rgba(var(--surface-rgb), 0.08)',
                        border: '1px solid rgba(var(--surface-rgb), 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-white)',
                      }}
                    >
                      <IconComponent size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-white)' }}>{item.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.type}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.date}</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-white)' }}>{item.amount}</div>
                    </div>
                    <span
                      className="glass-pill"
                      style={{
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.7rem',
                        background: 'rgba(var(--surface-rgb), 0.08)',
                        color: 'var(--text-white)',
                        border: '1px solid rgba(var(--surface-rgb), 0.2)',
                      }}
                    >
                      {item.days}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Subscription Breakdown, Spending Trend & AI Insight */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
        {/* Subscription Breakdown */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-white)' }}>
              Subscription Breakdown
            </h3>
            <button className="glass-pill" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
              This Month ▾
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              { icon: HiOutlineTv, name: 'Entertainment', amount: '₹2,248 (52%)', pct: 52 },
              { icon: HiOutlineBriefcase, name: 'Productivity', amount: '₹799 (18%)', pct: 18 },
              { icon: HiOutlineMusicalNote, name: 'Music', amount: '₹599 (14%)', pct: 14 },
              { icon: HiOutlineCloud, name: 'Cloud', amount: '₹299 (7%)', pct: 7 },
              { icon: HiOutlineEllipsisHorizontal, name: 'Others', amount: '₹354 (9%)', pct: 9 },
            ].map((cat, i) => {
              const CatIcon = cat.icon
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-silver)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CatIcon size={14} /> {cat.name}
                    </span>
                    <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>{cat.amount}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(var(--surface-rgb),0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${cat.pct}%`, height: '100%', background: 'var(--invert-solid)', borderRadius: 2 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Spending Trend (Bar Chart) */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-white)' }}>
              Spending Trend
            </h3>
            <button className="glass-pill" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
              This Year ▾
            </button>
          </div>

          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-white)', letterSpacing: '-0.02em' }}>
              ₹1,82,450
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Total spent in 2026
            </div>
          </div>

          {/* Vertical Bar Chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 95, paddingTop: '0.5rem' }}>
            {[
              { m: 'Jan', h: 35 },
              { m: 'Feb', h: 45 },
              { m: 'Mar', h: 30 },
              { m: 'Apr', h: 55 },
              { m: 'May', h: 70 },
              { m: 'Jun', h: 60 },
              { m: 'Jul', h: 75 },
              { m: 'Aug', h: 65 },
              { m: 'Sep', h: 90, active: true },
            ].map((bar, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 14,
                    height: bar.h,
                    borderRadius: 7,
                    background: bar.active ? 'var(--invert-solid)' : 'rgba(var(--surface-rgb), 0.2)',
                    boxShadow: bar.active ? '0 0 12px rgba(var(--surface-rgb),0.6)' : 'none',
                    transition: 'all 0.2s',
                  }}
                />
                <span style={{ fontSize: '0.65rem', color: bar.active ? 'var(--text-white)' : 'var(--text-muted)', fontWeight: bar.active ? 700 : 400 }}>
                  {bar.m}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insight Card with 3D Glass Droplet */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <HiOutlineSparkles size={18} style={{ color: 'var(--text-white)' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-white)' }}>
                AI Insight
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-white)', margin: '0 0 0.4rem', lineHeight: 1.4 }}>
              You could save ₹1,850 every month.
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              We found 3 subscriptions you don't use often and 2 cheaper alternatives.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <Link
              to="/attention"
              className="glass-pill"
              style={{
                fontSize: '0.75rem',
                background: 'rgba(var(--surface-rgb), 0.08)',
                color: 'var(--text-white)',
                borderColor: 'rgba(var(--surface-rgb), 0.25)',
              }}
            >
              View Recommendations
            </Link>

            {/* 3D Liquid Orb SVG */}
            <div style={{ width: 50, height: 50 }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                <defs>
                  <radialGradient id="orbGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="var(--text-white)" stopOpacity="0.8" />
                    <stop offset="40%" stopColor="var(--text-white)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="var(--text-white)" stopOpacity="0.0" />
                  </radialGradient>
                  <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--text-white)" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="var(--text-white)" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="42" fill="url(#orbGrad)" stroke="url(#ringGrad)" strokeWidth="2.5" />
                <path d="M 30 50 Q 50 25 70 50 Q 50 75 30 50" fill="none" stroke="var(--text-white)" strokeWidth="1.5" strokeOpacity="0.6" />
                <ellipse cx="40" cy="35" rx="8" ry="4" fill="var(--text-white)" opacity="0.6" transform="rotate(-30 40 35)" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Financial Health Score & Mini Calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        {/* Financial Health Score Banner */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {/* Radial Progress Ring */}
          <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(var(--surface-rgb),0.08)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="var(--text-white)"
                strokeWidth="8"
                strokeDasharray="251"
                strokeDashoffset={251 - (251 * healthScore) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-white)' }}>{healthScore}</div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>/100</div>
            </div>
          </div>

          {/* Description & Status Chips */}
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-white)' }}>
              Financial Health Score
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 0.85rem', lineHeight: 1.4 }}>
              You're doing good! Keep tracking your bills and avoid late payments to improve your score.
            </p>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {[
                { icon: HiOutlineArrowTrendingUp, label: 'Payment Behavior', val: 'Good' },
                { icon: HiOutlineHome, label: 'Spending Trend', val: 'Attention' },
                { icon: HiOutlineBriefcase, label: 'Subscription Health', val: 'Good' },
                { icon: HiOutlineClock, label: 'Upcoming Load', val: 'Moderate' },
              ].map((chip, i) => {
                const ChipIcon = chip.icon
                return (
                  <div
                    key={i}
                    className="glass-pill"
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      background: 'rgba(var(--surface-rgb), 0.04)',
                      border: '1px solid rgba(var(--surface-rgb), 0.1)',
                    }}
                  >
                    <ChipIcon size={14} style={{ color: 'var(--text-white)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{chip.label}</span>
                    <strong style={{ color: 'var(--text-white)' }}>{chip.val}</strong>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* September 2026 Mini Calendar */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-white)' }}>
              {selectedMonth}
            </h3>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button className="glass-icon-btn" style={{ width: 28, height: 28 }}>
                <HiOutlineChevronLeft size={14} />
              </button>
              <button className="glass-icon-btn" style={{ width: 28, height: 28 }}>
                <HiOutlineChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.4rem' }}>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
            <div>SUN</div>
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', fontSize: '0.75rem' }}>
            <div style={{ color: 'var(--text-dim)', padding: '4px 0' }}>31</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>1</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>2</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>3</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>4</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--invert-solid)', color: 'var(--invert-text)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                5
              </span>
            </div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>6</div>

            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>7</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(var(--surface-rgb),0.15)', color: 'var(--text-white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                8
              </span>
            </div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>9</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>10</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>11</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>12</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>13</div>

            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>14</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--invert-solid)', color: 'var(--invert-text)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                15
              </span>
            </div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>16</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>17</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>18</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>19</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>20</div>

            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>21</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>22</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>23</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>24</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>25</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>26</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>27</div>

            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>28</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>29</div>
            <div style={{ color: 'var(--text-silver)', padding: '4px 0' }}>30</div>
            <div style={{ color: 'var(--text-dim)', padding: '4px 0' }}>1</div>
            <div style={{ color: 'var(--text-dim)', padding: '4px 0' }}>2</div>
            <div style={{ color: 'var(--text-dim)', padding: '4px 0' }}>3</div>
            <div style={{ color: 'var(--text-dim)', padding: '4px 0' }}>4</div>
          </div>
        </div>
      </div>
    </div>
  )
}
