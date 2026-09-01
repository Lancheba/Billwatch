import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch {
      setError('Invalid username or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
      }}
    >
      <form onSubmit={handleSubmit} className="card" style={{ width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#1e1b4b' }}>
            💳 Billwatch
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 4 }}>
            Log in to your account
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '0.875rem' }}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <div style={{ color: '#dc2626', fontSize: '0.8125rem', marginBottom: '0.875rem' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={submitting}
        >
          {submitting ? 'Logging in…' : 'Log In'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#64748b', marginTop: '1rem' }}>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
      </form>
    </div>
  )
}
