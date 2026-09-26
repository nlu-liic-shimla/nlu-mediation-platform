import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Scale, ChevronRight, AlertCircle, Clock, CheckCircle, Shield, UserCheck, UserPlus } from 'lucide-react'
import { getInvitation, acceptInvitation, declineInvitation} from '../../services/invitationService'

const CONSENT_TEXT = `By proceeding, you agree to participate in online mediation facilitated through the SULAH platform under the Mediation Act, 2023. You understand that:

• Mediation is a voluntary and confidential process.
• Any information shared during mediation may be seen by the mediator and the other party.
• Participation does not waive your right to pursue legal remedies.
• The mediator is a neutral facilitator and does not represent either party.
• Any settlement reached is binding only if both parties sign and agree in writing.`

export default function InvitationAccept() {
  const navigate = useNavigate()
  const { token } = useParams()

  // Screens: loading | valid | expired | not_found | already_used | declined | accepted
  const [screen, setScreen] = useState('loading')
  const [caseInfo, setCaseInfo] = useState(null)

  // Consent screen
  const [consentChecked, setConsentChecked] = useState(false)

  // Account check screen: null | 'has_account' | 'no_account'
  const [accountChoice, setAccountChoice] = useState(null)

  // Login/Register form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // Step: invitation | consent | account_check | login_form | register_form
  const [step, setStep] = useState('invitation')

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getInvitation(token)
        if (data.status === 'expired') { setScreen('expired'); return }
        if (data.status === 'accepted') { setScreen('already_used'); return }
        setCaseInfo(data)
        setScreen('valid')
      } catch (err) {
        if (err.response?.status === 410) setScreen('expired')
        else if (err.response?.status === 404) setScreen('not_found')
        else setScreen('not_found')
      }
    }
    fetch()
  }, [token])

  const validateLogin = () => {
    const e = {}
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email.'
    if (!password) e.password = 'Password is required.'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const validateRegister = () => {
    const e = {}
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email.'
    if (!password) e.password = 'Password is required.'
    else if (password.length < 8) e.password = 'Min. 8 characters.'
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match.'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

const handleAccept = async () => {
  const isValid = accountChoice === 'has_account' ? validateLogin() : validateRegister()
  if (!isValid) return
  setLoading(true)
  setApiError('')
  try {
   const isLogin = accountChoice === 'has_account'
const data = isLogin
  ? await acceptInvitation(token, email, password)
  : await acceptInvitation(token, email, password, email.split('@')[0])
    localStorage.setItem('nlu_token', data.access_token)
    localStorage.setItem('nlu_role', 'party_user')
    localStorage.setItem('nlu_user', JSON.stringify({
  email,
  full_name: data.full_name || null,
  role: 'party_user',
  case_id: data.case_id,
}))
    localStorage.setItem('nlu_case_role', data.role_in_this_case)
    navigate(`/party/cases/${data.case_id}/intake`)
  } catch (err) {
    if (err.response?.status === 410) {
      setApiError('This invitation has expired.')
    } else if (err.response?.status === 409) {
      setApiError('This invitation has already been accepted.')
    } else if (err.response?.status === 401) {
      // 401 means wrong password — account exists
      if (accountChoice === 'no_account') {
        // They said no account but email already exists
        setApiError(
          'This email already has an account. Please go back and select "Yes, I have an account" instead.'
        )
      } else {
        setApiError('Incorrect password. Please try again.')
      }
    } else if (err.response?.status === 400) {
      // Backend says email already registered — on register path
      if (accountChoice === 'no_account') {
        setApiError(
          'This email is already registered. Please go back and select "Yes, I have an account".'
        )
      } else {
        setApiError('Something went wrong. Please try again.')
      }
    } else {
      setApiError('Something went wrong. Please try again.')
    }
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

        /* Tag + title */
        .ia-tag { font-size: 12px; font-weight: 500; color: var(--brand); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        .ia-title { font-family: 'Sora', sans-serif; font-size: clamp(20px, 4vw, 24px); font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
        .ia-sub { font-size: 14px; color: var(--text-muted); line-height: 1.65; margin-bottom: 1.5rem; }

        /* Status icon screens */
        .ia-icon-wrap { width: 68px; height: 68px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
        .ia-icon-wrap.expired { background: #fef3c7; }
        .ia-icon-wrap.error { background: var(--error-bg); }
        .ia-icon-wrap.success { background: #f0fdf4; }
        .ia-icon-wrap.loading { background: var(--bg-muted); animation: ia-pulse 1.5s ease-in-out infinite; }
        @keyframes ia-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        /* Case info box */
        .ia-case-box { background: var(--bg-muted); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; }
        .ia-case-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--border); }
        .ia-case-row:last-child { border-bottom: none; }
        .ia-case-label { font-size: 12px; color: var(--text-muted); }
        .ia-case-value { font-size: 13px; font-weight: 500; color: var(--text-primary); }

        /* Consent box */
        .ia-consent-box { background: var(--bg-muted); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; max-height: 180px; overflow-y: auto; }
        .ia-consent-text { font-size: 13px; color: var(--text-secondary); line-height: 1.7; white-space: pre-line; }
        .ia-checkbox-row { display: flex; align-items: flex-start; gap: 12px; padding: 1rem; background: var(--bg-muted); border: 1.5px solid var(--border); border-radius: 10px; cursor: pointer; margin-bottom: 1.5rem; transition: border-color 0.15s; }
        .ia-checkbox-row.checked { border-color: var(--brand); background: var(--brand-light); }
        .ia-checkbox { width: 20px; height: 20px; border-radius: 4px; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; transition: all 0.15s; background: var(--bg-card); }
        .ia-checkbox.checked { background: var(--brand); border-color: var(--brand); }
        .ia-checkbox-label { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
        .ia-checkbox-label strong { color: var(--text-primary); }

        /* Account choice cards */
        .ia-choice-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 1.5rem; }
        .ia-choice-card { display: flex; align-items: center; gap: 14px; padding: 16px; border: 1.5px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.15s; background: var(--bg-card); }
        .ia-choice-card:hover { border-color: var(--brand); background: var(--brand-light); }
        .ia-choice-card.selected { border-color: var(--brand); background: var(--brand-light); }
        .ia-choice-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--brand-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ia-choice-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
        .ia-choice-sub { font-size: 12px; color: var(--text-muted); }

        /* Form fields */
        .ia-field { margin-bottom: 1.1rem; }
        .ia-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 7px; }
        .ia-input { width: 100%; padding: 13px 15px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: var(--text-primary); background: var(--bg-input); outline: none; transition: border-color 0.15s; }
        .ia-input:focus { border-color: var(--brand); }
        .ia-input.err { border-color: var(--error); }
        .ia-err-text { font-size: 12px; color: var(--error); margin-top: 4px; display: flex; align-items: center; gap: 4px; }

        .ia-api-error { background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error); border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 1rem; display: flex; gap: 8px; line-height: 1.5; }

        /* Buttons */
        .ia-primary-btn { width: 100%; padding: 14px; background: var(--brand); color: #fff; border: none; border-radius: 11px; font-size: 15px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.15s; }
        .ia-primary-btn:hover:not(:disabled) { background: var(--brand-hover); }
        .ia-primary-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .ia-secondary-btn { width: 100%; padding: 12px; background: none; border: 1.5px solid var(--border); border-radius: 11px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; margin-top: 10px; }
        .ia-secondary-btn:hover { border-color: var(--brand); color: var(--brand); }
        .ia-decline-btn { width: 100%; background: none; border: none; font-size: 13px; color: var(--text-muted); cursor: pointer; text-align: center; margin-top: 12px; font-family: 'DM Sans', sans-serif; text-decoration: underline; }
        .ia-decline-btn:hover { color: var(--error); }
        .ia-back-link { display: flex; align-items: center; gap: 6px; background: none; border: none; font-size: 13px; color: var(--text-muted); cursor: pointer; font-family: 'DM Sans', sans-serif; margin-bottom: 1.25rem; padding: 0; }
        .ia-back-link:hover { color: var(--brand); }
        .ia-divider { display: flex; align-items: center; gap: 12px; margin: 1.25rem 0; }
        .ia-divider-line { flex: 1; height: 1px; background: var(--border); }
        .ia-divider-text { font-size: 12px; color: var(--text-muted); white-space: nowrap; }

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

          {/* ── Loading ── */}
          {screen === 'loading' && (
            <div style={{ textAlign: 'center' }}>
              <div className="ia-icon-wrap loading" style={{ margin: '0 auto 1.5rem' }} />
              <p className="ia-title" style={{ textAlign: 'center' }}>Checking invitation…</p>
              <p className="ia-sub" style={{ textAlign: 'center' }}>Please wait while we verify your link.</p>
            </div>
          )}

          {/* ── Expired ── */}
          {screen === 'expired' && (
            <div style={{ textAlign: 'center' }}>
              <div className="ia-icon-wrap expired" style={{ margin: '0 auto 1.5rem' }}>
                <Clock size={30} color="#d97706" />
              </div>
              <p className="ia-title" style={{ textAlign: 'center' }}>Invitation expired</p>
              <p className="ia-sub" style={{ textAlign: 'center' }}>This invitation link has expired. Links are valid for 72 hours. Please ask the mediator to send a new one.</p>
              <button className="ia-secondary-btn" onClick={() => navigate('/auth/login')}>Go to Login</button>
            </div>
          )}

          {/* ── Not found ── */}
          {screen === 'not_found' && (
            <div style={{ textAlign: 'center' }}>
              <div className="ia-icon-wrap error" style={{ margin: '0 auto 1.5rem' }}>
                <AlertCircle size={30} color="var(--error)" />
              </div>
              <p className="ia-title" style={{ textAlign: 'center' }}>Invitation not found</p>
              <p className="ia-sub" style={{ textAlign: 'center' }}>This link is invalid or has already been used. Please contact your mediator.</p>
              <button className="ia-secondary-btn" onClick={() => navigate('/auth/login')}>Go to Login</button>
            </div>
          )}

          {/* ── Already used ── */}
          {screen === 'already_used' && (
            <div style={{ textAlign: 'center' }}>
              <div className="ia-icon-wrap success" style={{ margin: '0 auto 1.5rem' }}>
                <CheckCircle size={30} color="#16a34a" />
              </div>
              <p className="ia-title" style={{ textAlign: 'center' }}>Already accepted</p>
              <p className="ia-sub" style={{ textAlign: 'center' }}>This invitation has already been accepted. Please log in to access your case.</p>
              <button className="ia-primary-btn" onClick={() => navigate('/auth/login')}>
                Go to Login <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── Declined ── */}
{screen === 'declined' && (
  <div style={{ textAlign: 'center' }}>
    <div className="ia-icon-wrap error" style={{ margin: '0 auto 1.5rem' }}>
      <AlertCircle size={30} color="var(--error)" />
    </div>
    <p className="ia-title" style={{ textAlign: 'center' }}>Invitation declined</p>
    <p className="ia-sub" style={{ textAlign: 'center' }}>
      You have declined to participate in this mediation. If this was a mistake, you can still accept within the 72-hour window.
    </p>
    <button className="ia-secondary-btn" onClick={() => navigate('/auth/login')}>Go to Login</button>
    <button
      className="ia-decline-btn"
      style={{ marginTop: '10px', display: 'block', width: '100%' }}
      onClick={() => { setScreen('valid'); setStep('invitation') }}
    >
      Changed your mind? Go back
    </button>
  </div>
)}

          {/* ── Valid invitation ── */}
          {screen === 'valid' && caseInfo && (
            <>
              {/* Step 1 — Case preview */}
              {step === 'invitation' && (
                <>
                  <p className="ia-tag">You've been invited</p>
                  <h2 className="ia-title">Join this mediation case</h2>
                  <p className="ia-sub">You have been invited to participate as a party in the following mediation case on the SULAH platform.</p>

                  <div className="ia-case-box">
                    <div className="ia-case-row">
                      <span className="ia-case-label">Dispute Type</span>
                      <span className="ia-case-value">{caseInfo.dispute_type || '—'}</span>
                    </div>
                    <div className="ia-case-row">
                      <span className="ia-case-label">Mediator</span>
                      <span className="ia-case-value">{caseInfo.mediator_name || '—'}</span>
                    </div>
                    <div className="ia-case-row">
                      <span className="ia-case-label">Status</span>
                      <span className="ia-case-value" style={{ color: 'var(--brand)' }}>Pending your acceptance</span>
                    </div>
                  </div>

                  <button className="ia-primary-btn" onClick={() => setStep('consent')}>
                    View Consent Form <ChevronRight size={16} />
                  </button>
                 <button
  className="ia-decline-btn"
  onClick={async () => {
    try {
      await declineInvitation(token)
    } catch (err) {
      // Even if the API call fails, still show the declined screen —
      // don't trap the user. Log for debugging.
      console.error('Decline API call failed:', err)
    }
    setScreen('declined')
  }}
>
  Decline invitation
</button>
                </>
              )}

              {/* Step 2 — Consent */}
              {step === 'consent' && (
                <>
                  <button className="ia-back-link" onClick={() => setStep('invitation')}>
                    ← Back
                  </button>
                  <p className="ia-tag">Consent required</p>
                  <h2 className="ia-title">Read and accept</h2>
                  <p className="ia-sub">Please read the consent form carefully before proceeding.</p>

                  <div className="ia-consent-box">
                    <p className="ia-consent-text">{CONSENT_TEXT}</p>
                  </div>

                  <div
                    className={`ia-checkbox-row${consentChecked ? ' checked' : ''}`}
                    onClick={() => setConsentChecked(p => !p)}
                  >
                    <div className={`ia-checkbox${consentChecked ? ' checked' : ''}`}>
                      {consentChecked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <p className="ia-checkbox-label">
                      I have read and agree to the consent terms above. I understand this is a <strong>voluntary mediation process</strong> under the Mediation Act, 2023.
                    </p>
                  </div>

                  <button
                    className="ia-primary-btn"
                    onClick={() => setStep('account_check')}
                    disabled={!consentChecked}
                  >
                    Proceed <ChevronRight size={16} />
                  </button>
                </>
              )}

              {/* Step 3 — Account check */}
              {step === 'account_check' && (
                <>
                  <button className="ia-back-link" onClick={() => setStep('consent')}>
                    ← Back
                  </button>
                  <p className="ia-tag">Almost there</p>
                  <h2 className="ia-title">Do you have an account?</h2>
                  <p className="ia-sub">Choose one of the options below to continue.</p>

                  <div className="ia-choice-grid">
                    <div
                      className={`ia-choice-card${accountChoice === 'has_account' ? ' selected' : ''}`}
                      onClick={() => setAccountChoice('has_account')}
                    >
                      <div className="ia-choice-icon">
                        <UserCheck size={20} color="var(--brand)" />
                      </div>
                      <div>
                        <p className="ia-choice-title">Yes, I have an account</p>
                        <p className="ia-choice-sub">Sign in with your existing credentials</p>
                      </div>
                    </div>

                    <div
                      className={`ia-choice-card${accountChoice === 'no_account' ? ' selected' : ''}`}
                      onClick={() => setAccountChoice('no_account')}
                    >
                      <div className="ia-choice-icon">
                        <UserPlus size={20} color="var(--brand)" />
                      </div>
                      <div>
                        <p className="ia-choice-title">No, create an account</p>
                        <p className="ia-choice-sub">Register with your email and a new password</p>
                      </div>
                    </div>
                  </div>

                  <button
                    className="ia-primary-btn"
                    onClick={() => setStep(accountChoice === 'has_account' ? 'login_form' : 'register_form')}
                    disabled={!accountChoice}
                  >
                    Continue <ChevronRight size={16} />
                  </button>
                </>
              )}

              {/* Step 4a — Login form */}
              {step === 'login_form' && (
                <>
                  <button className="ia-back-link" onClick={() => { setStep('account_check'); setFormErrors({}); setApiError('') }}>
                    ← Back
                  </button>
                  <p className="ia-tag">Sign in</p>
                  <h2 className="ia-title">Welcome back</h2>
                  <p className="ia-sub">Sign in to accept this invitation and join the case.</p>

                  <div className="ia-field">
                    <label className="ia-label">Email</label>
                    <input className={`ia-input${formErrors.email ? ' err' : ''}`} type="email" placeholder="your@email.com" value={email} onChange={e => { setEmail(e.target.value); setFormErrors(p => ({ ...p, email: '' })) }} />
                    {formErrors.email && <p className="ia-err-text"><AlertCircle size={12} />{formErrors.email}</p>}
                  </div>

                  <div className="ia-field">
                    <label className="ia-label">Password</label>
                    <input className={`ia-input${formErrors.password ? ' err' : ''}`} type="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setFormErrors(p => ({ ...p, password: '' })) }} />
                    {formErrors.password && <p className="ia-err-text"><AlertCircle size={12} />{formErrors.password}</p>}
                  </div>

                  {apiError && (
  <div>
    <div className="ia-api-error"><AlertCircle size={16} />{apiError}</div>
    <button
      className="ia-back-link"
      style={{ marginTop: '8px', justifyContent: 'center' }}
      onClick={() => { setStep('account_check'); setApiError(''); setFormErrors({}) }}
    >
      ← Change my selection
    </button>
  </div>
)}
                  <button className="ia-primary-btn" onClick={handleAccept} disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign in & Accept'} <ChevronRight size={16} />
                  </button>
                </>
              )}

              {/* Step 4b — Register form */}
              {step === 'register_form' && (
                <>
                  <button className="ia-back-link" onClick={() => { setStep('account_check'); setFormErrors({}); setApiError('') }}>
                    ← Back
                  </button>
                  <p className="ia-tag">Create account</p>
                  <h2 className="ia-title">Register to accept</h2>
                  <p className="ia-sub">Create your account to accept this invitation and join the case.</p>

                  <div className="ia-field">
                    <label className="ia-label">Email</label>
                    <input className={`ia-input${formErrors.email ? ' err' : ''}`} type="email" placeholder="your@email.com" value={email} onChange={e => { setEmail(e.target.value); setFormErrors(p => ({ ...p, email: '' })) }} />
                    {formErrors.email && <p className="ia-err-text"><AlertCircle size={12} />{formErrors.email}</p>}
                  </div>

                  <div className="ia-field">
                    <label className="ia-label">Password</label>
                    <input className={`ia-input${formErrors.password ? ' err' : ''}`} type="password" placeholder="Min. 8 characters" value={password} onChange={e => { setPassword(e.target.value); setFormErrors(p => ({ ...p, password: '' })) }} />
                    {formErrors.password && <p className="ia-err-text"><AlertCircle size={12} />{formErrors.password}</p>}
                  </div>

                  <div className="ia-field">
                    <label className="ia-label">Confirm Password</label>
                    <input className={`ia-input${formErrors.confirmPassword ? ' err' : ''}`} type="password" placeholder="Repeat password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setFormErrors(p => ({ ...p, confirmPassword: '' })) }} />
                    {formErrors.confirmPassword && <p className="ia-err-text"><AlertCircle size={12} />{formErrors.confirmPassword}</p>}
                  </div>

                  {apiError && <div className="ia-api-error"><AlertCircle size={16} />{apiError}</div>}

                  <button className="ia-primary-btn" onClick={handleAccept} disabled={loading}>
                    {loading ? 'Creating account…' : 'Create account & Accept'} <ChevronRight size={16} />
                  </button>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </>
  )
}