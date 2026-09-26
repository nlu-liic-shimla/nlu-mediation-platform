// import { useState, useEffect, useRef } from 'react'
// import { CheckCircle, Loader, AlertCircle, RefreshCw } from 'lucide-react'
// import client from '../../api/client'

// /**
//  * Drop this component anywhere in the party Dashboard.
//  * It polls analysis status for a given caseId every 2 seconds
//  * during processing, stops on complete or failed.
//  *
//  * Usage:
//  *   <AnalysisStatusBanner caseId={caseId} />
//  */
// export default function AnalysisStatusBanner({ caseId }) {
//   const [status, setStatus] = useState(null) // null | pending | processing | complete | failed
//   const [completedAt, setCompletedAt] = useState(null)
//   const intervalRef = useRef(null)

//   const fetchStatus = async () => {
//     try {
//       const res = await client.get(`/api/v1/cases/${caseId}/analysis/status`)
//       const { status: s, completed_at } = res.data
//       setStatus(s)
//       setCompletedAt(completed_at)

//       // Stop polling when done
//       if (s === 'complete' || s === 'failed') {
//         clearInterval(intervalRef.current)
//       }
//     } catch {
//       // Silently fail — don't crash the dashboard
//     }
//   }

//   useEffect(() => {
//     if (!caseId) return
//     fetchStatus() // immediate first call

//     // Poll every 2 seconds
//     intervalRef.current = setInterval(fetchStatus, 2000)

//     return () => clearInterval(intervalRef.current)
//   }, [caseId])

//   if (!status || status === 'pending') return null

//   if (status === 'processing') return (
//     <div style={styles.banner('processing')}>
//       <Loader size={16} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
//       <span>AI analysis in progress — this usually takes under a minute…</span>
//       <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
//     </div>
//   )

//   if (status === 'complete') return (
//     <div style={styles.banner('complete')}>
//       <CheckCircle size={16} style={{ flexShrink: 0 }} />
//       <span>AI analysis complete ✅ — your mediator is reviewing the results.</span>
//     </div>
//   )

//   if (status === 'failed') return (
//     <div style={styles.banner('failed')}>
//       <AlertCircle size={16} style={{ flexShrink: 0 }} />
//       <span>Analysis encountered an issue. Your mediator has been notified and can retry.</span>
//     </div>
//   )

//   return null
// }

// const styles = {
//   banner: (type) => ({
//     display: 'flex',
//     alignItems: 'center',
//     gap: '10px',
//     padding: '12px 16px',
//     borderRadius: '10px',
//     fontSize: '13px',
//     fontFamily: "'DM Sans', sans-serif",
//     fontWeight: 500,
//     marginBottom: '1rem',
//     ...(type === 'processing' && {
//       background: '#fff7ed',
//       border: '1px solid #fed7aa',
//       color: '#c2410c',
//     }),
//     ...(type === 'complete' && {
//       background: '#f0fdf4',
//       border: '1px solid #bbf7d0',
//       color: '#15803d',
//     }),
//     ...(type === 'failed' && {
//       background: 'var(--error-bg)',
//       border: '1px solid var(--error-border)',
//       color: 'var(--error)',
//     }),
//   })
// }

// src/components/party/AnalysisStatusBanner.jsx
// Fixed: import from services/api (has /api/v1 base) not api/client (raw axios)
// Fixed: removed /api/v1/ prefix from URL since services/api already adds it

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, Loader, AlertCircle } from 'lucide-react'
import client from '../../services/api'

export default function AnalysisStatusBanner({ caseId }) {
  const [status, setStatus] = useState(null)
  const [completedAt, setCompletedAt] = useState(null)
  const intervalRef = useRef(null)

  const fetchStatus = async () => {
    try {
      const res = await client.get(`/cases/${caseId}/analysis/status`)
      const { status: s, completed_at } = res.data
      setStatus(s)
      setCompletedAt(completed_at)
      if (s === 'complete' || s === 'failed') {
        clearInterval(intervalRef.current)
      }
    } catch {
      // silently fail — don't crash the dashboard
    }
  }

  useEffect(() => {
    if (!caseId) return
    fetchStatus()
    intervalRef.current = setInterval(fetchStatus, 2000)
    return () => clearInterval(intervalRef.current)
  }, [caseId])

  if (!status || status === 'pending') return null

  if (status === 'processing') return (
    <div style={styles.banner('processing')}>
      <Loader size={16} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
      <span>AI analysis in progress — this usually takes under a minute…</span>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )

  if (status === 'complete') return (
    <div style={styles.banner('complete')}>
      <CheckCircle size={16} style={{ flexShrink: 0 }} />
      <span>AI analysis complete ✅ — your mediator is reviewing the results.</span>
    </div>
  )

  if (status === 'failed') return (
    <div style={styles.banner('failed')}>
      <AlertCircle size={16} style={{ flexShrink: 0 }} />
      <span>Analysis encountered an issue. Your mediator has been notified and can retry.</span>
    </div>
  )

  return null
}

const styles = {
  banner: (type) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '13px',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    marginBottom: '1rem',
    ...(type === 'processing' && {
      background: '#fff7ed',
      border: '1px solid #fed7aa',
      color: '#c2410c',
    }),
    ...(type === 'complete' && {
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
      color: '#15803d',
    }),
    ...(type === 'failed' && {
      background: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#dc2626',
    }),
  })
}