import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale } from 'lucide-react'
import { register } from '../../api/auth'

const StepBar = ({ current, total }) => {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="rg-step-wrap">
      <div className="rg-bar-bg">
        <div className="rg-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="rg-step-label">Step {current} of {total}</p>
    </div>
  )
}

const Step1 = ({ data, onChange, errors }) => (
  <div>
    <h1 className="rg-title">Create your account</h1>
    <p className="rg-sub">Join the AI-powered mediation platform</p>
    {[
      { key: 'fullName', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
      { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
      { key: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
    ].map(f => (
      <div key={f.key} className="rg-field">
        <label className="rg-label">{f.label}</label>
        <input
          type={f.type}
          placeholder={f.placeholder}
          value={data[f.key]}
          onChange={e => onChange(f.key, e.target.value)}
          className={`rg-input${errors[f.key] ? ' err' : ''}`}
        />
        {errors[f.key] && <p className="rg-err-text">{errors[f.key]}</p>}
      </div>
    ))}
  </div>
)

const Step2 = ({ data, onChange, errors }) => (
  <div>
    <h1 className="rg-title">Create your account</h1>
    <p className="rg-sub">Join the AI-powered mediation platform</p>
    <div className="rg-field">
      <label className="rg-label">Account Type</label>
      {[
        { value: 'requesting_party', label: 'Party User', desc: 'File disputes, submit documents, and manage settlements' },
        { value: 'mediator', label: 'Mediator', desc: 'Manage cases, review AI analysis, and facilitate resolutions' },
      ].map((opt, i) => (
        <div
          key={opt.value}
          onClick={() => onChange('role', opt.value)}
          className={`rg-role-card${data.role === opt.value ? ' active' : ''}${i > 0 ? ' mt' : ''}`}
        >
          <div className={`rg-radio${data.role === opt.value ? ' active' : ''}`}>
            {data.role === opt.value && <div className="rg-radio-dot" />}
          </div>
          <div>
            <p className="rg-role-title">{opt.label}</p>
            <p className="rg-role-desc">{opt.desc}</p>
          </div>
        </div>
      ))}
      {errors.role && <p className="rg-err-text">{errors.role}</p>}
    </div>
    <div className="rg-field">
      <label className="rg-label">Organization <span className="rg-optional">(Optional)</span></label>
      <input className="rg-input" placeholder="Company name" value={data.organization} onChange={e => onChange('organization', e.target.value)} />
    </div>
    <div className="rg-field">
      <label className="rg-label">Phone Number</label>
      <input className={`rg-input${errors.phone ? ' err' : ''}`} placeholder="+1 (555) 000-0000" value={data.phone} onChange={e => onChange('phone', e.target.value)} />
      {errors.phone && <p className="rg-err-text">{errors.phone}</p>}
    </div>
  </div>
)

const Step3 = () => (
  <div>
    <h1 className="rg-title">Create your account</h1>
    <p className="rg-sub">Join the AI-powered mediation platform</p>
    <div className="rg-success-box">
      <div className="rg-success-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h2 className="rg-success-title">You're all set!</h2>
      <p className="rg-success-desc">Your account has been created successfully. You can now sign in and start using the platform.</p>
    </div>
    <div className="rg-next-box">
      <p className="rg-next-title">What happens next?</p>
      {["You'll receive a verification email", "Complete your profile to unlock all features", "Start your first mediation case or review"].map(item => (
        <div key={item} className="rg-next-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="rg-next-text">{item}</span>
        </div>
      ))}
    </div>
  </div>
)

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [errors, setErrors] = useState({})
  const [data, setData] = useState({ fullName: '', email: '', password: '', confirmPassword: '', role: 'requesting_party', organization: '', phone: '' })

  const update = (key, value) => {
    setData(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validateStep1 = () => {
    const e = {}
    if (!data.fullName.trim()) e.fullName = 'Full name is required.'
    if (!data.email.trim()) e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(data.email)) e.email = 'Enter a valid email address.'
    if (!data.password) e.password = 'Password is required.'
    else if (data.password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (!data.confirmPassword) e.confirmPassword = 'Please confirm your password.'
    else if (data.password !== data.confirmPassword) e.confirmPassword = 'Passwords do not match.'
    return e
  }

  const handleContinue = async () => {
    setApiError('')
    if (step === 1) {
      const e = validateStep1()
      if (Object.keys(e).length) { setErrors(e); return }
      setStep(2); return
    }
    if (step === 2) {
      if (!data.role) { setErrors({ role: 'Please select an account type.' }); return }
      setLoading(true)
      try {
        await register(data.email, data.password, data.role)
        setStep(3)
      } catch (err) {
        setApiError(err.response?.data?.detail || 'Registration failed. Please try again.')
      } finally { setLoading(false) }
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }

        .rg { min-height: 100vh; background: var(--bg-page); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1rem; font-family: 'DM Sans', sans-serif; }

        .rg-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 1.75rem; }
        .rg-logo-text { font-family: 'Sora', sans-serif; font-size: 24px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.08em; }

        .rg-card { background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-card); padding: 2rem 2.25rem; width: 100%; max-width: 680px; box-shadow: var(--shadow); }

        .rg-step-wrap { margin-bottom: 1.75rem; }
        .rg-bar-bg { height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; margin-bottom: 10px; }
        .rg-bar-fill { height: 100%; background: var(--brand); border-radius: 99px; transition: width 0.4s ease; }
        .rg-step-label { font-size: 13px; color: var(--text-muted); }

        .rg-title { font-family: 'Sora', sans-serif; font-size: clamp(22px, 4vw, 28px); font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
        .rg-sub { font-size: 14px; color: var(--text-muted); margin-bottom: 1.75rem; }

        .rg-field { margin-bottom: 1.25rem; }
        .rg-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px; }
        .rg-optional { font-weight: 400; color: var(--text-placeholder); font-size: 12px; }
        .rg-input { width: 100%; padding: 13px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: var(--text-primary); background: var(--bg-input); outline: none; transition: border-color 0.15s; }
        .rg-input:focus { border-color: var(--brand); }
        .rg-input.err { border-color: var(--error); }
        .rg-err-text { font-size: 12px; color: var(--error); margin-top: 5px; }

        .rg-role-card { display: flex; align-items: flex-start; gap: 14px; padding: 16px; border: 1.5px solid var(--border); border-radius: 10px; cursor: pointer; transition: border-color 0.15s, background 0.15s; background: var(--bg-card); }
        .rg-role-card.mt { margin-top: 12px; }
        .rg-role-card.active { border-color: var(--brand); background: var(--brand-light); }
        .rg-radio { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; transition: border-color 0.15s; }
        .rg-radio.active { border-color: var(--brand); }
        .rg-radio-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--brand); }
        .rg-role-title { font-size: 14px; font-weight: 500; color: var(--text-primary); margin-bottom: 3px; }
        .rg-role-desc { font-size: 13px; color: var(--text-muted); line-height: 1.5; }

        .rg-success-box { background: var(--bg-muted); border-radius: 12px; padding: 2rem; text-align: center; margin-bottom: 1.25rem; }
        .rg-success-icon { width: 60px; height: 60px; border-radius: 50%; background: var(--success-icon-bg); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
        .rg-success-title { font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
        .rg-success-desc { font-size: 14px; color: var(--text-muted); line-height: 1.6; max-width: 380px; margin: 0 auto; }
        .rg-next-box { border: 1.5px solid var(--border); border-radius: 10px; padding: 1.25rem 1.5rem; margin-bottom: 0.5rem; }
        .rg-next-title { font-size: 14px; font-weight: 500; color: var(--text-primary); margin-bottom: 12px; }
        .rg-next-item { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .rg-next-text { font-size: 13px; color: var(--text-secondary); }

        .rg-api-error { background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-top: 1rem; }

        .rg-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 1.75rem; flex-wrap: wrap; gap: 12px; }
        .rg-already-btn { background: none; border: none; font-size: 14px; color: var(--text-secondary); cursor: pointer; font-family: 'DM Sans', sans-serif; padding: 0; }
        .rg-already-btn:hover { color: var(--brand); }
        .rg-back-btn { display: flex; align-items: center; gap: 8px; background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 9px; padding: 11px 18px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: background 0.15s; }
        .rg-back-btn:hover { background: var(--bg-muted); }
        .rg-continue-btn { display: flex; align-items: center; gap: 8px; background: var(--brand); border: none; border-radius: 9px; padding: 12px 22px; font-size: 14px; font-family: 'Sora', sans-serif; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.15s; margin-left: auto; }
        .rg-continue-btn:hover:not(:disabled) { background: var(--brand-hover); }
        .rg-continue-btn:disabled { opacity: 0.75; cursor: not-allowed; }

        @media (max-width: 520px) {
          .rg { padding: 1.5rem 1rem; justify-content: flex-start; padding-top: 2rem; }
          .rg-logo { justify-content: center; }
          .rg-card { border-radius: 16px; padding: 1.5rem 1.25rem; }
          .rg-title { font-size: 22px; }
        }
      `}</style>

      <div className="rg">
        <div className="rg-logo">
          <Scale size={30} color="var(--brand)" strokeWidth={1.8} />
          <span className="rg-logo-text">SULAH</span>
        </div>

        <div className="rg-card">
          <StepBar current={step} total={3} />

          {step === 1 && <Step1 data={data} onChange={update} errors={errors} />}
          {step === 2 && <Step2 data={data} onChange={update} errors={errors} />}
          {step === 3 && <Step3 />}

          {apiError && <div className="rg-api-error" role="alert">{apiError}</div>}

          <div className="rg-footer">
            {step === 1 ? (
              <button className="rg-already-btn" onClick={() => navigate('/auth/login')}>Already have an account?</button>
            ) : (
              <button className="rg-back-btn" onClick={() => setStep(p => p - 1)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back
              </button>
            )}

            {step < 3 ? (
              <button className="rg-continue-btn" disabled={loading} onClick={handleContinue}>
                {loading ? 'Creating…' : 'Continue'}
                {!loading && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                )}
              </button>
            ) : (
              <button className="rg-continue-btn" onClick={() => navigate('/auth/login')}>Go to Login</button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}