import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale } from 'lucide-react'
import { register } from '../../api/auth'

// Step indicator component
const StepBar = ({ current, total }) => {
  const pct = Math.round((current / total) * 100)
  return (
    <div style={s.stepWrap}>
      <div style={s.barBg}>
        <div style={{ ...s.barFill, width: `${pct}%` }} />
      </div>
      <p style={s.stepLabel}>Step {current} of {total}</p>
    </div>
  )
}

// Step 1 — account details
const Step1 = ({ data, onChange, errors }) => (
  <div>
    <h1 style={s.title}>Create your account</h1>
    <p style={s.subtitle}>Join the AI-powered mediation platform</p>

    <div style={s.field}>
      <label style={s.label}>Full Name</label>
      <input
        style={{ ...s.input, ...(errors.fullName ? s.inputError : {}) }}
        placeholder="John Doe"
        value={data.fullName}
        onChange={e => onChange('fullName', e.target.value)}
        onFocus={e => e.target.style.borderColor = '#2a3f8f'}
        onBlur={e => e.target.style.borderColor = errors.fullName ? '#dc2626' : '#dde1ea'}
      />
      {errors.fullName && <p style={s.errorText}>{errors.fullName}</p>}
    </div>

    <div style={s.field}>
      <label style={s.label}>Email</label>
      <input
        style={{ ...s.input, ...(errors.email ? s.inputError : {}) }}
        type="email"
        placeholder="john@example.com"
        value={data.email}
        onChange={e => onChange('email', e.target.value)}
        onFocus={e => e.target.style.borderColor = '#2a3f8f'}
        onBlur={e => e.target.style.borderColor = errors.email ? '#dc2626' : '#dde1ea'}
      />
      {errors.email && <p style={s.errorText}>{errors.email}</p>}
    </div>

    <div style={s.field}>
      <label style={s.label}>Password</label>
      <input
        style={{ ...s.input, ...(errors.password ? s.inputError : {}) }}
        type="password"
        placeholder="••••••••"
        value={data.password}
        onChange={e => onChange('password', e.target.value)}
        onFocus={e => e.target.style.borderColor = '#2a3f8f'}
        onBlur={e => e.target.style.borderColor = errors.password ? '#dc2626' : '#dde1ea'}
      />
      {errors.password && <p style={s.errorText}>{errors.password}</p>}
    </div>

    <div style={s.field}>
      <label style={s.label}>Confirm Password</label>
      <input
        style={{ ...s.input, ...(errors.confirmPassword ? s.inputError : {}) }}
        type="password"
        placeholder="••••••••"
        value={data.confirmPassword}
        onChange={e => onChange('confirmPassword', e.target.value)}
        onFocus={e => e.target.style.borderColor = '#2a3f8f'}
        onBlur={e => e.target.style.borderColor = errors.confirmPassword ? '#dc2626' : '#dde1ea'}
      />
      {errors.confirmPassword && <p style={s.errorText}>{errors.confirmPassword}</p>}
    </div>
  </div>
)

// Step 2 — account type + org details
const Step2 = ({ data, onChange, errors }) => (
  <div>
    <h1 style={s.title}>Create your account</h1>
    <p style={s.subtitle}>Join the AI-powered mediation platform</p>

    <div style={s.field}>
      <label style={s.label}>Account Type</label>

      {/* Party User option */}
      <div
        onClick={() => onChange('role', 'requesting_party')}
        style={{
          ...s.roleCard,
          ...(data.role === 'requesting_party' ? s.roleCardActive : {}),
        }}
      >
        <div style={{
          ...s.radioCircle,
          ...(data.role === 'requesting_party' ? s.radioActive : {}),
        }}>
          {data.role === 'requesting_party' && (
            <div style={s.radioDot} />
          )}
        </div>
        <div>
          <p style={s.roleTitle}>Party User</p>
          <p style={s.roleDesc}>File disputes, submit documents, and manage settlements</p>
        </div>
      </div>

      {/* Mediator option */}
      <div
        onClick={() => onChange('role', 'mediator')}
        style={{
          ...s.roleCard,
          marginTop: '12px',
          ...(data.role === 'mediator' ? s.roleCardActive : {}),
        }}
      >
        <div style={{
          ...s.radioCircle,
          ...(data.role === 'mediator' ? s.radioActive : {}),
        }}>
          {data.role === 'mediator' && (
            <div style={s.radioDot} />
          )}
        </div>
        <div>
          <p style={s.roleTitle}>Mediator</p>
          <p style={s.roleDesc}>Manage cases, review AI analysis, and facilitate resolutions</p>
        </div>
      </div>
      {errors.role && <p style={s.errorText}>{errors.role}</p>}
    </div>

    <div style={s.field}>
      <label style={s.label}>Organization <span style={s.optional}>(Optional)</span></label>
      <input
        style={s.input}
        placeholder="Company name"
        value={data.organization}
        onChange={e => onChange('organization', e.target.value)}
        onFocus={e => e.target.style.borderColor = '#2a3f8f'}
        onBlur={e => e.target.style.borderColor = '#dde1ea'}
      />
    </div>

    <div style={s.field}>
      <label style={s.label}>Phone Number</label>
      <input
        style={{ ...s.input, ...(errors.phone ? s.inputError : {}) }}
        placeholder="+1 (555) 000-0000"
        value={data.phone}
        onChange={e => onChange('phone', e.target.value)}
        onFocus={e => e.target.style.borderColor = '#2a3f8f'}
        onBlur={e => e.target.style.borderColor = errors.phone ? '#dc2626' : '#dde1ea'}
      />
      {errors.phone && <p style={s.errorText}>{errors.phone}</p>}
    </div>
  </div>
)

// Step 3 — success
const Step3 = () => (
  <div>
    <h1 style={s.title}>Create your account</h1>
    <p style={s.subtitle}>Join the AI-powered mediation platform</p>

    <div style={s.successBox}>
      <div style={s.successIconWrap}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4b5eaa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h2 style={s.successTitle}>You're all set!</h2>
      <p style={s.successDesc}>
        Your account has been created successfully. You can now sign in and start using the platform.
      </p>
    </div>

    <div style={s.nextBox}>
      <p style={s.nextTitle}>What happens next?</p>
      {[
        "You'll receive a verification email",
        'Complete your profile to unlock all features',
        'Start your first mediation case or review',
      ].map(item => (
        <div key={item} style={s.nextItem}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2a3f8f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span style={s.nextText}>{item}</span>
        </div>
      ))}
    </div>
  </div>
)

// ── Main Register component ──
export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [errors, setErrors] = useState({})

  const [data, setData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'requesting_party',
    organization: '',
    phone: '',
  })

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

  const validateStep2 = () => {
    const e = {}
    if (!data.role) e.role = 'Please select an account type.'
    return e
  }

  const handleContinue = async () => {
    setApiError('')

    if (step === 1) {
      const e = validateStep1()
      if (Object.keys(e).length) { setErrors(e); return }
      setStep(2)
      return
    }

    if (step === 2) {
      const e = validateStep2()
      if (Object.keys(e).length) { setErrors(e); return }

      setLoading(true)
      try {
        // Wire to backend when ready:
        // await register(data.email, data.password, data.role, data.fullName, data.phone, data.organization)
        await register(data.email, data.password, data.role)
navigate('/auth/login')
        setStep(3)
      } catch (err) {
        setApiError(err.response?.data?.detail || 'Registration failed. Please try again.')
      } finally {
        setLoading(false)
      }
      return
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  return (
    <div style={s.page}>
      {/* Logo */}
      <div style={s.logoRow}>
       <Scale size={30} color="#2a3f8f" strokeWidth={1.8} />
        <span style={s.logoText}>SULAH</span>
      </div>

      {/* Card */}
      <div style={s.card}>
        <StepBar current={step} total={3} />

        {step === 1 && <Step1 data={data} onChange={update} errors={errors} />}
        {step === 2 && <Step2 data={data} onChange={update} errors={errors} />}
        {step === 3 && <Step3 />}

        {apiError && (
          <div style={s.apiError} role="alert">{apiError}</div>
        )}

        {/* Footer row */}
        <div style={s.footer}>
          {step === 1 ? (
            <button
              type="button"
              style={s.alreadyBtn}
              onClick={() => navigate('/auth/login')}
            >
              Already have an account?
            </button>
          ) : (
            <button
              type="button"
              style={s.backBtn}
              onClick={handleBack}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f3f8'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              disabled={loading}
              onClick={handleContinue}
              style={{ ...s.continueBtn, opacity: loading ? 0.75 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1e2f6e' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#2a3f8f' }}
            >
              {loading ? 'Creating…' : 'Continue'}
              {!loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/auth/login')}
              style={s.continueBtn}
              onMouseEnter={e => e.currentTarget.style.background = '#1e2f6e'}
              onMouseLeave={e => e.currentTarget.style.background = '#2a3f8f'}
            >
              Go to Login
            </button>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #eef0f5; }
        @media (max-width: 520px) {
          .reg-card { padding: 1.5rem 1.25rem !important; margin: 0 1rem !important; }
          .reg-page { padding: 1.5rem 0 2rem !important; }
        }
      `}</style>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#eef0f5',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem 1rem 3rem',
    fontFamily: "'DM Sans', sans-serif",
  },

  // Logo
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '1.75rem',
  },
  logoText: {
    fontFamily: "'Sora', sans-serif",
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f1c3f',
    letterSpacing: '0.08em',
  },

  // Card
  card: {
    background: '#fff',
    borderRadius: '16px',
    border: '1px solid #e2e5ee',
    padding: '2rem 2.25rem',
    width: '100%',
    maxWidth: '680px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
  },

  // Step bar
  stepWrap: { marginBottom: '1.75rem' },
  barBg: {
    height: '6px',
    background: '#e2e5ee',
    borderRadius: '99px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  barFill: {
    height: '100%',
    background: '#2a3f8f',
    borderRadius: '99px',
    transition: 'width 0.4s ease',
  },
  stepLabel: {
    fontSize: '13px',
    color: '#8a94a6',
  },

  // Typography
  title: {
    fontFamily: "'Sora', sans-serif",
    fontSize: 'clamp(22px, 4vw, 28px)',
    fontWeight: '700',
    color: '#0f1c3f',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#8a94a6',
    marginBottom: '1.75rem',
  },

  // Fields
  field: { marginBottom: '1.25rem' },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#3d4a5c',
    marginBottom: '8px',
  },
  optional: {
    fontWeight: '400',
    color: '#b0b8c9',
    fontSize: '12px',
  },
  input: {
    width: '100%',
    padding: '13px 14px',
    border: '1.5px solid #dde1ea',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: "'DM Sans', sans-serif",
    color: '#0f1c3f',
    outline: 'none',
    transition: 'border-color 0.15s',
    background: '#fff',
  },
  inputError: { borderColor: '#dc2626' },
  errorText: {
    fontSize: '12px',
    color: '#dc2626',
    marginTop: '5px',
  },

  // Role cards
  roleCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '16px',
    border: '1.5px solid #dde1ea',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    background: '#fff',
  },
  roleCardActive: {
    borderColor: '#2a3f8f',
    background: '#f5f7ff',
  },
  radioCircle: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid #dde1ea',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '2px',
    transition: 'border-color 0.15s',
  },
  radioActive: { borderColor: '#2a3f8f' },
  radioDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#2a3f8f',
  },
  roleTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#0f1c3f',
    marginBottom: '3px',
  },
  roleDesc: {
    fontSize: '13px',
    color: '#8a94a6',
    lineHeight: '1.5',
  },

  // Step 3 success
  successBox: {
    background: '#f1f3f8',
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'center',
    marginBottom: '1.25rem',
  },
  successIconWrap: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: '#e2e5ee',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
  },
  successTitle: {
    fontFamily: "'Sora', sans-serif",
    fontSize: '20px',
    fontWeight: '700',
    color: '#0f1c3f',
    marginBottom: '8px',
  },
  successDesc: {
    fontSize: '14px',
    color: '#8a94a6',
    lineHeight: '1.6',
    maxWidth: '380px',
    margin: '0 auto',
  },
  nextBox: {
    border: '1.5px solid #dde1ea',
    borderRadius: '10px',
    padding: '1.25rem 1.5rem',
    marginBottom: '0.5rem',
  },
  nextTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#0f1c3f',
    marginBottom: '12px',
  },
  nextItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  nextText: {
    fontSize: '13px',
    color: '#3d4a5c',
  },

  // API error
  apiError: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    margin: '1rem 0 0',
  },

  // Footer
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '1.75rem',
    flexWrap: 'wrap',
    gap: '12px',
  },
  alreadyBtn: {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    color: '#3d4a5c',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    padding: 0,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#fff',
    border: '1.5px solid #dde1ea',
    borderRadius: '9px',
    padding: '11px 18px',
    fontSize: '14px',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: '500',
    color: '#3d4a5c',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  continueBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#2a3f8f',
    border: 'none',
    borderRadius: '9px',
    padding: '12px 22px',
    fontSize: '14px',
    fontFamily: "'Sora', sans-serif",
    fontWeight: '600',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background 0.15s',
    marginLeft: 'auto',
  },
}