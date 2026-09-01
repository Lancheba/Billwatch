import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useState } from 'react'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ProtectedRoute from './pages/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import NeedsAttention from './pages/NeedsAttention'
import FinancialCalendar from './pages/FinancialCalendar'
import WhatIfSimulator from './pages/WhatIfSimulator'
import AIAssistantChat from './pages/AIAssistantChat'
import ScanIngest from './pages/ScanIngest'
import ActivityLog from './pages/ActivityLog'
import AddBill from './pages/AddBill'
import { agentApi, billsApi } from './api'
import { AuthProvider, useAuth } from './AuthContext'

// React Icons
import { IoWaterOutline } from 'react-icons/io5'
import { 
  HiOutlineHome, 
  HiOutlineDocumentText, 
  HiOutlineRefresh, 
  HiOutlineCalendar, 
  HiOutlineCreditCard, 
  HiOutlineChartBar, 
  HiOutlineSparkles, 
  HiOutlineDocumentReport, 
  HiOutlineCog,
  HiOutlineUser,
  HiOutlineChevronDown,
  HiOutlinePlay
} from 'react-icons/hi'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
})

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome, end: true },
  { to: '/add', label: 'Bills', icon: HiOutlineDocumentText },
  { to: '/attention', label: 'Subscriptions', icon: HiOutlineRefresh },
  { to: '/calendar', label: 'Calendar', icon: HiOutlineCalendar },
  { to: '/simulator', label: 'Payments', icon: HiOutlineCreditCard },
  { to: '/analytics', label: 'Analytics', icon: HiOutlineChartBar },
  { to: '/chat', label: 'AI Insights', icon: HiOutlineSparkles },
  { to: '/log', label: 'Reports', icon: HiOutlineDocumentReport },
  { to: '/settings', label: 'Settings', icon: HiOutlineCog },
]

function AppLayout() {
  const { user, logout } = useAuth()
  const [running, setRunning] = useState(false)
  const [runMsg, setRunMsg] = useState<string | null>(null)

  const handleRun = async () => {
    setRunning(true)
    setRunMsg(null)
    try {
      await billsApi.detectRecurring().catch(() => {})
      await billsApi.detectZombies().catch(() => {})
      await billsApi.detectAnomalies().catch(() => {})
      const data = await agentApi.run(7)
      setRunMsg(data.message ?? 'Agent started!')
      setTimeout(() => queryClient.invalidateQueries(), 2000)
    } catch {
      setRunMsg('Failed to start agent. Is the Django server running?')
    } finally {
      setRunning(false)
      setTimeout(() => setRunMsg(null), 6000)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', padding: '1.25rem', gap: '1.25rem', maxWidth: 1600, margin: '0 auto' }}>
      {/* Liquid Glass Sidebar */}
      <aside
        className="glass-card"
        style={{
          width: 240,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.75rem 1rem',
          flexShrink: 0,
          borderRadius: 36,
          height: 'calc(100vh - 2.5rem)',
          position: 'sticky',
          top: '1.25rem',
        }}
      >
        {/* Brand Logo with Droplet Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0 0.75rem 1.75rem' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, rgba(255,255,255,0.4) 60%, rgba(255,255,255,0.1) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(255,255,255,0.4)',
              color: '#000000',
            }}
          >
            <IoWaterOutline size={20} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
            BillWatch
          </span>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} style={{ width: 22, textAlign: 'center', flexShrink: 0 }} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Agent Run Action Pill */}
        <div style={{ marginTop: '0.75rem', marginBottom: '1rem' }}>
          <button
            onClick={handleRun}
            disabled={running}
            className="glass-pill"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.65rem 1rem',
              background: 'rgba(255, 255, 255, 0.08)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <HiOutlinePlay size={14} />
            <span>{running ? 'Running...' : 'Run AI Watcher'}</span>
          </button>
          {runMsg && (
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4, textAlign: 'center' }}>
              {runMsg}
            </div>
          )}
        </div>

        {/* User Profile Pill Card */}
        <div
          className="glass-pill"
          style={{
            padding: '0.6rem 0.85rem',
            width: '100%',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 9999,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', overflow: 'hidden' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <HiOutlineUser size={16} />
            </div>
            <div style={{ overflow: 'hidden', textAlign: 'left' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.username ? (user.username.charAt(0).toUpperCase() + user.username.slice(1)) : 'Arjun Kumar'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email || 'arjun@example.com'}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px 4px',
            }}
          >
            <HiOutlineChevronDown size={16} />
          </button>
        </div>
      </aside>

      {/* Main Glass Workspace */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attention" element={<NeedsAttention />} />
          <Route path="/calendar" element={<FinancialCalendar />} />
          <Route path="/simulator" element={<WhatIfSimulator />} />
          <Route path="/chat" element={<AIAssistantChat />} />
          <Route path="/scan" element={<ScanIngest />} />
          <Route path="/log" element={<ActivityLog />} />
          <Route path="/add" element={<AddBill />} />
          <Route path="/analytics" element={<Dashboard />} />
          <Route path="/settings" element={<ActivityLog />} />
        </Routes>
      </main>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
