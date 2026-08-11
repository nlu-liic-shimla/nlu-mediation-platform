import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, CheckCircle, Download, Loader,
  AlertCircle, FileText, User
} from 'lucide-react'
import client from '../../services/api'

  // 2 MB
const POLL_INTERVAL  = 3000              // 3 s

export default function Settlement() {
  const navigate = useNavigate()
  const { id: caseId } = useParams()

  // Case / proposal state
  const [proposal, setProposal]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  // Form state
  const [typedName, setTypedName]   = useState('')
  

  const stripMarkdown = (text) => (text || '').replace(/\*\*/g, '').replace(/\*/g, '')

  // Submission state
  const [confirming, setConfirming]   = useState(false)
  const [confirmed, setConfirmed]     = useState(false)
  const [submitError, setSubmitError] = useState('')
  

  // PDF polling state
  const [pdfReady, setPdfReady]   = useState(false)
  const [pdfUrl, setPdfUrl]       = useState('')
  const [polling, setPolling]     = useState(false)
  const pollRef = useRef(null)

  // ── Poll for PDF once confirmed ──────────────────────────────────────────
  const startPolling = () => {
    setPolling(true)
    pollRef.current = setInterval(async () => {
      try {
        const res = await client.get(`/cases/${caseId}/settlement/status`)
        if (res.data?.pdf_ready) {
          setPdfReady(true)
          setPdfUrl(res.data.pdf_url ?? '')
          clearInterval(pollRef.current)
          setPolling(false)
        }
      } catch (_) {}
    }, POLL_INTERVAL)
  }

  // ── Load latest accepted proposal and confirmation status ──────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // Fetch proposals
        const pRes = await client.get(`/cases/${caseId}/proposals`)
        const proposals = Array.isArray(pRes.data) ? pRes.data : pRes.data?.proposals ?? []
        const latest = proposals[proposals.length - 1] ?? null
        setProposal(latest)

        // Fetch case to get role
        const caseRes = await client.get(`/cases/${caseId}`)
        const role = caseRes.data?.your_role_in_this_case

        // Fetch settlement status
        const statusRes = await client.get(`/cases/${caseId}/settlement/status`)
        const statusData = statusRes.data

        if (role && statusData && statusData[role]) {
          if (statusData[role].confirmed) {
            setConfirmed(true)
            if (statusData.pdf_ready) {
              setPdfReady(true)
              setPdfUrl(statusData.pdf_url ?? '')
            } else {
              startPolling()
            }
          }
        }
      } catch (err) {
        setError(err?.response?.data?.detail ?? 'Failed to load settlement details.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [caseId])

  useEffect(() => () => clearInterval(pollRef.current), [])

  // ── Signature file handler ───────────────────────────────────────────────

  // ── Submit confirm ───────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!typedName.trim()) return
    setConfirming(true)
    setSubmitError('')
    try {
      const form = new FormData()
      form.append('full_name', typedName.trim())
      await client.post(`/cases/${caseId}/settlement/confirm`, form)
      setConfirmed(true)
      startPolling()
    } catch (err) {
      setSubmitError(err?.response?.data?.detail ?? 'Confirmation failed. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

 const canConfirm = typedName.trim().length > 0

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .st { min-height: 100vh; background: var(--bg-page); font-family: 'DM Sans', sans-serif; padding: 2rem 1.25rem; max-width: 720px; margin: 0 auto; }
    .st-back { display: flex; align-items: center; gap: 6px; background: none; border: none; font-size: 13px; color: var(--text-muted); cursor: pointer; font-family: 'DM Sans', sans-serif; margin-bottom: 1.5rem; padding: 0; }
    .st-back:hover { color: var(--brand); }
    .st-title { font-family: 'Sora', sans-serif; font-size: clamp(20px, 3vw, 26px); font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem; }
    .st-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 1.75rem; }

    /* Cards */
    .st-card { background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-card); padding: 1.5rem; margin-bottom: 1.25rem; }
    .st-card-title { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; display: flex; align-items: center; gap: 8px; }
    .st-terms { font-size: 14px; color: var(--text-primary); line-height: 1.75; white-space: pre-wrap; }

    /* Form fields */
    .st-field { margin-bottom: 1.25rem; }
    .st-label { font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    .st-input { width: 100%; border: 1.5px solid var(--border); border-radius: 10px; padding: 12px 14px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--text-primary); background: var(--bg-page); outline: none; transition: border-color 0.2s; }
    .st-input:focus { border-color: var(--brand); }

    /* File upload */
    .st-file-zone { border: 2px dashed var(--border); border-radius: 12px; padding: 1.5rem; text-align: center; cursor: pointer; transition: all 0.2s; position: relative; }
    .st-file-zone:hover, .st-file-zone.has-file { border-color: var(--brand); background: var(--brand-light); }
    .st-file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
    .st-file-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--bg-muted); display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
    .st-file-text { font-size: 13px; color: var(--text-muted); }
    .st-file-name { font-size: 13px; font-weight: 500; color: var(--brand); margin-top: 6px; }
    .st-file-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
    .st-file-error { font-size: 12px; color: var(--error); margin-top: 6px; display: flex; align-items: center; gap: 4px; }

    /* Confirm button */
    .st-btn-confirm { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: var(--brand); color: #fff; border: none; border-radius: 12px; padding: 15px; font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.15s; margin-top: 0.5rem; }
    .st-btn-confirm:hover { background: var(--brand-hover); }
    .st-btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Confirmed state */
    .st-confirmed { display: flex; gap: 12px; align-items: flex-start; background: #dcfce7; border: 1px solid #86efac; border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.25rem; }
    .st-confirmed-title { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600; color: #14532d; margin-bottom: 4px; }
    .st-confirmed-text { font-size: 13px; color: #166534; line-height: 1.6; }

    /* PDF download */
    .st-pdf-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; border: none; border-radius: 12px; padding: 15px; font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-top: 0.5rem; }
    .st-pdf-btn.waiting { background: var(--bg-muted); color: var(--text-muted); cursor: default; }
    .st-pdf-btn.ready { background: #14532d; color: #fff; }
    .st-pdf-btn.ready:hover { background: #166534; }

    /* Submit error */
    .st-submit-error { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--error); background: var(--error-bg); border: 1px solid var(--error-border); border-radius: 10px; padding: 10px 14px; margin-top: 12px; }

    /* Loading / error */
    .st-center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 12px; color: var(--text-muted); font-size: 14px; }
    .st-error { background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error); border-radius: 12px; padding: 1rem 1.25rem; font-size: 13px; display: flex; align-items: center; gap: 8px; }

    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  `

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="st">
          <div className="st-center">
            <Loader size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Loading settlement details…</span>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div className="st">
          <button className="st-back" onClick={() => navigate(`/party/cases/${caseId}`)}>
            <ChevronLeft size={16} /> Back to Case
          </button>
          <div className="st-error"><AlertCircle size={16} /> {error}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{styles}</style>
      <div className="st">
        <button className="st-back" onClick={() => navigate(`/party/cases/${caseId}`)}>
          <ChevronLeft size={16} /> Back to Case
        </button>

        <h1 className="st-title">Confirm Settlement</h1>
        <p className="st-sub">
          Both parties must confirm to finalise the settlement and generate the signed PDF.
        </p>

        {/* Agreed terms */}
        {proposal && (
          <div className="st-card">
            <p className="st-card-title"><FileText size={16} color="var(--brand)" /> Agreed Settlement Terms</p>
<p className="st-terms">{stripMarkdown(proposal.content || proposal.raw_text) || "No content available"}</p>
          </div>
        )}

        {/* Confirmed success message */}
        {confirmed && (
          <div className="st-confirmed">
            <CheckCircle size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="st-confirmed-title">Your confirmation has been recorded.</p>
              <p className="st-confirmed-text">
                The settlement PDF will be available once both parties have confirmed.
                This page will update automatically — no need to refresh.
              </p>
            </div>
          </div>
        )}

        {/* Confirmation form — hide once confirmed */}
        {!confirmed && (
          <div className="st-card">
            <p className="st-card-title"><User size={16} color="var(--brand)" /> Your Confirmation</p>

            {/* Typed name */}
            <div className="st-field">
              <label className="st-label">
                <User size={13} /> Type your full legal name
              </label>
              <input
                className="st-input"
                type="text"
                placeholder="e.g. Priya Sharma"
                value={typedName}
                onChange={e => setTypedName(e.target.value)}
              />
            </div>

           <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.5 }}>
              By typing your name and clicking confirm, you agree this constitutes your legally binding signature on this settlement, and that you are authorized to sign on your own behalf.
            </p>

            {submitError && (
              <div className="st-submit-error">
                <AlertCircle size={15} /> {submitError}
              </div>
            )}

            <button
              className="st-btn-confirm"
              onClick={handleConfirm}
              disabled={!canConfirm || confirming}
            >
              {confirming
                ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Confirming…</>
                : <><CheckCircle size={16} /> Confirm Settlement</>
              }
            </button>
          </div>
        )}

        {/* PDF download — always visible after confirmation, polls until ready */}
        {confirmed && (
          pdfReady ? (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="st-pdf-btn ready">
                <Download size={16} /> Download Settlement PDF
              </button>
            </a>
          ) : (
            <button className="st-pdf-btn waiting" disabled>
              <Loader size={16} style={{ animation: polling ? 'spin 1s linear infinite' : 'none' }} />
              Waiting for both parties to confirm…
            </button>
          )
        )}
      </div>
    </>
  )
}