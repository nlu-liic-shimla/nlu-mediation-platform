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
      await new Promise(r => setTimeout(r, 800))
      setSent(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }

        .fp {
          min-height: 100vh;
          background: var(--bg-page);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
          font-family: 'DM Sans', sans-serif;
        }
        .fp-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 2rem; }
        .fp-logo-text { font-family: 'Sora', sans-serif; font-size: 24px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.08em; }
        .fp-card { background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-card); padding: 2.5rem; width: 100%; max-width: 480px; box-shadow: var(--shadow); }
        .fp-title { font-family: 'Sora', sans-serif; font-size: clamp(22px, 4vw, 26px); font-weight: 700; color: var(--text-primary); margin-bottom: 10px; }
        .fp-sub { font-size: 14px; color: var(--text-muted); line-height: 1.65; margin-bottom: 1.75rem; }
        .fp-field { margin-bottom: 1.25rem; }
        .fp-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px; }
        .fp-input { width: 100%; padding: 13px 15px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: var(--text-primary); background: var(--bg-input); outline: none; transition: border-color 0.15s; }
        .fp-input:focus { border-color: var(--brand); }
        .fp-input.err { border-color: var(--error); }
        .fp-err-text { font-size: 12px; color: var(--error); margin-top: 5px; }
        .fp-btn { width: 100%; padding: 14px; background: var(--brand); color: #fff; border: none; border-radius: 11px; font-size: 15px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background 0.15s; margin-bottom: 1rem; }
        .fp-btn:hover:not(:disabled) { background: var(--brand-hover); }
        .fp-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .fp-back { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: none; border: none; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; color: var(--text-secondary); cursor: pointer; padding: 8px 0; transition: color 0.15s; }
        .fp-back:hover { color: var(--brand); }
        .fp-success-box { background: var(--success-bg); border-radius: 14px; padding: 2rem 1.5rem; text-align: center; margin-bottom: 1.25rem; }
        .fp-success-icon { width: 60px; height: 60px; border-radius: 50%; background: var(--success-icon-bg); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
        .fp-success-text { font-size: 14px; color: var(--text-secondary); line-height: 1.65; }
        .fp-highlight { color: var(--brand); font-weight: 600; }
        .fp-resend { font-size: 13px; color: var(--text-muted); text-align: center; margin-bottom: 1.25rem; line-height: 1.6; }
        .fp-try-again { background: none; border: none; font-size: 13px; font-family: 'DM Sans', sans-serif; font-weight: 700; color: var(--text-primary); cursor: pointer; padding: 0; text-decoration: underline; }

        @media (max-width: 520px) {
          .fp { justify-content: center; padding: 1.5rem 1.25rem; }
          .fp-logo { justify-content: center; }
          .fp-card { border-radius: 16px; padding: 1.75rem 1.25rem; }
        }
      `}</style>

      <div className="fp">
        <div className="fp-logo">
          <Scale size={30} color="var(--brand)" strokeWidth={1.8} />
          <span className="fp-logo-text">SULAH</span>
        </div>

        <div className="fp-card">
          {!sent ? (
            <>
              <h1 className="fp-title">Forgot password?</h1>
              <p className="fp-sub">Enter your email and we'll send you instructions to reset your password</p>
              <div className="fp-field">
                <label className="fp-label">Email</label>
                <input type="email" placeholder="name@example.com" value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  className={`fp-input${error ? ' err' : ''}`}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                {error && <p className="fp-err-text">{error}</p>}
              </div>
              <button className="fp-btn" onClick={handleSubmit} disabled={loading}>
                <Mail size={18} color="white" />
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <button className="fp-back" onClick={() => navigate('/auth/login')}>
                <ArrowLeft size={16} /> Back to login
              </button>
            </>
          ) : (
            <>
              <h1 className="fp-title">Check your email</h1>
              <p className="fp-sub">We've sent password reset instructions to your email</p>
              <div className="fp-success-box">
                <div className="fp-success-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
                  </svg>
                </div>
                <p className="fp-success-text">
                  If an account exists for <strong className="fp-highlight">{email}</strong>, you will receive an email with instructions to reset your password.
                </p>
              </div>
              <p className="fp-resend">
                Didn't receive the email? Check your spam folder or{' '}
                <button className="fp-try-again" onClick={() => { setSent(false); setEmail('') }}>try again</button>
              </p>
              <button className="fp-back" onClick={() => navigate('/auth/login')}>
                <ArrowLeft size={16} /> Back to login
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}