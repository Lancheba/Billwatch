import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import {
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineArrowRight,
  HiOutlineDocumentText,
} from 'react-icons/hi2'
import { FcGoogle } from 'react-icons/fc'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

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
    <div className="auth-page">
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <div className="auth-blob auth-blob-3" />

      <form onSubmit={handleSubmit} className="auth-card">
        <div className="auth-logo">
          <HiOutlineDocumentText />
        </div>
        <div className="auth-title">Billwatch</div>
        <div className="auth-subtitle">Create your account</div>

        <div className="auth-field">
          <span className="auth-field-icon"><HiOutlineUser /></span>
          <label className="auth-label" htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            className="auth-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoFocus
            autoComplete="name"
          />
        </div>

        <div className="auth-field">
          <span className="auth-field-icon"><HiOutlineEnvelope /></span>
          <label className="auth-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <span className="auth-field-icon"><HiOutlineUser /></span>
          <label className="auth-label" htmlFor="username">Username</label>
          <input
            id="username"
            className="auth-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
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
            autoComplete="new-password"
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

        <div className="auth-field">
          <span className="auth-field-icon"><HiOutlineLockClosed /></span>
          <label className="auth-label" htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            className="auth-input has-toggle"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            className="auth-field-toggle"
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showConfirmPassword ? <HiOutlineEyeSlash /> : <HiOutlineEye />}
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create Account'}
          {!submitting && <HiOutlineArrowRight />}
        </button>

        <div className="auth-divider">or</div>

        <button type="button" className="auth-google">
          <FcGoogle size={18} />
          Sign up with Google
        </button>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </form>
    </div>
  )
}
