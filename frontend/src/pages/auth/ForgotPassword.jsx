import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!email.trim()) { setError('Email is required.'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address.'); return }
    setLoading(true)
    try {
      // await authService.forgotPassword(email)
      await new Promise(r => setTimeout(r, 800))
      setSent(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div style={s.page}>
      <div style={s.logoRow}>
        <Scale size={30} color="var(--brand)" strokeWidth={1.8} />
        <span style={s.logoText}>SULAH</span>
      </div>

      <div style={s.card}>
        {!sent ? (
          <>
            <h1 style={s.title}>Forgot password?</h1>
            <p style={s.subtitle}>
              Enter your email and we'll send you instructions to reset your password
            </p>

            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                style={{ ...s.input, ...(error ? s.inputError : {}) }}
                onFocus={e => e.target.style.borderColor = 'var(--brand)'}
                onBlur={e => e.target.style.borderColor = error ? 'var(--error)' : 'var(--border)'}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              {error && <p style={s.errorText}>{error}</p>}
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ ...s.submitBtn, opacity: loading ? 0.75 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--brand-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand)' }}
            >
              <Mail size={18} color="white" />
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <button
              onClick={() => navigate('/auth/login')}
              style={s.backBtn}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <ArrowLeft size={16} />
              Back to login
            </button>
          </>
        ) : (
          <>
            <h1 style={s.title}>Check your email</h1>
            <p style={s.subtitle}>
              We've sent password reset instructions to your email
            </p>

            <div style={s.successBox}>
              <div style={s.successIconWrap}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
              </div>
              <p style={s.successText}>
                If an account exists for{' '}
                <strong style={s.emailHighlight}>{email}</strong>
                , you will receive an email with instructions to reset your password.
              </p>
            </div>

            <p style={s.resendText}>
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={() => { setSent(false); setEmail('') }}
                style={s.tryAgainBtn}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
              >
                try again
              </button>
            </p>

            <button
              onClick={() => navigate('/auth/login')}
              style={s.backBtn}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <ArrowLeft size={16} />
              Back to login
            </button>
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
        input::placeholder { color: var(--text-placeholder); }
        @media (max-width: 520px) {
          .forgot-card { padding: 1.5rem 1.25rem !important; margin: 0 1rem !important; }
        }
      `}</style>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-page)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2.5rem 1rem 3rem',
    fontFamily: "'DM Sans', sans-serif",
  },
  logoRow: {
    display: 'flex', alignItems: 'center',
    gap: '10px', marginBottom: '2rem',
  },
  logoText: {
    fontFamily: "'Sora', sans-serif",
    fontSize: '24px', fontWeight: '700',
    color: 'var(--text-primary)', letterSpacing: '0.08em',
  },
  card: {
    background: 'var(--bg-card)',
    borderRadius: '16px',
    border: '1px solid var(--border-card)',
    padding: '2.25rem 2.5rem',
    width: '100%', maxWidth: '520px',
    boxShadow: 'var(--shadow)',
  },
  title: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 'clamp(22px, 4vw, 26px)', fontWeight: '700',
    color: 'var(--text-primary)', marginBottom: '10px',
  },
  subtitle: {
    fontSize: '14px', color: 'var(--text-muted)',
    lineHeight: '1.65', marginBottom: '1.75rem',
  },
  field: { marginBottom: '1.25rem' },
  label: {
    display: 'block', fontSize: '13px', fontWeight: '500',
    color: 'var(--text-secondary)', marginBottom: '8px',
  },
  input: {
    width: '100%', padding: '13px 14px',
    border: '1.5px solid var(--border)',
    borderRadius: '10px', fontSize: '14px',
    fontFamily: "'DM Sans', sans-serif",
    color: 'var(--text-primary)',
    background: 'var(--bg-input)',
    outline: 'none', transition: 'border-color 0.15s',
  },
  inputError: { borderColor: 'var(--error)' },
  errorText: { fontSize: '12px', color: 'var(--error)', marginTop: '5px' },
  submitBtn: {
    width: '100%', padding: '13px',
    background: 'var(--brand)', color: '#fff',
    border: 'none', borderRadius: '10px',
    fontSize: '15px', fontFamily: "'Sora', sans-serif", fontWeight: '600',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '10px',
    transition: 'background 0.15s', marginBottom: '1.25rem',
  },
  backBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', width: '100%', background: 'none', border: 'none',
    fontSize: '14px', fontFamily: "'DM Sans', sans-serif", fontWeight: '500',
    color: 'var(--text-secondary)', cursor: 'pointer',
    padding: '6px 0', transition: 'color 0.15s',
  },
  successBox: {
    background: 'var(--success-bg)',
    borderRadius: '12px', padding: '1.75rem 1.5rem',
    textAlign: 'center', marginBottom: '1.25rem',
  },
  successIconWrap: {
    width: '56px', height: '56px', borderRadius: '50%',
    background: 'var(--success-icon-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 1rem',
  },
  successText: {
    fontSize: '14px', color: 'var(--text-secondary)',
    lineHeight: '1.65', textAlign: 'center',
  },
  emailHighlight: { color: 'var(--brand)', fontWeight: '600' },
  resendText: {
    fontSize: '13px', color: 'var(--text-muted)',
    textAlign: 'center', marginBottom: '1.25rem',
  },
  tryAgainBtn: {
    background: 'none', border: 'none',
    fontSize: '13px', fontFamily: "'DM Sans', sans-serif",
    fontWeight: '700', color: 'var(--text-primary)',
    cursor: 'pointer', padding: 0,
  },
}