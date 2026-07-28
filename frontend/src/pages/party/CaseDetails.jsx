import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Scale, ChevronLeft, FileText, Upload, Clock,
  CheckCircle, AlertCircle, Loader, ChevronRight,
  User, Calendar, Hash
} from 'lucide-react'
import client from '../../services/api'

import AnalysisStatusBanner from '../../components/party/AnalysisStatusBanner'
import BatnaWatnaPartyDisplay from '../../components/party/BatnaWatnaPartyDisplay'
import { getDocuments, getSettlementStatus } from '../../api/cases'

// ── Timeline steps ────────────────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { key: 'INVITED',            label: 'Invited',                desc: 'You accepted the invitation' },
  { key: 'SUBMITTED',         label: 'Statement submitted',    desc: 'Your dispute statement was received' },
  { key: 'BOTH_SUBMITTED',    label: 'Both parties submitted', desc: 'AI analysis has begun' },
  { key: 'AI_ANALYSIS',       label: 'AI Analysis',            desc: 'Analysing your statements' },
  { key: 'QUESTIONNAIRE',     label: 'Questionnaire',          desc: 'Answer AI-generated questions' },
  { key: 'BATNA_WATNA',       label: 'Case Analysis',          desc: 'Your BATNA/WATNA is ready' },
  { key: 'PROPOSAL',          label: 'Proposal',               desc: 'Review mediator\'s proposal' },
  { key: 'SETTLEMENT',        label: 'Settlement',             desc: 'Case concluded' },
]

const STATUS_STEP_MAP = {
  BOTH_INVITED:             0,
  FIRST_PARTY_SUBMITTED:    1,
  BOTH_SUBMITTED:           2,
  BURST_1_PROCESSING:       3,
  BURST_1_COMPLETE:         3,
  PROCESSING_FAILED:        3,
  // Week 4 statuses
  QUESTIONNAIRE_ACTIVE:     4,
  QUESTIONNAIRE_COMPLETE:   4,
  BURST_2_PROCESSING:       5,
  BURST_2_COMPLETE:         5,
  PROPOSAL_DRAFT:           6,
  PROPOSAL_PUBLISHED:       6,
  MEDIATION_IN_PROGRESS:    6,
  MEDIATION_COMPLETE:       7,
  MEDIATION_FAILED:         6,
  // Legacy
  QUESTIONNAIRE_PENDING:    4,
  PROPOSAL_PENDING:         6,
  SETTLED:                  7,
  CLOSED:                   7,
}

// Statuses where BATNA/WATNA section should be shown
const BURST_2_STATUSES = new Set([
  'BURST_2_COMPLETE',
  'PROPOSAL_DRAFT',
  'PROPOSAL_PUBLISHED',
  'MEDIATION_IN_PROGRESS',
  'MEDIATION_COMPLETE',
  'MEDIATION_FAILED',
])

const RELATIONSHIP_LABELS = {
  landlord_tenant:   'Landlord / Tenant',
  employer_employee: 'Employer / Employee',
  commercial:        'Commercial / Business',
  family:            'Family',
  other:             'Other',
}

const ACTION_NEEDED = {
  BOTH_INVITED:            { msg: 'Please submit your dispute statement.',             action: null },
  FIRST_PARTY_SUBMITTED:   { msg: 'Waiting for the other party to submit.',            action: null },
  BOTH_SUBMITTED:          { msg: 'Both statements received. AI analysis starting.',   action: null },
  BURST_1_PROCESSING:      { msg: 'AI is analysing the dispute. Please wait.',         action: null },
  BURST_1_COMPLETE:        { msg: 'Analysis complete. Mediator is reviewing results.', action: null },
  PROCESSING_FAILED:       { msg: 'Analysis failed. Your mediator has been notified.', action: null },
  // Week 4
  QUESTIONNAIRE_ACTIVE:    { msg: 'Please answer the AI-generated questionnaire.',     action: 'questionnaire' },
  QUESTIONNAIRE_COMPLETE:  { msg: 'Questionnaire submitted. Awaiting analysis.',       action: null },
  BURST_2_PROCESSING:      { msg: 'Analysing questionnaire responses. Please wait.',   action: null },
  BURST_2_COMPLETE:        { msg: 'Your case analysis is ready. Review below.',        action: null },
  PROPOSAL_DRAFT:          { msg: 'The mediator is preparing a proposal.',             action: null },
  PROPOSAL_PUBLISHED:      { msg: 'A proposal is ready for your review.',              action: 'proposal' },
  MEDIATION_IN_PROGRESS:   { msg: 'The mediator is reviewing feedback. Stand by.',     action: null },
  MEDIATION_COMPLETE:      { msg: 'Both parties accepted. Confirm your settlement.',   action: 'settlement' },
  MEDIATION_FAILED:        { msg: 'Mediation could not be completed.',                 action: null },
  // Legacy
  QUESTIONNAIRE_PENDING:   { msg: 'Please answer the AI-generated questionnaire.',     action: 'questionnaire' },
  PROPOSAL_PENDING:        { msg: 'A proposal is ready for your review.',              action: 'proposal' },
  SETTLED:                 { msg: 'This case has been settled.',                       action: 'settlement' },
}

export default function CaseDetails() {
  const navigate = useNavigate()
  const { id: caseId } = useParams()

  const [caseData, setCaseData] = useState(null)
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [documents, setDocuments] = useState([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [settlementConfirmed, setSettlementConfirmed] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [caseRes, subRes] = await Promise.all([
          client.get(`/cases/${caseId}`),
          client.get(`/cases/${caseId}/submissions`),
        ])
        setCaseData(caseRes.data)
        setSubmission(subRes.data.submissions?.[0] || null)
      } catch (err) {
        if (err.response?.status === 403) setError('You are not authorised to view this case.')
        else setError('Failed to load case details. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [caseId])
  useEffect(() => {
  const fetchDocuments = async () => {
    try {
      const res = await getDocuments(caseId)
      const docs = Array.isArray(res) ? res : res.documents ?? []
      setDocuments(docs)
    } catch {
      setDocuments([])
    } finally {
      setDocsLoading(false)
    }
  }
  fetchDocuments()
}, [caseId])

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await getDocuments(caseId)
        const docs = Array.isArray(res) ? res : res.documents ?? []
        setDocuments(docs)
      } catch {
        setDocuments([])
      } finally {
        setDocsLoading(false)
      }
    }
    fetchDocuments()
  }, [caseId])

  useEffect(() => {
    if (caseData?.status !== 'MEDIATION_COMPLETE') return
    const checkSettlement = async () => {
      try {
        const status = await getSettlementStatus(caseId)
        const role = caseData?.your_role_in_this_case
        if (role && status?.[role]?.confirmed) {
          setSettlementConfirmed(true)
        }
      } catch {
        // fail silently
      }
    }
    checkSettlement()
  }, [caseData, caseId])


const currentStep = STATUS_STEP_MAP[caseData?.status] ?? 0
  let actionInfo  = ACTION_NEEDED[caseData?.status]
  if (caseData?.status === 'QUESTIONNAIRE_ACTIVE' && caseData?.user_has_submitted_questionnaire) {
    actionInfo = { msg: 'Questionnaire submitted. Awaiting response from the other party.', action: null }
  }
  if (caseData?.status === 'MEDIATION_COMPLETE' && settlementConfirmed) {
    actionInfo = { msg: 'You have confirmed the settlement. You can download the PDF once it is ready.', action: null }
  }
  const showBatna   = BURST_2_STATUSES.has(caseData?.status)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .cd { min-height: 100vh; background: var(--bg-page); font-family: 'DM Sans', sans-serif; padding: 2rem 1.25rem; max-width: 800px; margin: 0 auto; }

        .cd-back { display: flex; align-items: center; gap: 6px; background: none; border: none; font-size: 13px; color: var(--text-muted); cursor: pointer; font-family: 'DM Sans', sans-serif; margin-bottom: 1.5rem; padding: 0; }
        .cd-back:hover { color: var(--brand); }
        .cd-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.75rem; gap: 1rem; flex-wrap: wrap; }
        .cd-title { font-family: 'Sora', sans-serif; font-size: clamp(20px, 3vw, 26px); font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .cd-sub { font-size: 13px; color: var(--text-muted); }
        .cd-role-badge { font-size: 11px; font-weight: 500; padding: 4px 12px; border-radius: 99px; background: var(--brand-light); color: var(--brand); white-space: nowrap; }

        .cd-card { background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-card); padding: 1.5rem; margin-bottom: 1.25rem; }
        .cd-card-title { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 1.25rem; display: flex; align-items: center; gap: 8px; }

        .cd-timeline { display: flex; flex-direction: column; gap: 0; }
        .cd-timeline-item { display: flex; gap: 14px; }
        .cd-timeline-left { display: flex; flex-direction: column; align-items: center; }
        .cd-timeline-circle { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; font-weight: 600; transition: all 0.2s; }
        .cd-timeline-circle.done   { background: var(--brand); color: #fff; }
        .cd-timeline-circle.active { background: var(--brand-light); border: 2px solid var(--brand); color: var(--brand); }
        .cd-timeline-circle.pending{ background: var(--bg-muted); border: 2px solid var(--border); color: var(--text-muted); }
        .cd-timeline-line { width: 2px; flex: 1; min-height: 20px; background: var(--border); margin: 2px 0; }
        .cd-timeline-line.done { background: var(--brand); }
        .cd-timeline-content { padding-bottom: 20px; }
        .cd-timeline-label { font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 2px; }
        .cd-timeline-label.active { color: var(--brand); }
        .cd-timeline-label.pending { color: var(--text-muted); }
        .cd-timeline-desc { font-size: 12px; color: var(--text-muted); line-height: 1.4; }

        .cd-action { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; background: var(--brand-light); border: 1.5px solid var(--brand); border-radius: 12px; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .cd-action-text { font-size: 13px; color: var(--brand); font-weight: 500; display: flex; align-items: center; gap: 8px; }
        .cd-action-btn { display: flex; align-items: center; gap: 6px; background: var(--brand); color: #fff; border: none; border-radius: 8px; padding: 9px 16px; font-size: 13px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .cd-action-btn:hover { background: var(--brand-hover); }

        .cd-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .cd-info-item { background: var(--bg-muted); border-radius: 10px; padding: 12px; }
        .cd-info-label { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; display: flex; align-items: center; gap: 4px; }
        .cd-info-value { font-size: 13px; font-weight: 500; color: var(--text-primary); }

        .cd-submission-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border); }
        .cd-submission-row:last-child { border-bottom: none; }
        .cd-submission-label { font-size: 12px; color: var(--text-muted); }
        .cd-submission-value { font-size: 13px; font-weight: 500; color: var(--text-primary); }

        .cd-empty { text-align: center; padding: 1.5rem; }
        .cd-empty-icon { width: 48px; height: 48px; border-radius: 10px; background: var(--bg-muted); display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem; }
        .cd-empty-text { font-size: 13px; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.5; }
        .cd-submit-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--brand); color: #fff; border: none; border-radius: 8px; padding: 10px 18px; font-size: 13px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; }
        .cd-submit-btn:hover { background: var(--brand-hover); }

        .cd-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 12px; color: var(--text-muted); font-size: 14px; }
        .cd-error { background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error); border-radius: 12px; padding: 1rem 1.25rem; font-size: 13px; display: flex; align-items: center; gap: 8px; }

        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media (max-width: 520px) {
          .cd { padding: 1.25rem 1rem; }
          .cd-info-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="cd">
        <button className="cd-back" onClick={() => navigate('/party')}>
          <ChevronLeft size={16} /> Back to Dashboard
        </button>

        {loading && (
          <div className="cd-loading">
            <Loader size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Loading case details…</span>
          </div>
        )}

        {!loading && error && (
          <div className="cd-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {!loading && !error && caseData && (
          <>
            {/* Page header */}
            <div className="cd-header">
              <div>
                <h1 className="cd-title">Case Details</h1>
                <p className="cd-sub">Case ID: {caseData.id?.slice(0, 8)}…</p>
              </div>
              {caseData.your_role_in_this_case && (
                <span className="cd-role-badge">
                  {caseData.your_role_in_this_case === 'requesting_party' ? 'Requesting Party' : 'Against Party'}
                </span>
              )}
            </div>

            {/* Action banner */}
            {actionInfo && (
              <div className="cd-action">
                <p className="cd-action-text">
                  <AlertCircle size={15} />
                  {actionInfo.msg}
                </p>
                {actionInfo.action === 'questionnaire' && (
                  <button className="cd-action-btn" onClick={() => navigate(`/party/cases/${caseId}/questionnaire`)}>
                    Answer Questions <ChevronRight size={14} />
                  </button>
                )}
                {actionInfo.action === 'proposal' && (
                  <button className="cd-action-btn" onClick={() => navigate(`/party/cases/${caseId}/proposal`)}>
                    View Proposal <ChevronRight size={14} />
                  </button>
                )}
                {actionInfo.action === 'settlement' && (
                  <button className="cd-action-btn" onClick={() => navigate(`/party/cases/${caseId}/settlement`)}>
                    Confirm Settlement <ChevronRight size={14} />
                  </button>
                )}
              </div>
            )}

            {['BOTH_SUBMITTED', 'BURST_1_PROCESSING', 'BURST_1_COMPLETE', 'PROCESSING_FAILED'].includes(caseData?.status) && (
  <AnalysisStatusBanner caseId={caseId} />
)}

            {/* Case info */}
            <div className="cd-card">
              <p className="cd-card-title"><FileText size={16} color="var(--brand)" /> Case Information</p>
              <div className="cd-info-grid">
                <div className="cd-info-item">
                  <p className="cd-info-label"><Hash size={11} /> Dispute Type</p>
                  <p className="cd-info-value">{RELATIONSHIP_LABELS[caseData.dispute_type] || caseData.dispute_type || '—'}</p>
                </div>
                <div className="cd-info-item">
                  <p className="cd-info-label"><Clock size={11} /> Status</p>
                  <p className="cd-info-value" style={{ color: 'var(--brand)' }}>{caseData.status?.replace(/_/g, ' ')}</p>
                </div>
               
                <div className="cd-info-item">
                  <p className="cd-info-label"><Calendar size={11} /> Created</p>
                  <p className="cd-info-value">{caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : '—'}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="cd-card">
              <p className="cd-card-title"><Clock size={16} color="var(--brand)" /> Case Progress</p>
              <div className="cd-timeline">
                {TIMELINE_STEPS.map((s, i) => {
                  const isDone   = i < currentStep
                  const isActive = i === currentStep
                  return (
                    <div key={s.key} className="cd-timeline-item">
                      <div className="cd-timeline-left">
                        <div className={`cd-timeline-circle ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
                          {isDone
                            ? <CheckCircle size={14} />
                            : isActive
                              ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                              : i + 1
                          }
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className={`cd-timeline-line ${isDone ? 'done' : ''}`} />
                        )}
                      </div>
                      <div className="cd-timeline-content">
                        <p className={`cd-timeline-label ${isDone ? '' : isActive ? 'active' : 'pending'}`}>{s.label}</p>
                        <p className="cd-timeline-desc">{s.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── BATNA/WATNA — visible from Burst 2 onwards ── */}
            {showBatna && (
              <div className="cd-card">
                <BatnaWatnaPartyDisplay caseId={caseId} />
              </div>
            )}

            {/* Submission summary */}
            <div className="cd-card">
              <p className="cd-card-title"><FileText size={16} color="var(--brand)" /> Your Submission</p>
              {submission ? (
                <>
                  <div className="cd-submission-row">
                    <span className="cd-submission-label">Relationship Type</span>
                    <span className="cd-submission-value">{RELATIONSHIP_LABELS[submission.relationship_type] || submission.relationship_type || '—'}</span>
                  </div>
                  <div className="cd-submission-row">
                    <span className="cd-submission-label">Submitted</span>
                    <span className="cd-submission-value">{new Date(submission.submitted_at).toLocaleString()}</span>
                  </div>
                  <div className="cd-submission-row">
                    <span className="cd-submission-label">Status</span>
                    <span className="cd-submission-value" style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle size={13} /> Received
                    </span>
                  </div>
                </>
              ) : (
                <div className="cd-empty">
                  <div className="cd-empty-icon">
                    <FileText size={22} color="var(--text-muted)" />
                  </div>
                  <p className="cd-empty-text">You haven't submitted your dispute statement yet.</p>
                  <button className="cd-submit-btn" onClick={() => navigate(`/party/cases/${caseId}/intake`)}>
                    <FileText size={14} /> Submit Statement
                  </button>
                </div>
              )}
            </div>

            {/* Documents */}
<div className="cd-card">
  <p className="cd-card-title"><Upload size={16} color="var(--brand)" /> Documents</p>
  {docsLoading ? (
    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading documents…</p>
  ) : documents.length > 0 ? (
    <>
      {documents.map((doc, i) => (
        <div key={doc.id || i} className="cd-submission-row">
          <span className="cd-submission-label">
            <FileText size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {doc.filename || doc.name || 'Document'}
          </span>
          <span className="cd-submission-value">
            {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : ''}
          </span>
        </div>
      ))}
      <button
        className="cd-submit-btn"
        style={{ marginTop: 12 }}
        onClick={() => navigate(`/party/cases/${caseId}/documents`)}
      >
        <Upload size={14} /> Upload More
      </button>
    </>
  ) : (
    <div className="cd-empty">
      <div className="cd-empty-icon">
        <Upload size={22} color="var(--text-muted)" />
      </div>
      <p className="cd-empty-text">Upload supporting documents to strengthen your case.</p>
      <button className="cd-submit-btn" onClick={() => navigate(`/party/cases/${caseId}/documents`)}>
        <Upload size={14} /> Upload Documents
      </button>
    </div>
  )}
</div>
          </>
        )}
      </div>
    </>
  )
}