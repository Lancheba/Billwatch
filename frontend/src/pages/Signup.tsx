import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signup(username, email, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: Record<string, string[]> } }
      const detail = anyErr?.response?.data
      if (detail) {
        const firstField = Object.keys(detail)[0]
        setError(`${firstField}: ${detail[firstField][0]}`)
      } else {
        setError('Could not create account. Please try again.')
      }
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
            Create your account
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

        <div className="form-group" style={{ marginBottom: '0.875rem' }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
          {submitting ? 'Creating account…' : 'Sign Up'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#64748b', marginTop: '1rem' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </form>
    </div>
  )
}
