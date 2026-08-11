import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, ChevronRight, ChevronLeft, AlertCircle, CheckCircle } from 'lucide-react'
import client from '../../services/api'

const DISPUTE_TYPES = [
  { value: 'landlord_tenant', label: 'Landlord / Tenant', icon: '🏠' },
  { value: 'employer_employee', label: 'Employer / Employee', icon: '💼' },
  { value: 'commercial', label: 'Commercial / Business', icon: '🤝' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { value: 'neighbours', label: 'Neighbours', icon: '🏘️' },
  { value: 'contractor_client', label: 'Contractor / Client', icon: '🔧' },
  { value: 'other', label: 'Other', icon: '📋' },
]

export default function ApplyForMediation() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [applicationId, setApplicationId] = useState(null)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')

  const [form, setForm] = useState({
    dispute_type: '',
    brief_description: '',
    against_party_name: '',
    against_party_email: '',
    against_party_phone: '',
    monetary_value: '',
  })

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.dispute_type) e.dispute_type = 'Please select a dispute type.'
    if (!form.brief_description.trim()) e.brief_description = 'Please describe your dispute.'
    else if (form.brief_description.trim().length < 20) e.brief_description = 'Minimum 20 characters.'
    else if (form.brief_description.trim().length > 500) e.brief_description = 'Maximum 500 characters.'
    if (!form.against_party_name.trim()) e.against_party_name = 'Name is required.'
    if (!form.against_party_email.trim()) e.against_party_email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.against_party_email)) e.against_party_email = 'Enter a valid email address.'
    if (!form.against_party_phone.trim()) e.against_party_phone = 'Phone number is required.'
    if (form.monetary_value && isNaN(Number(form.monetary_value))) {
      e.monetary_value = 'Enter a valid number.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    setApiError('')
    try {
      const payload = {
        dispute_type: form.dispute_type,
        brief_description: form.brief_description,
        against_party_name: form.against_party_name || null,
        against_party_email: form.against_party_email || null,
        against_party_phone: form.against_party_phone || null,
        monetary_value: form.monetary_value ? Number(form.monetary_value) : null,
      }
      const res = await client.post('/cases/apply/submit', payload)
      setApplicationId(res.data.id)
      setSubmitted(true)
    } catch (err) {
      if (err.response?.status === 503) {
        setApiError('No mediators are available right now. Please try again later.')
      } else {
        setApiError(err.response?.data?.detail?.message || 'Something went wrong. Please try again.')
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
        textarea { resize: vertical; }

        .af { min-height: 100vh; background: var(--bg-page); font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 2rem 1rem 3rem; }
        .af-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 2rem; }
        .af-logo-text { font-family: 'Sora', sans-serif; font-size: 20px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.08em; }
        .af-card { background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-card); padding: 2.5rem; width: 100%; max-width: 600px; box-shadow: var(--shadow); }

        .af-tag { font-size: 12px; font-weight: 500; color: var(--brand); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        .af-title { font-family: 'Sora', sans-serif; font-size: clamp(20px, 3vw, 24px); font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
        .af-sub { font-size: 14px; color: var(--text-muted); line-height: 1.65; margin-bottom: 2rem; }

        .af-section-title { font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; padding-bottom: 8px; border-bottom: 1px solid var(--border); }

        /* Dispute type grid */
        .af-type-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 0.5rem; }
        .af-type-card { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 1.5px solid var(--border); border-radius: 10px; cursor: pointer; transition: all 0.15s; background: var(--bg-card); }
        .af-type-card:hover { border-color: var(--brand); background: var(--brand-light); }
        .af-type-card.active { border-color: var(--brand); background: var(--brand-light); }
        .af-type-emoji { font-size: 18px; flex-shrink: 0; }
        .af-type-label { font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .af-type-card.full { grid-column: span 2; }

        .af-field { margin-bottom: 1.25rem; }
        .af-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px; }
        .af-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .af-optional { font-size: 11px; color: var(--text-placeholder); font-weight: 400; }
        .af-char-count { font-size: 12px; color: var(--text-muted); }
        .af-char-count.ok { color: #16a34a; }
        .af-input { width: 100%; padding: 12px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: var(--text-primary); background: var(--bg-input); outline: none; transition: border-color 0.15s; }
        .af-input:focus { border-color: var(--brand); }
        .af-input.err { border-color: var(--error); }
        .af-textarea { width: 100%; padding: 12px 14px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: var(--text-primary); background: var(--bg-input); outline: none; transition: border-color 0.15s; min-height: 120px; line-height: 1.6; }
        .af-textarea:focus { border-color: var(--brand); }
        .af-textarea.err { border-color: var(--error); }
        .af-err-text { font-size: 12px; color: var(--error); margin-top: 4px; display: flex; align-items: center; gap: 4px; }
        .af-amount-wrap { position: relative; }
        .af-amount-prefix { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 14px; font-weight: 500; color: var(--text-muted); }
        .af-amount-input { padding-left: 30px !important; }

        .af-hint { font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-top: 6px; }
        .af-divider { height: 1px; background: var(--border); margin: 1.5rem 0; }

        .af-api-error { background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error); border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 1rem; display: flex; gap: 8px; align-items: flex-start; line-height: 1.5; }

        .af-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; gap: 12px; }
        .af-back-btn { display: flex; align-items: center; gap: 8px; background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 10px; padding: 12px 20px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
        .af-back-btn:hover { border-color: var(--brand); color: var(--brand); }
        .af-submit-btn { display: flex; align-items: center; gap: 8px; background: var(--brand); border: none; border-radius: 10px; padding: 12px 24px; font-size: 14px; font-family: 'Sora', sans-serif; font-weight: 600; color: #fff; cursor: pointer; transition: background 0.15s; margin-left: auto; }
        .af-submit-btn:hover:not(:disabled) { background: var(--brand-hover); }
        .af-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        @media (max-width: 520px) {
          .af { padding: 1.5rem 1rem 2rem; }
          .af-card { padding: 1.75rem 1.25rem; border-radius: 16px; }
          .af-type-grid { grid-template-columns: 1fr; }
          .af-type-card.full { grid-column: span 1; }
        }
      `}</style>

      <div className="af">
        <div className="af-logo">
          <Scale size={26} color="var(--brand)" strokeWidth={1.8} />
          <span className="af-logo-text">SULAH</span>
        </div>

        <div className="af-card">
          {!submitted ? (
            <>
              <p className="af-tag">Apply for Mediation</p>
              <h2 className="af-title">Tell us about your dispute</h2>
              <p className="af-sub">A mediator will be assigned to review your application. You'll receive an invitation link once your application is accepted.</p>

              {/* Dispute type */}
              <p className="af-section-title">Dispute Type</p>
              <div className="af-type-grid">
                {DISPUTE_TYPES.slice(0, 6).map(opt => (
                  <div
                    key={opt.value}
                    className={`af-type-card${form.dispute_type === opt.value ? ' active' : ''}`}
                    onClick={() => update('dispute_type', opt.value)}
                  >
                    <span className="af-type-emoji">{opt.icon}</span>
                    <span className="af-type-label">{opt.label}</span>
                  </div>
                ))}
                <div
                  className={`af-type-card full${form.dispute_type === 'other' ? ' active' : ''}`}
                  onClick={() => update('dispute_type', 'other')}
                >
                  <span className="af-type-emoji">📋</span>
                  <span className="af-type-label">Other</span>
                </div>
              </div>
              {errors.dispute_type && <p className="af-err-text" style={{ marginBottom: '1rem' }}><AlertCircle size={12} />{errors.dispute_type}</p>}

              <div className="af-divider" />

              {/* Brief description */}
              <p className="af-section-title">Dispute Summary</p>
              <div className="af-field">
                <div className="af-label-row">
                  <label className="af-label" style={{ margin: 0 }}>Brief description</label>
                  <span className={`af-char-count${form.brief_description.length >= 20 ? ' ok' : ''}`}>
                    {form.brief_description.length} / 500
                  </span>
                </div>
                <textarea
                  className={`af-textarea${errors.brief_description ? ' err' : ''}`}
                  placeholder="Briefly describe the nature of your dispute and what you hope mediation can resolve..."
                  value={form.brief_description}
                  onChange={e => update('brief_description', e.target.value)}
                  maxLength={500}
                />
                {errors.brief_description && <p className="af-err-text"><AlertCircle size={12} />{errors.brief_description}</p>}
              </div>

              {/* Monetary value */}
              <div className="af-field">
                <div className="af-label-row">
                  <label className="af-label" style={{ margin: 0 }}>Monetary amount involved</label>
                  <span className="af-optional">Optional</span>
                </div>
                <div className="af-amount-wrap">
                  <span className="af-amount-prefix">₹</span>
                  <input
                    type="number"
                    className={`af-input af-amount-input${errors.monetary_value ? ' err' : ''}`}
                    placeholder="0.00"
                    value={form.monetary_value}
                    onChange={e => update('monetary_value', e.target.value)}
                    min="0"
                  />
                </div>
                {errors.monetary_value && <p className="af-err-text"><AlertCircle size={12} />{errors.monetary_value}</p>}
              </div>

              <div className="af-divider" />

              {/* Against party details */}
             <p className="af-section-title">Other Party Details</p>
             <div className="af-field">
                <label className="af-label">Their name</label>
                <input
                  className={`af-input${errors.against_party_name ? ' err' : ''}`}
                  placeholder="Full name"
                  value={form.against_party_name}
                  onChange={e => update('against_party_name', e.target.value)}
                />
                {errors.against_party_name && <p className="af-err-text"><AlertCircle size={12} />{errors.against_party_name}</p>}
              </div>

              <div className="af-field">
                <label className="af-label">Their email</label>
                <input
                  type="email"
                  className={`af-input${errors.against_party_email ? ' err' : ''}`}
                  placeholder="their@email.com"
                  value={form.against_party_email}
                  onChange={e => update('against_party_email', e.target.value)}
                />
                {errors.against_party_email && <p className="af-err-text"><AlertCircle size={12} />{errors.against_party_email}</p>}
                <p className="af-hint">The mediator will use this to send them an invitation.</p></div>

             <div className="af-field">
                <label className="af-label">Their phone number</label>
                <input
                  className={`af-input${errors.against_party_phone ? ' err' : ''}`}
                  placeholder="+91 00000 00000"
                  value={form.against_party_phone}
                  onChange={e => update('against_party_phone', e.target.value)}
                />
                {errors.against_party_phone && <p className="af-err-text"><AlertCircle size={12} />{errors.against_party_phone}</p>}
              </div>

              {apiError && (
                <div className="af-api-error">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  {apiError}
                </div>
              )}

              <div className="af-footer">
                <button className="af-back-btn" onClick={() => navigate('/party')}>
                  <ChevronLeft size={16} /> Dashboard
                </button>
                <button className="af-submit-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Submitting…' : 'Submit Application'}
                  {!loading && <ChevronRight size={16} />}
                </button>
              </div>
            </>
          ) : (
            /* Success screen */
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <CheckCircle size={32} color="#16a34a" />
              </div>
              <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                Application submitted!
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '0.5rem' }}>
                A mediator has been assigned to review your application.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '2rem' }}>
                You'll receive an invitation link once your application is accepted. You can track the status on your dashboard.
              </p>
              <button
                onClick={() => navigate('/party')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--brand)', border: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 14, fontFamily: "'Sora', sans-serif", fontWeight: 600, color: '#fff', cursor: 'pointer' }}
              >
                Go to Dashboard <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}