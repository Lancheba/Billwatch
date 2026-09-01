import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useState } from 'react'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ProtectedRoute from './pages/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import NeedsAttention from './pages/NeedsAttention'
import ActivityLog from './pages/ActivityLog'
import AddBill from './pages/AddBill'
import { agentApi } from './api'
import { AuthProvider, useAuth } from './AuthContext'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
})

const NAV_LINKS = [
  { to: '/dashboard', label: '📊 Dashboard', end: true },
  { to: '/attention', label: '🚨 Needs Attention' },
  { to: '/log', label: '🤖 Agent Log' },
  { to: '/add', label: '➕ Add Bill' },
]

function AppLayout() {
  const { user, logout } = useAuth()
  const [running, setRunning] = useState(false)
  const [runMsg, setRunMsg] = useState<string | null>(null)

  const handleRun = async () => {
    setRunning(true)
    setRunMsg(null)
    try {
      const data = await agentApi.run(7)
      setRunMsg(data.message ?? 'Agent started!')
      // Invalidate queries so UI refreshes after agent logs decisions
      setTimeout(() => queryClient.invalidateQueries(), 3000)
    } catch {
      setRunMsg('Failed to start agent. Is the Django server running?')
    } finally {
      setRunning(false)
      setTimeout(() => setRunMsg(null), 6000)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{
        width: 220, background: '#1e1b4b', color: 'white',
        display: 'flex', flexDirection: 'column', padding: '1.5rem 0',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid #312e81' }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
            💳 Billwatch
          </div>
          <div style={{ fontSize: '0.7rem', color: '#a5b4fc', marginTop: 2 }}>
            AI-powered bill watcher
          </div>
        </div>

        <div style={{ flex: 1, padding: '1rem 0' }}>
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to} to={to} end={end}
              style={({ isActive }) => ({
                display: 'block', padding: '0.625rem 1.25rem',
                textDecoration: 'none', fontSize: '0.875rem',
                color: isActive ? 'white' : '#c7d2fe',
                background: isActive ? '#4338ca' : 'transparent',
                borderLeft: isActive ? '3px solid #818cf8' : '3px solid transparent',
                fontWeight: isActive ? 600 : 400,
              })}
            >
              {label}
            </NavLink>
          ))}
        </div>

        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #312e81' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', background: '#4f46e5' }}
            onClick={handleRun}
            disabled={running}
          >
            {running ? '⏳ Running…' : '▶ Run Agent'}
          </button>
          {runMsg && (
            <div style={{
              marginTop: '0.5rem', fontSize: '0.7rem', color: '#a5b4fc',
              lineHeight: 1.4,
            }}>
              {runMsg}
            </div>
          )}
        </div>

        <div style={{
          padding: '1rem 1.25rem 0', marginTop: '0.5rem', borderTop: '1px solid #312e81',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: '0.75rem', color: '#c7d2fe' }}>
            👤 {user?.username}
          </div>
          <button
            onClick={logout}
            style={{
              background: 'none', border: 'none', color: '#a5b4fc',
              fontSize: '0.75rem', cursor: 'pointer', padding: '0.25rem 0.5rem',
            }}
          >
            Log out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, overflowX: 'auto', padding: '2rem' }}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attention" element={<NeedsAttention />} />
          <Route path="/log" element={<ActivityLog />} />
          <Route path="/add" element={<AddBill />} />
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
