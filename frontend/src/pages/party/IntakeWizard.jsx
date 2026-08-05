import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Scale, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Relationship', title: 'What is your relationship with the other party?' },
  { id: 2, label: 'Statement', title: 'Describe your dispute in detail' },
  { id: 3, label: 'Timeline', title: 'When did this dispute begin?' },
  { id: 4, label: 'Amount', title: 'Is there a monetary amount involved?' },
  { id: 5, label: 'Negotiation', title: 'Have you tried to resolve this before?' },
  { id: 6, label: 'Outcome', title: 'What outcome are you seeking?' },
]

const RELATIONSHIP_OPTIONS = [
  { value: 'landlord_tenant', label: 'Landlord / Tenant', icon: '🏠' },
  { value: 'employer_employee', label: 'Employer / Employee', icon: '💼' },
  { value: 'commercial', label: 'Commercial / Business', icon: '🤝' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { value: 'other', label: 'Other', icon: '📋' },
]

export default function IntakeWizard() {
  const navigate = useNavigate()
  const { id: caseId } = useParams()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')

  const DRAFT_KEY = `intake_draft_${caseId}`

  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return {
      relationship_type: '',
      statement: '',
      timeline: '',
      monetary_amount: '',
      prior_negotiation: '',
      prior_negotiation_details: '',
      desired_outcome: '',
    }
  })

  // Auto-save every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    }, 30000)
    return () => clearInterval(timer)
  }, [form, DRAFT_KEY])

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (step === 1 && !form.relationship_type) e.relationship_type = 'Please select a relationship type.'
    if (step === 2) {
      if (!form.statement.trim()) e.statement = 'Please describe your dispute.'
      else if (form.statement.trim().length < 50) e.statement = `Minimum 50 characters. Currently ${form.statement.trim().length}.`
    }
    if (step === 3 && !form.timeline.trim()) e.timeline = 'Please provide a timeline.'
    if (step === 4 && form.monetary_amount && isNaN(Number(form.monetary_amount))) e.monetary_amount = 'Please enter a valid number.'
    if (step === 5 && !form.prior_negotiation) e.prior_negotiation = 'Please select an option.'
    if (step === 6 && !form.desired_outcome.trim()) e.desired_outcome = 'Please describe your desired outcome.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (!validate()) return
    if (step < 6) { setStep(s => s + 1); window.scrollTo(0, 0) }
    else handleSubmit()
  }

  const handleSubmit = async () => {
    setLoading(true)
    setApiError('')
    try {
      const formData = new FormData()
      formData.append('statement', form.statement)
      formData.append('desired_outcome', form.desired_outcome)
      formData.append('timeline', form.timeline)
      formData.append('relationship_type', form.relationship_type)
      formData.append('prior_negotiation', form.prior_negotiation)
      if (form.monetary_amount) formData.append('monetary_amount', form.monetary_amount)

      const token = localStorage.getItem('nlu_token')
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/cases/${caseId}/submissions`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
      )

      if (res.status === 201) {
        localStorage.removeItem(DRAFT_KEY)
        setSubmitted(true)
      } else if (res.status === 409) {
        setApiError('You have already submitted for this case.')
      } else if (res.status === 401) {
        localStorage.removeItem('nlu_token')
        localStorage.removeItem('nlu_role')
        navigate('/auth/login')
      } else if (res.status === 403) {
        setApiError('You are not authorized for this case.')
      } else if (res.status === 404) {
        setApiError('Case not found. Please check your link.')
      } else {
        setApiError('Something went wrong. Please try again.')
      }
    } catch {
      setApiError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) return <SuccessScreen navigate={navigate} />

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        textarea { resize: vertical; }

        .iw { min-height: 100vh; background: var(--bg-page); font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 2rem 1rem 3rem; }

        /* Logo */
        .iw-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 2rem; }
        .iw-logo-text { font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.08em; }

        /* Card */
        .iw-card { background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-card); padding: 2.5rem; width: 100%; max-width: 640px; box-shadow: var(--shadow); }

        /* Step progress */
        .iw-progress { margin-bottom: 2rem; }
        .iw-progress-bar-bg { height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; margin-bottom: 1rem; }
        .iw-progress-bar-fill { height: 100%; background: var(--brand); border-radius: 99px; transition: width 0.4s ease; }
        .iw-steps-row { display: flex; justify-content: space-between; gap: 4px; }
        .iw-step-dot { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
        .iw-step-circle { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; transition: all 0.2s ease; border: 2px solid var(--border); color: var(--text-muted); background: var(--bg-card); }
        .iw-step-circle.done { background: var(--brand); border-color: var(--brand); color: #fff; }
        .iw-step-circle.active { background: var(--brand-light); border-color: var(--brand); color: var(--brand); }
        .iw-step-name { font-size: 10px; color: var(--text-muted); white-space: nowrap; }
        .iw-step-name.active { color: var(--brand); font-weight: 500; }

        /* Step header */
        .iw-step-label { font-size: 12px; font-weight: 500; color: var(--brand); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        .iw-step-title { font-family: 'Sora', sans-serif; font-size: clamp(18px, 3vw, 22px); font-weight: 700; color: var(--text-primary); margin-bottom: 1.75rem; line-height: 1.3; }

        /* Relationship cards */
        .iw-rel-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 0.5rem; }
        .iw-rel-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1.5px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.15s; background: var(--bg-card); }
        .iw-rel-card:hover { border-color: var(--brand); background: var(--brand-light); }
        .iw-rel-card.active { border-color: var(--brand); background: var(--brand-light); }
        .iw-rel-emoji { font-size: 20px; flex-shrink: 0; }
        .iw-rel-label { font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .iw-rel-card.full { grid-column: span 2; }

        /* Inputs */
        .iw-field { margin-bottom: 1.25rem; }
        .iw-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px; }
        .iw-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .iw-char-count { font-size: 12px; color: var(--text-muted); }
        .iw-char-count.ok { color: #16a34a; }
        .iw-input { width: 100%; padding: 13px 15px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: var(--text-primary); background: var(--bg-input); outline: none; transition: border-color 0.15s; }
        .iw-input:focus { border-color: var(--brand); }
        .iw-input.err { border-color: var(--error); }
        .iw-textarea { width: 100%; padding: 13px 15px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: var(--text-primary); background: var(--bg-input); outline: none; transition: border-color 0.15s; min-height: 140px; line-height: 1.6; }
        .iw-textarea:focus { border-color: var(--brand); }
        .iw-textarea.err { border-color: var(--error); }
        .iw-err-text { font-size: 12px; color: var(--error); margin-top: 5px; display: flex; align-items: center; gap: 4px; }

        /* Amount field */
        .iw-amount-wrap { position: relative; }
        .iw-amount-prefix { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); font-size: 14px; font-weight: 500; color: var(--text-muted); }
        .iw-amount-input { padding-left: 42px !important; }
        .iw-optional-tag { font-size: 11px; color: var(--text-placeholder); font-weight: 400; }

        /* Yes/No toggle */
        .iw-yn-row { display: flex; gap: 10px; margin-bottom: 1rem; }
        .iw-yn-btn { flex: 1; padding: 13px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 14px; font-weight: 500; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all 0.15s; background: var(--bg-card); color: var(--text-secondary); }
        .iw-yn-btn.yes.active { border-color: #16a34a; background: #f0fdf4; color: #16a34a; }
        .iw-yn-btn.no.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand); }
        [data-theme="dark"] .iw-yn-btn.yes.active { background: rgba(22,163,74,0.15); }
        [data-theme="dark"] .iw-yn-btn.no.active { background: var(--brand-light); }

        /* API error */
        .iw-api-error { background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error); border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px; }

        /* Auto-save indicator */
        .iw-autosave { font-size: 11px; color: var(--text-muted); text-align: center; margin-bottom: 1rem; }

        /* Footer */
        .iw-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; gap: 12px; }
        .iw-back-btn { display: flex; align-items: center; gap: 8px; background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 10px; padding: 12px 20px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
        .iw-back-btn:hover { border-color: var(--brand); color: var(--brand); }
        .iw-next-btn { display: flex; align-items: center; gap: 8px; background: var(--brand); border: none; border-radius: 10px; padding: 12px 24px; font-size: 14px; font-family: 'Sora', sans-serif; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.15s; margin-left: auto; }
        .iw-next-btn:hover:not(:disabled) { background: var(--brand-hover); }
        .iw-next-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .iw-next-btn.submit { background: #16a34a; }
        .iw-next-btn.submit:hover:not(:disabled) { background: #15803d; }

        /* Success screen */
        .iw-success { min-height: 100vh; background: var(--bg-page); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; font-family: 'DM Sans', sans-serif; }
        .iw-success-card { background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-card); padding: 3rem 2.5rem; width: 100%; max-width: 520px; box-shadow: var(--shadow); text-align: center; }
        .iw-success-icon { width: 72px; height: 72px; border-radius: 50%; background: #f0fdf4; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
        .iw-success-title { font-family: 'Sora', sans-serif; font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; }
        .iw-success-sub { font-size: 14px; color: var(--text-muted); line-height: 1.65; margin-bottom: 2rem; }
        .iw-success-btn { display: inline-flex; align-items: center; gap: 8px; background: var(--brand); border: none; border-radius: 10px; padding: 13px 28px; font-size: 14px; font-family: 'Sora', sans-serif; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.15s; }
        .iw-success-btn:hover { background: var(--brand-hover); }

        @media (max-width: 520px) {
          .iw { padding: 1.5rem 1rem 2rem; }
          .iw-card { padding: 1.75rem 1.25rem; border-radius: 16px; }
          .iw-rel-grid { grid-template-columns: 1fr; }
          .iw-rel-card.full { grid-column: span 1; }
          .iw-steps-row { gap: 2px; }
          .iw-step-name { display: none; }
          .iw-step-circle { width: 24px; height: 24px; font-size: 10px; }
        }
      `}</style>

      <div className="iw">
        <div className="iw-logo">
          <Scale size={26} color="var(--brand)" strokeWidth={1.8} />
          <span className="iw-logo-text">SULAH</span>
        </div>

        <div className="iw-card">
          {/* Progress */}
          <div className="iw-progress">
            <div className="iw-progress-bar-bg">
              <div className="iw-progress-bar-fill" style={{ width: `${((step - 1) / 5) * 100}%` }} />
            </div>
            <div className="iw-steps-row">
              {STEPS.map(s => (
                <div key={s.id} className="iw-step-dot">
                  <div className={`iw-step-circle ${s.id < step ? 'done' : s.id === step ? 'active' : ''}`}>
                    {s.id < step ? <Check size={12} /> : s.id}
                  </div>
                  <span className={`iw-step-name ${s.id === step ? 'active' : ''}`}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step content */}
          <p className="iw-step-label">Step {step} of 6</p>
          <h2 className="iw-step-title">{STEPS[step - 1].title}</h2>

          {/* Step 1 — Relationship type */}
          {step === 1 && (
            <div>
              <div className="iw-rel-grid">
                {RELATIONSHIP_OPTIONS.slice(0, 4).map(opt => (
                  <div
                    key={opt.value}
                    className={`iw-rel-card${form.relationship_type === opt.value ? ' active' : ''}`}
                    onClick={() => update('relationship_type', opt.value)}
                  >
                    <span className="iw-rel-emoji">{opt.icon}</span>
                    <span className="iw-rel-label">{opt.label}</span>
                  </div>
                ))}
                <div
                  className={`iw-rel-card full${form.relationship_type === 'other' ? ' active' : ''}`}
                  onClick={() => update('relationship_type', 'other')}
                >
                  <span className="iw-rel-emoji">📋</span>
                  <span className="iw-rel-label">Other</span>
                </div>
              </div>
              {errors.relationship_type && <p className="iw-err-text"><AlertCircle size={12} />{errors.relationship_type}</p>}
            </div>
          )}

          {/* Step 2 — Statement */}
          {step === 2 && (
            <div className="iw-field">
              <div className="iw-label-row">
                <label className="iw-label">Your statement</label>
                <span className={`iw-char-count${form.statement.length >= 50 ? ' ok' : ''}`}>
                  {form.statement.length} / 50 min
                </span>
              </div>
              <textarea
                className={`iw-textarea${errors.statement ? ' err' : ''}`}
                placeholder="Describe the dispute in detail. What happened? When did it start? What is the impact on you?"
                value={form.statement}
                onChange={e => update('statement', e.target.value)}
              />
              {errors.statement && <p className="iw-err-text"><AlertCircle size={12} />{errors.statement}</p>}
            </div>
          )}

          {/* Step 3 — Timeline */}
          {step === 3 && (
            <div className="iw-field">
              <label className="iw-label">When did the dispute begin?</label>
              <input
                className={`iw-input${errors.timeline ? ' err' : ''}`}
                placeholder="e.g. March 2024, approximately 6 months ago..."
                value={form.timeline}
                onChange={e => update('timeline', e.target.value)}
              />
              {errors.timeline && <p className="iw-err-text"><AlertCircle size={12} />{errors.timeline}</p>}
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.5 }}>
                Include key dates if you remember them — when the dispute started, any important events, deadlines missed, or payments not received.
              </p>
            </div>
          )}

          {/* Step 4 — Monetary amount */}
          {step === 4 && (
            <div className="iw-field">
              <div className="iw-label-row">
                <label className="iw-label">Monetary amount</label>
                <span className="iw-optional-tag">Optional</span>
              </div>
              <div className="iw-amount-wrap">
                <span className="iw-amount-prefix">₹</span>
                <input
                  className={`iw-input iw-amount-input${errors.monetary_amount ? ' err' : ''}`}
                  type="number"
                  placeholder="0.00"
                  value={form.monetary_amount}
                  onChange={e => update('monetary_amount', e.target.value)}
                  min="0"
                />
              </div>
              {errors.monetary_amount && <p className="iw-err-text"><AlertCircle size={12} />{errors.monetary_amount}</p>}
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.5 }}>
                Enter the total amount in dispute, if applicable. Leave blank if the dispute is not financial in nature.
              </p>
            </div>
          )}

          {/* Step 5 — Prior negotiation */}
          {step === 5 && (
            <div>
              <div className="iw-yn-row">
                <button
                  className={`iw-yn-btn yes${form.prior_negotiation === 'true' ? ' active' : ''}`}
                  onClick={() => update('prior_negotiation', 'true')}
                >
                  ✓ Yes, I have tried
                </button>
                <button
                  className={`iw-yn-btn no${form.prior_negotiation === 'false' ? ' active' : ''}`}
                  onClick={() => update('prior_negotiation', 'false')}
                >
                  ✗ No, not yet
                </button>
              </div>
              {errors.prior_negotiation && <p className="iw-err-text"><AlertCircle size={12} />{errors.prior_negotiation}</p>}
              {form.prior_negotiation === 'true' && (
                <div className="iw-field">
                  <label className="iw-label">What did you try? What was the outcome?</label>
                  <textarea
                    className="iw-textarea"
                    placeholder="Describe previous attempts to resolve this dispute — meetings, emails, offers made..."
                    value={form.prior_negotiation_details}
                    onChange={e => update('prior_negotiation_details', e.target.value)}
                    style={{ minHeight: '120px' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 6 — Desired outcome */}
          {step === 6 && (
            <div className="iw-field">
              <label className="iw-label">What resolution are you hoping for?</label>
              <textarea
                className={`iw-textarea${errors.desired_outcome ? ' err' : ''}`}
                placeholder="Describe the outcome you want — a payment, an agreement, an apology, a change in behaviour..."
                value={form.desired_outcome}
                onChange={e => update('desired_outcome', e.target.value)}
              />
              {errors.desired_outcome && <p className="iw-err-text"><AlertCircle size={12} />{errors.desired_outcome}</p>}
            </div>
          )}

          {apiError && (
            <div className="iw-api-error">
              <AlertCircle size={16} />
              {apiError}
            </div>
          )}

          <p className="iw-autosave">Draft auto-saves every 30 seconds</p>

          {/* Footer */}
          <div className="iw-footer">
            {step > 1 ? (
              <button className="iw-back-btn" onClick={() => { setStep(s => s - 1); setErrors({}) }}>
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <button className="iw-back-btn" onClick={() => navigate('/party')}>
                <ChevronLeft size={16} /> Dashboard
              </button>
            )}

            <button
              className={`iw-next-btn${step === 6 ? ' submit' : ''}`}
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? 'Submitting…' : step === 6 ? 'Submit Dispute' : 'Continue'}
              {!loading && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function SuccessScreen({ navigate }) {
  return (
    <div className="iw-success" style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '20px',
        border: '1px solid var(--border-card)',
        padding: '3rem 2.5rem',
        width: '100%',
        maxWidth: '520px',
        boxShadow: 'var(--shadow)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: '#f0fdf4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
          Submission received
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '2rem' }}>
          Your dispute has been submitted successfully. We're now waiting for the other party to submit their statement. You'll be notified once both statements are in and AI analysis begins.
</p>
        <button
          onClick={() => navigate('/party')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'var(--brand)', border: 'none', borderRadius: '10px',
            padding: '13px 28px', fontSize: '14px',
            fontFamily: "'Sora', sans-serif", fontWeight: 600,
            color: '#fff', cursor: 'pointer',
          }}
        >
          Back to Dashboard
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  )
}