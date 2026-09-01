import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import heroImg from '../assets/hero.png'

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI-powered monitoring',
    desc: 'An agent scans every bill and subscription on a schedule and decides what needs your attention — no manual review required.',
  },
  {
    icon: '📈',
    title: 'Catches price hikes',
    desc: 'Billwatch compares each charge against its previous amount and flags anything that quietly went up.',
  },
  {
    icon: '📺',
    title: 'Kills zombie subscriptions',
    desc: 'Tracks last-used dates on subscriptions and drafts cancellation notices for the ones you forgot about.',
  },
  {
    icon: '📝',
    title: 'Explains every decision',
    desc: 'Every agent action is logged with its reasoning — approve or reject drafted notifications with one click.',
  },
]

function Nav() {
  const { user } = useAuth()
  return (
    <nav
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 2rem', maxWidth: 1120, margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.35rem' }}>💳</span>
        <span style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1e1b4b', letterSpacing: '-0.02em' }}>
          Billwatch
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {user ? (
          <Link to="/dashboard" className="btn btn-primary">Go to Dashboard →</Link>
        ) : (
          <>
            <Link
              to="/login"
              style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569', textDecoration: 'none' }}
            >
              Log in
            </Link>
            <Link to="/signup" className="btn btn-primary">Try Demo</Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default function Landing() {
  const { user } = useAuth()

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Nav />

      {/* Hero */}
      <section
        style={{
          maxWidth: 1120, margin: '0 auto', padding: '3rem 2rem 4rem',
          display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '3rem', alignItems: 'center',
        }}
      >
        <div>
          <span
            className="badge"
            style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #e0e7ff', marginBottom: '1.25rem' }}
          >
            🤖 Agent-driven bill review
          </span>
          <h1
            style={{
              fontSize: '2.75rem', fontWeight: 800, lineHeight: 1.1,
              color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '1.25rem',
            }}
          >
            Never miss a price hike or a zombie subscription again.
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem', maxWidth: 480 }}>
            Billwatch watches your bills and subscriptions for you. An AI agent flags anomalies,
            drafts cancellations for unused subscriptions, and explains every decision it makes —
            you just approve or reject.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link
              to={user ? '/dashboard' : '/signup'}
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.9375rem' }}
            >
              {user ? 'Go to Dashboard →' : 'Try the Demo →'}
            </Link>
            {!user && (
              <Link
                to="/login"
                className="btn btn-ghost"
                style={{ padding: '0.75rem 1.5rem', fontSize: '0.9375rem' }}
              >
                Log In
              </Link>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '0.75rem', overflow: 'hidden' }}>
          <img
            src={heroImg}
            alt="Billwatch dashboard preview"
            style={{ width: '100%', display: 'block', borderRadius: '0.5rem' }}
          />
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '1rem 2rem 4rem' }}>
        <h2
          style={{
            textAlign: 'center', fontSize: '1.5rem', fontWeight: 700,
            color: '#0f172a', marginBottom: '2rem',
          }}
        >
          How it watches your money
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem' }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card">
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.375rem', color: '#0f172a' }}>
                {f.title}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section
        style={{
          background: '#1e1b4b', color: 'white', padding: '3rem 2rem',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Ready to see what's quietly draining your bank account?
        </h2>
        <p style={{ color: '#a5b4fc', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
          Set up takes under a minute — no credit card, this is a demo account.
        </p>
        <Link
          to={user ? '/dashboard' : '/signup'}
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.75rem', fontSize: '0.9375rem', background: '#4f46e5' }}
        >
          {user ? 'Go to Dashboard →' : 'Get Started Free →'}
        </Link>
      </section>

      <footer style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
        Billwatch — an AI-powered bill watcher. Built for demo purposes.
      </footer>
    </div>
  )
}
