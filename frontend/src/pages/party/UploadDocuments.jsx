import { useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Scale, Upload, File, FileText, Image, X, CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────
const ALLOWED_TYPES = {
  'application/pdf': { label: 'PDF', maxSize: 20 * 1024 * 1024, icon: FileText, color: '#ef4444' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', maxSize: 10 * 1024 * 1024, icon: FileText, color: '#3b82f6' },
  'image/jpeg': { label: 'JPEG', maxSize: 5 * 1024 * 1024, icon: Image, color: '#10b981' },
  'image/png': { label: 'PNG', maxSize: 5 * 1024 * 1024, icon: Image, color: '#10b981' },
}

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── File status types ─────────────────────────────────────────
// pending | uploading | done | error

export default function UploadDocuments() {
  const { id: caseId } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [files, setFiles] = useState([]) // { id, file, status, progress, error }
  const [dragOver, setDragOver] = useState(false)

  // ── Validate file ──
  const validateFile = (file) => {
    if (!ALLOWED_TYPES[file.type]) {
      return 'File type not allowed. Use PDF, DOCX, JPEG, or PNG.'
    }
    const maxSize = ALLOWED_TYPES[file.type].maxSize
    if (file.size > maxSize) {
      return `File too large. Max size for ${ALLOWED_TYPES[file.type].label}: ${formatSize(maxSize)}`
    }
    return null
  }

  // ── Add files ──
  const addFiles = useCallback((newFiles) => {
    const entries = Array.from(newFiles).map((file) => {
      const error = validateFile(file)
      return {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        status: error ? 'error' : 'pending',
        progress: 0,
        error: error || null,
      }
    })
    setFiles((prev) => [...prev, ...entries])
  }, [])

  // ── Drag handlers ──
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  // ── File input ──
  const handleFileInput = (e) => {
    addFiles(e.target.files)
    e.target.value = '' // reset so same file can be re-added
  }

  // ── Remove file ──
  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  // ── Upload single file ──
  const uploadFile = async (entry) => {
    const token = localStorage.getItem('nlu_token')
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

    // Update status to uploading
    setFiles((prev) => prev.map((f) =>
      f.id === entry.id ? { ...f, status: 'uploading', progress: 10 } : f
    ))

    try {
      // Step 1 — Get signed URL
      const urlRes = await fetch(`${baseUrl}/api/v1/cases/${caseId}/documents/upload-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_name: entry.file.name,
          file_type: entry.file.type,
          file_size: entry.file.size,
        }),
      })

      if (!urlRes.ok) {
        const err = await urlRes.json()
        throw new Error(err.detail || 'Failed to get upload URL')
      }

      const { signed_url, storage_path } = await urlRes.json()

      setFiles((prev) => prev.map((f) =>
        f.id === entry.id ? { ...f, progress: 40 } : f
      ))

      // Step 2 — Upload file directly to Supabase Storage
      const uploadRes = await fetch(signed_url, {
        method: 'PUT',
        headers: { 'Content-Type': entry.file.type },
        body: entry.file,
      })

      if (!uploadRes.ok) throw new Error('Upload to storage failed')

      setFiles((prev) => prev.map((f) =>
        f.id === entry.id ? { ...f, progress: 80 } : f
      ))

      // Step 3 — Confirm upload
      const confirmRes = await fetch(`${baseUrl}/api/v1/cases/${caseId}/documents/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_name: entry.file.name,
          file_size: entry.file.size,
          file_type: entry.file.type,
          storage_path,
        }),
      })

      if (!confirmRes.ok) throw new Error('Failed to confirm upload')

      setFiles((prev) => prev.map((f) =>
        f.id === entry.id ? { ...f, status: 'done', progress: 100 } : f
      ))

    } catch (err) {
      setFiles((prev) => prev.map((f) =>
        f.id === entry.id ? { ...f, status: 'error', error: err.message, progress: 0 } : f
      ))
    }
  }

  // ── Upload all pending ──
  const uploadAll = () => {
    const pending = files.filter((f) => f.status === 'pending')
    pending.forEach(uploadFile)
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length
  const doneCount = files.filter((f) => f.status === 'done').length
  const errorCount = files.filter((f) => f.status === 'error').length
  const uploadingCount = files.filter((f) => f.status === 'uploading').length

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ud-page {
          min-height: 100vh;
          background: var(--bg-page);
          font-family: 'DM Sans', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 1rem 3rem;
        }

        .ud-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 2rem;
  width: 100%;
}

        .ud-logo-text {
          font-family: 'Sora', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.08em;
        }

        .ud-card {
          background: var(--bg-card);
          border-radius: 20px;
          border: 1px solid var(--border-card);
          padding: 2rem;
          width: 100%;
          max-width: 680px;
          box-shadow: var(--shadow);
        }

        .ud-back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          padding: 0;
          margin-bottom: 1.25rem;
          transition: color 0.15s;
        }

        .ud-back-btn:hover { color: var(--brand); }

        .ud-title {
          font-family: 'Sora', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .ud-subtitle {
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        /* ── Drop zone ── */
        .ud-dropzone {
          border: 2px dashed var(--border);
          border-radius: 14px;
          padding: 2.5rem 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: var(--bg-input);
          margin-bottom: 1.25rem;
        }

        .ud-dropzone:hover { border-color: var(--brand); background: var(--brand-light); }
        .ud-dropzone.drag-over { border-color: var(--brand); background: var(--brand-light); transform: scale(1.01); }

        .ud-dropzone-icon {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: var(--brand-light);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
        }

        .ud-dropzone-title {
          font-family: 'Sora', sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .ud-dropzone-sub {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .ud-dropzone-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 1rem;
          padding: 9px 18px;
          background: var(--brand);
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-family: 'Sora', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }

        .ud-dropzone-btn:hover { background: var(--brand-hover); }

        /* ── File list ── */
        .ud-file-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 1.25rem;
        }

        .ud-file-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg-card);
          transition: border-color 0.15s;
        }

        .ud-file-item.done { border-color: #bbf7d0; background: #f0fdf4; }
        .ud-file-item.error { border-color: #fecaca; background: #fef2f2; }
        .ud-file-item.uploading { border-color: var(--brand); }

        .ud-file-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: var(--bg-muted);
        }

        .ud-file-info { flex: 1; min-width: 0; }

        .ud-file-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 3px;
        }

        .ud-file-meta {
          font-size: 11px;
          color: var(--text-muted);
        }

        .ud-file-error {
          font-size: 11px;
          color: #ef4444;
          margin-top: 2px;
        }

        /* Progress bar */
        .ud-progress-track {
          height: 4px;
          background: var(--border);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 6px;
        }

        .ud-progress-fill {
          height: 100%;
          background: var(--brand);
          border-radius: 99px;
          transition: width 0.3s ease;
        }

        .ud-file-status { flex-shrink: 0; }

        .ud-remove-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.15s;
          flex-shrink: 0;
        }

        .ud-remove-btn:hover { color: #ef4444; }

        /* ── Summary bar ── */
        .ud-summary {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }

        .ud-summary-item { display: flex; align-items: center; gap: 4px; }

        /* ── Actions ── */
        .ud-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .ud-upload-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 22px;
          background: var(--brand);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Sora', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }

        .ud-upload-btn:hover:not(:disabled) { background: var(--brand-hover); }
        .ud-upload-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .ud-done-btn {
          padding: 11px 22px;
          background: #059669;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Sora', sans-serif;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }

        .ud-done-btn:hover { background: #047857; }

        /* ── Allowed types info ── */
        .ud-types {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 1rem;
        }

        .ud-type-badge {
          font-size: 11px;
          font-weight: 500;
          padding: 3px 10px;
          border-radius: 99px;
          background: var(--bg-muted);
          color: var(--text-muted);
        }

        @media (max-width: 600px) {
          .ud-page { padding: 1.5rem 0.75rem 2rem; }
          .ud-card { padding: 1.5rem 1.1rem; border-radius: 16px; }
          .ud-actions { flex-direction: column; }
          .ud-upload-btn, .ud-done-btn { width: 100%; justify-content: center; }
        }
      `}</style>

      <div className="ud-page">
        <div className="ud-logo">
          <Scale size={22} color="var(--brand)" strokeWidth={1.8} />
          <span className="ud-logo-text">SULAH</span>
        </div>

        <div className="ud-card">
          <button className="ud-back-btn" onClick={() => navigate(`/party/cases/${caseId}`)}>
            <ChevronLeft size={15} /> Back to Case
          </button>

          <h2 className="ud-title">Upload Documents</h2>
          <p className="ud-subtitle">
            Upload supporting documents for your case. Files are stored securely and only accessible to your mediator.
          </p>

          {/* Drop zone */}
          <div
            className={`ud-dropzone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="ud-dropzone-icon">
              <Upload size={24} color="var(--brand)" />
            </div>
            <p className="ud-dropzone-title">Drop files here or click to browse</p>
            <p className="ud-dropzone-sub">
              PDF up to 20MB • DOCX up to 10MB • Images up to 5MB
            </p>
            <div className="ud-types">
              {Object.values(ALLOWED_TYPES).map((t) => (
                <span key={t.label} className="ud-type-badge">{t.label}</span>
              ))}
            </div>
            <button
              className="ud-dropzone-btn"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
            >
              <Upload size={14} /> Choose Files
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,image/jpeg,image/png"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />

          {/* Summary */}
          {files.length > 0 && (
            <div className="ud-summary">
              <span className="ud-summary-item">
                <File size={12} /> {files.length} file{files.length !== 1 ? 's' : ''} selected
              </span>
              {doneCount > 0 && (
                <span className="ud-summary-item" style={{ color: '#16a34a' }}>
                  <CheckCircle size={12} /> {doneCount} uploaded
                </span>
              )}
              {errorCount > 0 && (
                <span className="ud-summary-item" style={{ color: '#ef4444' }}>
                  <AlertCircle size={12} /> {errorCount} failed
                </span>
              )}
              {uploadingCount > 0 && (
                <span className="ud-summary-item" style={{ color: 'var(--brand)' }}>
                  ↑ {uploadingCount} uploading...
                </span>
              )}
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="ud-file-list">
              {files.map((entry) => {
                const typeInfo = ALLOWED_TYPES[entry.file.type]
                const IconComp = typeInfo?.icon || File

                return (
                  <div key={entry.id} className={`ud-file-item ${entry.status}`}>
                    <div className="ud-file-icon">
                      <IconComp size={18} color={typeInfo?.color || 'var(--text-muted)'} />
                    </div>

                    <div className="ud-file-info">
                      <p className="ud-file-name">{entry.file.name}</p>
                      <p className="ud-file-meta">
                        {typeInfo?.label || 'File'} • {formatSize(entry.file.size)}
                      </p>
                      {entry.error && (
                        <p className="ud-file-error">{entry.error}</p>
                      )}
                      {entry.status === 'uploading' && (
                        <div className="ud-progress-track">
                          <div className="ud-progress-fill" style={{ width: `${entry.progress}%` }} />
                        </div>
                      )}
                      {entry.status === 'done' && (
                        <p style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>✓ Uploaded successfully</p>
                      )}
                    </div>

                    <div className="ud-file-status">
                      {entry.status === 'done' && <CheckCircle size={18} color="#16a34a" />}
                      {entry.status === 'error' && <AlertCircle size={18} color="#ef4444" />}
                      {entry.status === 'uploading' && (
                        <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>
                          {entry.progress}%
                        </span>
                      )}
                    </div>

                    {entry.status !== 'uploading' && (
                      <button className="ud-remove-btn" onClick={() => removeFile(entry.id)}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Actions */}
          {files.length > 0 && (
            <div className="ud-actions">
              {doneCount === files.filter(f => f.status !== 'error').length && doneCount > 0 ? (
                <button className="ud-done-btn" onClick={() => navigate(`/party/cases/${caseId}`)}>
                  ✓ Done — Back to Case
                </button>
              ) : (
                <button
                  className="ud-upload-btn"
                  onClick={uploadAll}
                  disabled={pendingCount === 0 || uploadingCount > 0}
                >
                  <Upload size={15} />
                  {uploadingCount > 0 ? 'Uploading...' : `Upload ${pendingCount} File${pendingCount !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}