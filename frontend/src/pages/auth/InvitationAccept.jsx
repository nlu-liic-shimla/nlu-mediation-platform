import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Scale, ChevronRight, AlertCircle, Clock, CheckCircle } from 'lucide-react'

export default function InvitationAccept() {
  const navigate = useNavigate()
  const { token } = useParams()

  const [status, setStatus] = useState('loading') // loading | valid | expired | not_found | accepted
  const [caseInfo, setCaseInfo] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // On mount — fetch invitation details
  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/invitations/${token}`
        )
        if (res.status === 200) {
          const data = await res.json()
          if (data.status === 'expired') { setStatus('expired'); return }
          if (data.status === 'accepted') { setStatus('already_accepted'); return }
          setCaseInfo(data)
          setStatus('valid')
        } else if (res.status === 410) {
          setStatus('expired')
        } else if (res.status === 404) {
          setStatus('not_found')
        } else {
          setStatus('not_found')
        }
      } catch {
        setStatus('not_found')
      }
    }
    fetchInvitation()
  }, [token])

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address.'
    if (!form.password) e.password = 'Password is required.'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password.'
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleAccept = async () => {
    if (!validate()) return
    setLoading(true)
    setApiError('')
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/invitations/${token}/accept`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        }
      )
      if (res.status === 200) {
        const data = await res.json()
        localStorage.setItem('nlu_token', data.access_token)
        localStorage.setItem('nlu_role', 'against_party')
        localStorage.setItem('nlu_user', JSON.stringify({
          email: form.email,
          role: 'against_party',
          case_id: data.case_id,
        }))
        navigate('/party')
      } else if (res.status === 410) {
        setApiError('This invitation has expired. Please ask the mediator to send a new one.')
      } else if (res.status === 409) {
        setApiError('This invitation has already been accepted.')
      } else {
        setApiError('Something went wrong. Please try again.')
      }
    } catch {
      setApiError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }

        .ia { min-height: 100vh; background: var(--bg-page); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1.25rem; font-family: 'DM Sans', sans-serif; }
        .ia-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 2rem; }
        .ia-logo-text { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.08em; }
        .ia-card { background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-card); padding: 2.5rem; width: 100%; max-width: 500px; box-shadow: var(--shadow); }

        /* Status screens */
        .ia-status-icon { width: 68px; height: 68px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
        .ia-status-icon.loading { background: var(--bg-muted); animation: pulse 1.5s ease-in-out infinite; }
        .ia-status-icon.expired { background: #fef3c7; }
        .ia-status-icon.error { background: var(--error-bg); }
        .ia-status-icon.success { background: #f0fdf4; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        .ia-status-title { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; color: var(--text-primary); text-align: center; margin-bottom: 10px; }
        .ia-status-sub { font-size: 14px; color: var(--text-muted); text-align: center; line-height: 1.65; margin-bottom: 1.5rem; }

        /* Case info card */
        .ia-case-info { background: var(--bg-muted); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.75rem; }
        .ia-case-info-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border); }
        .ia-case-info-row:last-child { border-bottom: none; }
        .ia-case-info-label { font-size: 12px; color: var(--text-muted); }
        .ia-case-info-value { font-size: 13px; font-weight: 500; color: var(--text-primary); }

        /* Form */
        .ia-divider { display: flex; align-items: center; gap: 12px; margin: 1.5rem 0; }
        .ia-divider-line { flex: 1; height: 1px; background: var(--border); }
        .ia-divider-text { font-size: 12px; color: var(--text-muted); white-space: nowrap; }

        .ia-field { margin-bottom: 1.25rem; }
        .ia-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px; }
        .ia-input { width: 100%; padding: 13px 15px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: var(--text-primary); background: var(--bg-input); outline: none; transition: border-color 0.15s; }
        .ia-input:focus { border-color: var(--brand); }
        .ia-input.err { border-color: var(--error); }
        .ia-err-text { font-size: 12px; color: var(--error); margin-top: 5px; display: flex; align-items: center; gap: 4px; }

        .ia-api-error { background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error); border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px; line-height: 1.5; }

        .ia-accept-btn { width: 100%; padding: 14px; background: var(--brand); color: #fff; border: none; border-radius: 11px; font-size: 15px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; transition: background 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .ia-accept-btn:hover:not(:disabled) { background: var(--brand-hover); }
        .ia-accept-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .ia-show-form-btn { width: 100%; padding: 14px; background: var(--brand); color: #fff; border: none; border-radius: 11px; font-size: 15px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; transition: background 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 1rem; }
        .ia-show-form-btn:hover { background: var(--brand-hover); }

        .ia-login-link { text-align: center; font-size: 13px; color: var(--text-muted); }
        .ia-login-link button { background: none; border: none; color: var(--brand); font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 0; }

        .ia-back-btn { width: 100%; padding: 12px; background: none; border: 1.5px solid var(--border); border-radius: 11px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
        .ia-back-btn:hover { border-color: var(--brand); color: var(--brand); }

        @media (max-width: 520px) {
          .ia-card { padding: 1.75rem 1.25rem; border-radius: 16px; }
        }
      `}</style>

      <div className="ia">
        <div className="ia-logo">
          <Scale size={28} color="var(--brand)" strokeWidth={1.8} />
          <span className="ia-logo-text">SULAH</span>
        </div>

        <div className="ia-card">

          {/* Loading */}
          {status === 'loading' && (
            <>
              <div className="ia-status-icon loading" />
              <p className="ia-status-title">Checking invitation…</p>
              <p className="ia-status-sub">Please wait while we verify your invitation link.</p>
            </>
          )}

          {/* Expired */}
          {status === 'expired' && (
            <>
              <div className="ia-status-icon expired">
                <Clock size={30} color="#d97706" />
              </div>
              <p className="ia-status-title">Invitation expired</p>
              <p className="ia-status-sub">This invitation link has expired. Invitation links are valid for 72 hours. Please ask the mediator to send you a new invitation.</p>
              <button className="ia-back-btn" onClick={() => navigate('/auth/login')}>Go to Login</button>
            </>
          )}

          {/* Not found */}
          {status === 'not_found' && (
            <>
              <div className="ia-status-icon error">
                <AlertCircle size={30} color="var(--error)" />
              </div>
              <p className="ia-status-title">Invitation not found</p>
              <p className="ia-status-sub">This invitation link is invalid or has already been used. Please check the link or contact your mediator.</p>
              <button className="ia-back-btn" onClick={() => navigate('/auth/login')}>Go to Login</button>
            </>
          )}

          {/* Already accepted */}
          {status === 'already_accepted' && (
            <>
              <div className="ia-status-icon success">
                <CheckCircle size={30} color="#16a34a" />
              </div>
              <p className="ia-status-title">Already accepted</p>
              <p className="ia-status-sub">This invitation has already been accepted. If you have an account, please log in to access your case.</p>
              <button className="ia-accept-btn" onClick={() => navigate('/auth/login')}>
                Go to Login <ChevronRight size={16} />
              </button>
            </>
          )}

          {/* Valid invitation */}
          {status === 'valid' && caseInfo && (
            <>
              <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                You've been invited
              </p>
              <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Join this mediation case
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                You have been invited to participate as a party in the following mediation case.
              </p>

              {/* Case details */}
              <div className="ia-case-info">
                <div className="ia-case-info-row">
                  <span className="ia-case-info-label">Dispute Type</span>
                  <span className="ia-case-info-value">{caseInfo.dispute_type || '—'}</span>
                </div>
                <div className="ia-case-info-row">
                  <span className="ia-case-info-label">Mediator</span>
                  <span className="ia-case-info-value">{caseInfo.mediator_name || '—'}</span>
                </div>
                <div className="ia-case-info-row">
                  <span className="ia-case-info-label">Status</span>
                  <span className="ia-case-info-value" style={{ color: 'var(--brand)' }}>Pending your acceptance</span>
                </div>
              </div>

              {!showForm ? (
                <>
                  <button className="ia-show-form-btn" onClick={() => setShowForm(true)}>
                    Accept & Join Case <ChevronRight size={16} />
                  </button>
                  <p className="ia-login-link">
                    Already have an account?{' '}
                    <button onClick={() => navigate('/auth/login')}>Sign in</button>
                  </p>
                </>
              ) : (
                <>
                  <div className="ia-divider">
                    <div className="ia-divider-line" />
                    <span className="ia-divider-text">Create your account to accept</span>
                    <div className="ia-divider-line" />
                  </div>

                  <div className="ia-field">
                    <label className="ia-label">Email</label>
                    <input
                      className={`ia-input${errors.email ? ' err' : ''}`}
                      type="email"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={e => { setForm(p => ({ ...p, email: e.target.value })); if (errors.email) setErrors(p => ({ ...p, email: '' })) }}
                    />
                    {errors.email && <p className="ia-err-text"><AlertCircle size={12} />{errors.email}</p>}
                  </div>

                  <div className="ia-field">
                    <label className="ia-label">Password</label>
                    <input
                      className={`ia-input${errors.password ? ' err' : ''}`}
                      type="password"
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={e => { setForm(p => ({ ...p, password: e.target.value })); if (errors.password) setErrors(p => ({ ...p, password: '' })) }}
                    />
                    {errors.password && <p className="ia-err-text"><AlertCircle size={12} />{errors.password}</p>}
                  </div>

                  <div className="ia-field">
                    <label className="ia-label">Confirm Password</label>
                    <input
                      className={`ia-input${errors.confirmPassword ? ' err' : ''}`}
                      type="password"
                      placeholder="Repeat password"
                      value={form.confirmPassword}
                      onChange={e => { setForm(p => ({ ...p, confirmPassword: e.target.value })); if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: '' })) }}
                    />
                    {errors.confirmPassword && <p className="ia-err-text"><AlertCircle size={12} />{errors.confirmPassword}</p>}
                  </div>

                  {apiError && (
                    <div className="ia-api-error">
                      <AlertCircle size={16} />{apiError}
                    </div>
                  )}

                  <button className="ia-accept-btn" onClick={handleAccept} disabled={loading}>
                    {loading ? 'Joining…' : 'Create account & join'}
                    {!loading && <ChevronRight size={16} />}
                  </button>

                  <p className="ia-login-link" style={{ marginTop: '1rem' }}>
                    Already have an account?{' '}
                    <button onClick={() => navigate('/auth/login')}>Sign in instead</button>
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}