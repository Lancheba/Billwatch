import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { HiOutlineUser, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash, HiOutlineArrowRight, HiOutlineDocumentText } from 'react-icons/hi2'
import { FcGoogle } from 'react-icons/fc'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="auth-page">
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <div className="auth-blob auth-blob-3" />

      <form onSubmit={handleSubmit} className="auth-card">
        <div className="auth-logo">
          <HiOutlineDocumentText />
        </div>
        <div className="auth-title">Billwatch</div>
        <div className="auth-subtitle">Log in to your account</div>

        <div className="auth-field">
          <span className="auth-field-icon"><HiOutlineUser /></span>
          <label className="auth-label" htmlFor="username">Username</label>
          <input
            id="username"
            className="auth-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            autoComplete="username"
          />
        </div>

        <div className="auth-field">
          <span className="auth-field-icon"><HiOutlineLockClosed /></span>
          <label className="auth-label" htmlFor="password">Password</label>
          <input
            id="password"
            className="auth-input has-toggle"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="auth-field-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log In'}
          {!submitting && <HiOutlineArrowRight />}
        </button>

        <div className="auth-divider">or</div>

        <button type="button" className="auth-google">
          <FcGoogle size={18} />
          Sign up with Google
        </button>

        <div className="auth-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
      </form>
    </div>
  )
}
