import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, CheckCircle,
  AlertCircle, Loader, Save
} from 'lucide-react'
import { getQuestionnaire, submitQuestionnaire } from '../../services/questionnaire'

// ── Auto-save interval (ms) ───────────────────────────────────────────────────
const AUTO_SAVE_MS = 30_000

export default function Questionnaire() {
  const navigate = useNavigate()
  const { id: caseId } = useParams()

  const [questionnaire, setQuestionnaire] = useState(null)   // { questions, total, questionnaire_id }
  const [answers, setAnswers]             = useState({})      // { [questionId]: value }
  const [currentIdx, setCurrentIdx]       = useState(0)
  const [loading, setLoading]             = useState(true)
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState('')
  const [autoSaveMsg, setAutoSaveMsg]     = useState('')      // 'Auto-saved' flash
  const [submitted, setSubmitted]         = useState(false)   // completion screen
  const [validationErr, setValidationErr] = useState('')

  const autoSaveTimer = useRef(null)
  const lsKey = `questionnaire_${caseId}`

  // ── Load questionnaire + restore localStorage ─────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getQuestionnaire(caseId)
        setQuestionnaire(data)

        // Restore saved answers
        try {
          const saved = localStorage.getItem(lsKey)
          if (saved) setAnswers(JSON.parse(saved))
        } catch (_) {}
      } catch (err) {
        // 409 = already submitted → go straight to completion screen
        if (err?.response?.status === 409 ||
            err?.response?.data?.detail === 'ALREADY_SUBMITTED') {
          setSubmitted(true)
        } else {
          setError(err?.response?.data?.detail ?? 'Failed to load questionnaire. Please refresh.')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [caseId])

  // ── Auto-save to localStorage every 30s ──────────────────────────────────
  const saveToLocal = useCallback((ans) => {
    localStorage.setItem(lsKey, JSON.stringify(ans))
    setAutoSaveMsg('Auto-saved')
    setTimeout(() => setAutoSaveMsg(''), 2000)
  }, [lsKey])

  useEffect(() => {
    if (!questionnaire) return
    clearInterval(autoSaveTimer.current)
    autoSaveTimer.current = setInterval(() => saveToLocal(answers), AUTO_SAVE_MS)
    return () => clearInterval(autoSaveTimer.current)
  }, [answers, questionnaire, saveToLocal])

  // ── Answer update ─────────────────────────────────────────────────────────
  const setAnswer = (qId, value) => {
    setValidationErr('')
    setAnswers(prev => ({ ...prev, [qId]: value }))
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const questions = questionnaire?.questions ?? []
  const total     = questions.length
  const question  = questions[currentIdx]
  const qId       = question?.id ?? `q${currentIdx}`
  const currentAnswer = answers[qId] ?? ''

  const isAnswered = () => {
    if (!question) return false
    if (question.type === 'open_ended') return String(currentAnswer).trim().length >= 20
    return currentAnswer !== '' && currentAnswer !== undefined
  }

  const goNext = () => {
    if (!isAnswered()) {
      setValidationErr(
        question.type === 'open_ended'
          ? 'Please write at least 20 characters before continuing.'
          : 'Please select an answer before continuing.'
      )
      return
    }
    setValidationErr('')
    if (currentIdx < total - 1) setCurrentIdx(i => i + 1)
  }

  const goPrev = () => {
    setValidationErr('')
    if (currentIdx > 0) setCurrentIdx(i => i - 1)
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isAnswered()) {
      setValidationErr(
        question.type === 'open_ended'
          ? 'Please write at least 20 characters before submitting.'
          : 'Please select an answer before submitting.'
      )
      return
    }
    setSubmitting(true)
    setValidationErr('')
    try {
      await submitQuestionnaire(caseId, questionnaire.questionnaire_id, answers)
      localStorage.removeItem(lsKey)
      setSubmitted(true)
    } catch (err) {
      if (err?.response?.status === 409) {
        setSubmitted(true) // already submitted — show completion
      } else {
        setError(err?.response?.data?.detail ?? 'Submission failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const isLast = currentIdx === total - 1

  // ── Styles ────────────────────────────────────────────────────────────────
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .qs { min-height: 100vh; background: var(--bg-page); font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; }
    .qs-header { background: var(--bg-card); border-bottom: 1px solid var(--border-card); padding: 1rem 1.25rem; display: flex; align-items: center; gap: 12px; }
    .qs-back { background: none; border: none; display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-muted); cursor: pointer; font-family: 'DM Sans', sans-serif; padding: 0; }
    .qs-back:hover { color: var(--brand); }
    .qs-header-title { font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 600; color: var(--text-primary); flex: 1; }
    .qs-autosave { font-size: 11px; color: #16a34a; display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.3s; }
    .qs-autosave.visible { opacity: 1; }

    /* Progress bar */
    .qs-progress-wrap { padding: 1rem 1.25rem 0; max-width: 680px; margin: 0 auto; width: 100%; }
    .qs-progress-label { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; display: flex; justify-content: space-between; }
    .qs-progress-bar { height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; }
    .qs-progress-fill { height: 100%; background: var(--brand); border-radius: 99px; transition: width 0.35s ease; }

    /* Main question card */
    .qs-body { flex: 1; padding: 1.5rem 1.25rem 2rem; max-width: 680px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 1.25rem; }
    .qs-card { background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-card); padding: 1.75rem; }
    .qs-q-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: var(--brand); margin-bottom: 10px; }
    .qs-q-text { font-family: 'Sora', sans-serif; font-size: clamp(15px, 2.5vw, 18px); font-weight: 600; color: var(--text-primary); line-height: 1.5; margin-bottom: 1.5rem; }

    /* open_ended */
    .qs-textarea { width: 100%; min-height: 120px; border: 1.5px solid var(--border); border-radius: 10px; padding: 12px 14px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--text-primary); background: var(--bg-page); resize: vertical; outline: none; transition: border-color 0.2s; }
    .qs-textarea:focus { border-color: var(--brand); }
    .qs-char-count { font-size: 11px; color: var(--text-muted); text-align: right; margin-top: 6px; }
    .qs-char-count.ok { color: #16a34a; }

    /* yes_no */
    .qs-yn-row { display: flex; gap: 12px; }
    .qs-yn-btn { flex: 1; padding: 16px; border-radius: 12px; border: 2px solid var(--border); background: var(--bg-page); font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: all 0.15s; }
    .qs-yn-btn:hover { border-color: var(--brand); color: var(--brand); }
    .qs-yn-btn.selected { border-color: var(--brand); background: var(--brand-light); color: var(--brand); }

    /* scale_1_5 */
    .qs-scale-row { display: flex; gap: 8px; }
    .qs-scale-btn { flex: 1; padding: 14px 4px; border-radius: 10px; border: 2px solid var(--border); background: var(--bg-page); font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: var(--text-muted); cursor: pointer; transition: all 0.15s; text-align: center; }
    .qs-scale-btn:hover { border-color: var(--brand); color: var(--brand); }
    .qs-scale-btn.selected { border-color: var(--brand); background: var(--brand); color: #fff; }
    .qs-scale-labels { display: flex; justify-content: space-between; margin-top: 8px; }
    .qs-scale-label-text { font-size: 11px; color: var(--text-muted); }

    /* Validation error */
    .qs-error { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--error); background: var(--error-bg); border: 1px solid var(--error-border); border-radius: 10px; padding: 10px 14px; }

    /* Footer nav */
    .qs-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .qs-btn-prev { display: flex; align-items: center; gap: 6px; background: none; border: 1.5px solid var(--border); border-radius: 10px; padding: 11px 18px; font-size: 13px; font-family: 'Sora', sans-serif; font-weight: 600; color: var(--text-muted); cursor: pointer; }
    .qs-btn-prev:hover { border-color: var(--brand); color: var(--brand); }
    .qs-btn-next { display: flex; align-items: center; gap: 6px; background: var(--brand); border: none; border-radius: 10px; padding: 11px 22px; font-size: 13px; font-family: 'Sora', sans-serif; font-weight: 600; color: #fff; cursor: pointer; }
    .qs-btn-next:hover { background: var(--brand-hover); }
    .qs-btn-next:disabled { opacity: 0.5; cursor: not-allowed; }
    .qs-btn-submit { background: #16a34a; }
    .qs-btn-submit:hover { background: #15803d; }

    /* Loading / error full page */
    .qs-center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 12px; color: var(--text-muted); font-size: 14px; text-align: center; padding: 2rem; }
    .qs-page-error { background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error); border-radius: 12px; padding: 1rem 1.25rem; font-size: 13px; display: flex; align-items: center; gap: 8px; max-width: 500px; }

    /* Completion screen */
    .qs-done { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 70vh; gap: 1rem; padding: 2rem; text-align: center; max-width: 480px; margin: 0 auto; }
    .qs-done-icon { width: 72px; height: 72px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; }
    .qs-done-title { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; color: var(--text-primary); }
    .qs-done-text { font-size: 14px; color: var(--text-muted); line-height: 1.6; }
    .qs-done-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--brand); color: #fff; border: none; border-radius: 10px; padding: 12px 24px; font-size: 13px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; margin-top: 0.5rem; }
    .qs-done-btn:hover { background: var(--brand-hover); }

    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @media (max-width: 480px) {
      .qs-scale-btn { padding: 12px 2px; font-size: 14px; }
      .qs-yn-btn { padding: 14px; font-size: 14px; }
    }
  `

  // ── Completion screen ─────────────────────────────────────────────────────
  if (submitted) {
    return (
      <>
        <style>{styles}</style>
        <div className="qs">
          <div className="qs-done">
            <div className="qs-done-icon">
              <CheckCircle size={36} color="#16a34a" />
            </div>
            <h1 className="qs-done-title">Answers Submitted</h1>
            <p className="qs-done-text">
              Thank you — your responses have been recorded. The mediator will
              review them alongside the other party's answers. You'll be notified
              when the next step is ready.
            </p>
            <button className="qs-done-btn" onClick={() => navigate(`/party/cases/${caseId}`)}>
              Back to Case <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="qs">
          <div className="qs-center">
            <Loader size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Loading your questions…</span>
          </div>
        </div>
      </>
    )
  }

  // ── Page-level error ──────────────────────────────────────────────────────
  if (error) {
    return (
      <>
        <style>{styles}</style>
        <div className="qs">
          <div className="qs-center">
            <div className="qs-page-error">
              <AlertCircle size={16} /> {error}
            </div>
            <button className="qs-done-btn" style={{ marginTop: '1rem' }} onClick={() => navigate(`/party/cases/${caseId}`)}>
              Back to Case
            </button>
          </div>
        </div>
      </>
    )
  }

  const progressPct = total > 0 ? ((currentIdx + 1) / total) * 100 : 0
  const charCount = String(currentAnswer).trim().length

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="qs">

        {/* Header */}
        <div className="qs-header">
          <button className="qs-back" onClick={() => navigate(`/party/cases/${caseId}`)}>
            <ChevronLeft size={15} /> Case
          </button>
          <span className="qs-header-title">Questionnaire</span>
          <span className={`qs-autosave ${autoSaveMsg ? 'visible' : ''}`}>
            <Save size={12} /> {autoSaveMsg}
          </span>
        </div>

        {/* Progress bar */}
        <div className="qs-progress-wrap">
          <div className="qs-progress-label">
            <span>Question {currentIdx + 1} of {total}</span>
            <span>{Math.round(progressPct)}% complete</span>
          </div>
          <div className="qs-progress-bar">
            <div className="qs-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Body */}
        <div className="qs-body">
          <div className="qs-card">
            <p className="qs-q-label">Question {currentIdx + 1}</p>
            <p className="qs-q-text">{question?.text || question?.question}</p>

            {/* open_ended */}
            {question?.type === 'open_ended' && (
              <>
                <textarea
                  className="qs-textarea"
                  placeholder="Write your answer here…"
                  value={currentAnswer}
                  onChange={e => setAnswer(qId, e.target.value)}
                />
                <p className={`qs-char-count ${charCount >= 20 ? 'ok' : ''}`}>
                  {charCount} / 20 minimum characters
                </p>
              </>
            )}

            {/* yes_no */}
            {question?.type === 'yes_no' && (
              <div className="qs-yn-row">
                {['yes', 'no'].map(opt => (
                  <button
                    key={opt}
                    className={`qs-yn-btn ${currentAnswer === opt ? 'selected' : ''}`}
                    onClick={() => setAnswer(qId, opt)}
                  >
                    {opt === 'yes' ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            )}

            {/* scale_1_5 */}
            {question?.type === 'scale_1_5' && (
              <>
                <div className="qs-scale-row">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      className={`qs-scale-btn ${Number(currentAnswer) === n ? 'selected' : ''}`}
                      onClick={() => setAnswer(qId, n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="qs-scale-labels">
                  <span className="qs-scale-label-text">Strongly Disagree</span>
                  <span className="qs-scale-label-text">Strongly Agree</span>
                </div>
              </>
            )}
          </div>

          {/* Validation error */}
          {validationErr && (
            <div className="qs-error">
              <AlertCircle size={15} /> {validationErr}
            </div>
          )}

          {/* Submission error */}
          {error && (
            <div className="qs-error">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Footer navigation */}
          <div className="qs-footer">
            <button
              className="qs-btn-prev"
              onClick={goPrev}
              disabled={currentIdx === 0}
              style={{ visibility: currentIdx === 0 ? 'hidden' : 'visible' }}
            >
              <ChevronLeft size={15} /> Previous
            </button>

            {!isLast ? (
              <button className="qs-btn-next" onClick={goNext}>
                Next <ChevronRight size={15} />
              </button>
            ) : (
              <button
                className="qs-btn-next qs-btn-submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Submitting…</>
                  : <><CheckCircle size={14} /> Submit Answers</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}