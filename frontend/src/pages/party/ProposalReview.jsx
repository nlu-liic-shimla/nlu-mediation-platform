import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, CheckCircle, XCircle, AlertCircle,
  Loader, FileText, Clock
} from 'lucide-react'
import client from '../../services/api'

const MIN_REASON_CHARS = 20

export default function ProposalReview() {
  const navigate = useNavigate()
  const { id: caseId } = useParams()

  const [proposal, setProposal]           = useState(null)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [decision, setDecision]           = useState(null)   // 'accept' | 'reject' | 'done_accept' | 'done_reject'
  const [rejectOpen, setRejectOpen]       = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [submitError, setSubmitError]     = useState('')

  const user = JSON.parse(localStorage.getItem('nlu_user') || '{}')
  const userKey = user.user_id || user.email || 'guest'
  const decisionKey = `proposal_decision_${caseId}_${userKey}`

  useEffect(() => {
    const savedDecision = localStorage.getItem(decisionKey)
    if (savedDecision) {
      setDecision(savedDecision)
    }
  }, [caseId, decisionKey])

  useEffect(() => {
    const load = async () => {
      try {
        // Dev mode simulation: Check localStorage first
        const localProps = localStorage.getItem(`proposals_${caseId}`)
        let latest = null
        if (localProps) {
          const proposals = JSON.parse(localProps)
          const published = proposals.filter(p => p.status === 'published')
          latest = published[published.length - 1] ?? null
        }

        if (!latest) {
          const res = await client.get(`/cases/${caseId}/proposals`)
          const proposals = Array.isArray(res.data) ? res.data : res.data?.proposals ?? []
          latest = proposals[proposals.length - 1] ?? null
        }

        setProposal(latest)
      } catch (err) {
        setError(err?.response?.data?.detail ?? 'Failed to load proposal. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [caseId])

  const handleAccept = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      if (proposal?.id?.startsWith('mock-')) {
        setDecision('done_accept')
        localStorage.setItem(decisionKey, 'done_accept')
        
        // Count how many parties have accepted this mock proposal in localStorage
        let acceptCount = 1 // Count current user
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key.startsWith(`proposal_decision_${caseId}_`) && key !== decisionKey) {
            const val = localStorage.getItem(key)
            if (val === 'done_accept') {
              acceptCount++
            }
          }
        }

        if (acceptCount >= 2) {
          localStorage.setItem(`case_status_${caseId}`, 'MEDIATION_COMPLETE')
        } else {
          localStorage.setItem(`case_status_${caseId}`, 'PROPOSAL_PUBLISHED')
        }
      } else {
        await client.post(`/cases/${caseId}/proposals/${proposal.id}/respond`, {
          decision: 'accept'
        })
        setDecision('done_accept')
      }
    } catch (err) {
      const detail = err?.response?.data?.detail
      const msg = typeof detail === 'object' && detail !== null ? (detail.message || JSON.stringify(detail)) : (detail ?? 'Something went wrong. Please try again.')
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (rejectionReason.trim().length < MIN_REASON_CHARS) return
    setSubmitting(true)
    setSubmitError('')
    try {
      if (proposal?.id?.startsWith('mock-')) {
        setDecision('done_reject')
        localStorage.setItem(decisionKey, 'done_reject')
        localStorage.setItem(`case_status_${caseId}`, 'MEDIATION_IN_PROGRESS')
      } else {
        await client.post(`/cases/${caseId}/proposals/${proposal.id}/respond`, {
          decision: 'reject',
          rejection_reason: rejectionReason.trim()
        })
        setDecision('done_reject')
      }
    } catch (err) {
      if (err?.response?.status === 422) {
        const detail = err?.response?.data?.detail
        const msg = typeof detail === 'object' && detail !== null ? (detail.message || 'Validation error') : 'Your rejection reason must be at least 20 characters.'
        setSubmitError(msg)
      } else {
        const detail = err?.response?.data?.detail
        const msg = typeof detail === 'object' && detail !== null ? (detail.message || JSON.stringify(detail)) : (detail ?? 'Something went wrong. Please try again.')
        setSubmitError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const charCount = rejectionReason.trim().length
  const canSubmitReject = charCount >= MIN_REASON_CHARS

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .pr { min-height: 100vh; background: var(--bg-page); font-family: 'DM Sans', sans-serif; padding: 2rem 1.25rem; max-width: 720px; margin: 0 auto; }
    .pr-back { display: flex; align-items: center; gap: 6px; background: none; border: none; font-size: 13px; color: var(--text-muted); cursor: pointer; font-family: 'DM Sans', sans-serif; margin-bottom: 1.5rem; padding: 0; }
    .pr-back:hover { color: var(--brand); }

    /* Round badge */
    .pr-round { display: inline-flex; align-items: center; gap: 6px; background: var(--brand-light); border: 1px solid var(--brand); border-radius: 99px; padding: 5px 14px; font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600; color: var(--brand); margin-bottom: 1rem; }

    .pr-title { font-family: 'Sora', sans-serif; font-size: clamp(20px, 3vw, 26px); font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem; }
    .pr-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 1.75rem; }

    /* Cards */
    .pr-card { background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-card); padding: 1.5rem; margin-bottom: 1.25rem; }
    .pr-card-title { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 8px; }
    .pr-terms { font-size: 14px; color: var(--text-primary); line-height: 1.75; white-space: pre-wrap; }

    /* BATNA context note */
    .pr-context { display: flex; gap: 10px; align-items: flex-start; background: var(--bg-muted); border-radius: 10px; padding: 10px 14px; margin-bottom: 1.25rem; }
    .pr-context-text { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
    .pr-context-label { font-weight: 600; color: var(--text-primary); }

    /* Disclaimer */
    .pr-disclaimer { font-size: 11px; color: var(--text-muted); background: var(--bg-muted); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; margin-bottom: 1.5rem; line-height: 1.55; }

    /* Action buttons */
    .pr-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .pr-btn-accept { flex: 1; min-width: 140px; display: flex; align-items: center; justify-content: center; gap: 8px; background: #16a34a; color: #fff; border: none; border-radius: 10px; padding: 14px; font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
    .pr-btn-accept:hover { background: #15803d; }
    .pr-btn-accept:disabled { opacity: 0.6; cursor: not-allowed; }
    .pr-btn-reject-toggle { flex: 1; min-width: 140px; display: flex; align-items: center; justify-content: center; gap: 8px; background: none; border: 2px solid var(--border); border-radius: 10px; padding: 14px; font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: all 0.15s; }
    .pr-btn-reject-toggle:hover, .pr-btn-reject-toggle.open { border-color: #dc2626; color: #dc2626; }

    /* Reject expand */
    .pr-reject-expand { margin-top: 1.25rem; border: 1.5px solid #fca5a5; border-radius: 12px; padding: 1.25rem; background: #fff5f5; }
    .pr-reject-label { font-size: 13px; font-weight: 500; color: #7f1d1d; margin-bottom: 8px; }
    .pr-reject-textarea { width: 100%; min-height: 100px; border: 1.5px solid #fca5a5; border-radius: 10px; padding: 12px 14px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--text-primary); background: #fff; resize: vertical; outline: none; transition: border-color 0.2s; }
    .pr-reject-textarea:focus { border-color: #dc2626; }
    .pr-char-count { font-size: 11px; text-align: right; margin-top: 6px; color: var(--text-muted); }
    .pr-char-count.ok { color: #15803d; }
    .pr-btn-submit-reject { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: #dc2626; color: #fff; border: none; border-radius: 10px; padding: 12px; font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 1rem; transition: background 0.15s; }
    .pr-btn-submit-reject:hover { background: #b91c1c; }
    .pr-btn-submit-reject:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Status messages */
    .pr-status { display: flex; align-items: flex-start; gap: 12px; border-radius: 12px; padding: 1.25rem 1.5rem; }
    .pr-status.accept { background: #dcfce7; border: 1px solid #86efac; }
    .pr-status.reject { background: #fff7ed; border: 1px solid #fed7aa; }
    .pr-status-text { font-size: 14px; line-height: 1.6; }
    .pr-status-title { font-family: 'Sora', sans-serif; font-weight: 600; margin-bottom: 4px; }
    .pr-status-title.accept { color: #14532d; }
    .pr-status-title.reject { color: #7c2d12; }

    /* Submit error */
    .pr-submit-error { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--error); background: var(--error-bg); border: 1px solid var(--error-border); border-radius: 10px; padding: 10px 14px; margin-top: 12px; }

    /* Loading / error */
    .pr-center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 12px; color: var(--text-muted); font-size: 14px; }
    .pr-error { background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error); border-radius: 12px; padding: 1rem 1.25rem; font-size: 13px; display: flex; align-items: center; gap: 8px; }

    /* Empty state */
    .pr-empty { text-align: center; padding: 3rem 1rem; }
    .pr-empty-text { font-size: 14px; color: var(--text-muted); line-height: 1.6; }

    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @media (max-width: 480px) {
      .pr-actions { flex-direction: column; }
      .pr-btn-accept, .pr-btn-reject-toggle { min-width: unset; }
    }
  `

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="pr">
          <div className="pr-center">
            <Loader size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Loading proposal…</span>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div className="pr">
          <button className="pr-back" onClick={() => navigate(`/party/cases/${caseId}`)}>
            <ChevronLeft size={16} /> Back to Case
          </button>
          <div className="pr-error"><AlertCircle size={16} /> {error}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{styles}</style>
      <div className="pr">
        <button className="pr-back" onClick={() => navigate(`/party/cases/${caseId}`)}>
          <ChevronLeft size={16} /> Back to Case
        </button>

        {/* Round badge */}
        {proposal?.round_number && (
          <div className="pr-round">
            <Clock size={13} /> Round {proposal.round_number} of 3
          </div>
        )}

        <h1 className="pr-title">Mediator's Proposal</h1>
        <p className="pr-sub">Review the proposed settlement terms carefully before responding.</p>

        {!proposal ? (
          <div className="pr-empty">
            <p className="pr-empty-text">No proposal has been published yet. Check back soon.</p>
          </div>
        ) : (
          <>
            {/* Context note from BATNA (label as subtle note) */}
            {proposal.batna_label && (
              <div className="pr-context">
                <AlertCircle size={14} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                <p className="pr-context-text">
                  <span className="pr-context-label">Your position: </span>
                  Your best alternative has been assessed as <strong>{proposal.batna_label}</strong>. Consider this when reviewing the proposal.
                </p>
              </div>
            )}

            {/* Proposal terms */}
            <div className="pr-card">
              <p className="pr-card-title"><FileText size={16} color="var(--brand)" /> Proposed Settlement Terms</p>
              <p className="pr-terms">{proposal.raw_text}</p>
            </div>

            {/* Disclaimer */}
            <p className="pr-disclaimer">
              This proposal has been drafted by the mediator with AI assistance. It is not legally
              binding until both parties sign the final settlement agreement. You have the right to
              seek independent legal advice before responding.
            </p>

            {/* Decision taken — show status message */}
            {decision === 'done_accept' && (
              <div className="pr-status accept">
                <CheckCircle size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                <div className="pr-status-text">
                  <p className="pr-status-title accept">You have accepted the proposal.</p>
                  <p style={{ color: '#166534', fontSize: 13 }}>Waiting for the other party to respond. You'll be notified of the next step.</p>
                </div>
              </div>
            )}

            {decision === 'done_reject' && (
              <div className="pr-status reject">
                <XCircle size={20} color="#ea580c" style={{ flexShrink: 0, marginTop: 2 }} />
                <div className="pr-status-text">
                  <p className="pr-status-title reject">Your rejection has been submitted.</p>
                  <p style={{ color: '#7c2d12', fontSize: 13 }}>The mediator is reviewing your feedback and will prepare a revised proposal.</p>
                </div>
              </div>
            )}

            {/* Action buttons — only show if no decision yet */}
            {!decision && (
              <>
                <div className="pr-actions">
                  <button
                    className="pr-btn-accept"
                    onClick={handleAccept}
                    disabled={submitting}
                  >
                    {submitting && !rejectOpen
                      ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      : <CheckCircle size={16} />
                    }
                    Accept Proposal
                  </button>
                  <button
                    className={`pr-btn-reject-toggle ${rejectOpen ? 'open' : ''}`}
                    onClick={() => { setRejectOpen(r => !r); setSubmitError('') }}
                    disabled={submitting}
                  >
                    <XCircle size={16} /> Reject Proposal
                  </button>
                </div>

                {/* Rejection expand */}
                {rejectOpen && (
                  <div className="pr-reject-expand">
                    <p className="pr-reject-label">Please explain why you're rejecting this proposal:</p>
                    <textarea
                      className="pr-reject-textarea"
                      placeholder="Describe your concerns or what you'd like changed…"
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                    />
                    <p className={`pr-char-count ${canSubmitReject ? 'ok' : ''}`}>
                      {charCount} / {MIN_REASON_CHARS} minimum characters
                    </p>
                    <button
                      className="pr-btn-submit-reject"
                      onClick={handleReject}
                      disabled={!canSubmitReject || submitting}
                    >
                      {submitting
                        ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                        : <><XCircle size={14} /> Submit Rejection</>
                      }
                    </button>
                  </div>
                )}

                {submitError && (
                  <div className="pr-submit-error">
                    <AlertCircle size={15} /> {submitError}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}