import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAnalysis,
  getDocuments,
  flagAnalysisClaim,
  saveNotes,
} from "../../api/cases";
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react";
import MediatorLayout from "../../layouts/MediatorLayout";

/* ── tokens ─────────────────────────────────────────────── */
const tokens = (dark) => ({
  bg: dark ? "#0f172a" : "#f1f5f9",
  surface: dark ? "#1e293b" : "#ffffff",
  border: dark ? "#334155" : "#e2e8f0",
  text: dark ? "#f1f5f9" : "#1e293b",
  sub: dark ? "#94a3b8" : "#64748b",
  inputBg: dark ? "#0f172a" : "#f8fafc",
  accent: "#1e40af",
});

/* ── useWindowWidth ─────────────────────────────────────── */
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return width;
}

/* ── BiasBadge ──────────────────────────────────────────── */
function BiasBadge({ status }) {
  const config = {
    none: { color: "#16a34a", bg: "#dcfce7", label: "✓ No bias detected" },
    corrected: {
      color: "#d97706",
      bg: "#fef9c3",
      label: "⚠ Bias detected and corrected",
    },
    unresolved: {
      color: "#dc2626",
      bg: "#fee2e2",
      label: "✗ Potential bias — review carefully",
    },
  };
  const c = config[status] || config.none;
  return (
    <span
      style={{
        padding: "4px 12px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        background: c.bg,
        color: c.color,
        display: "inline-block",
      }}
    >
      {c.label}
    </span>
  );
}

/* ── MediatabilityBar ───────────────────────────────────── */
function MediatabilityBar({ score, band, tk }) {
  const color = score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 13, color: tk.sub }}>Mediatability Score</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {score}/100 — {band}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: tk.border,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 4,
            width: `${score}%`,
            background: color,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

/* ── ClaimRow ───────────────────────────────────────────── */
function ClaimRow({ claim, confidence, flagged, onFlag, tk }) {
  const confColor =
    confidence >= 0.7 ? "#16a34a" : confidence >= 0.4 ? "#d97706" : "#dc2626";
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        border: `1px solid ${flagged ? "#fecaca" : tk.border}`,
        background: flagged ? "#fef2f2" : tk.bg,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, color: tk.text }}>{claim}</p>
        <span
          style={{
            fontSize: 11,
            color: confColor,
            marginTop: 4,
            display: "block",
          }}
        >
          Confidence: {Math.round(confidence * 100)}%
        </span>
      </div>
      <button
        onClick={onFlag}
        title="Flag this claim"
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: flagged ? "#dc2626" : tk.sub,
          flexShrink: 0,
          padding: 4,
        }}
      >
        <Flag size={14} fill={flagged ? "#dc2626" : "none"} />
      </button>
    </div>
  );
}

/* ── DocumentList ───────────────────────────────────────── */
function DocumentList({ docs, label, tk }) {
  if (!docs || docs.length === 0)
    return (
      <p style={{ fontSize: 13, color: tk.sub, margin: "8px 0" }}>
        No documents uploaded
      </p>
    );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {docs.map((doc, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderRadius: 7,
            border: `1px solid ${tk.border}`,
            background: tk.bg,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={14} color={tk.sub} />
            <span style={{ fontSize: 13, color: tk.text }}>
              {doc.file_name}
            </span>
          </div>
          <a
            href={doc.signed_url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "#1e40af",
              textDecoration: "none",
              padding: "3px 8px",
              borderRadius: 5,
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
            }}
          >
            <ExternalLink size={11} /> View
          </a>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function Analysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  const [analysis, setAnalysis] = useState(null);
  const [documents, setDocuments] = useState({
    requesting_party: [],
    against_party: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [flagged, setFlagged] = useState({});
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

  const [toneOpen, setToneOpen] = useState(false);
  const [factorsOpen, setFactorsOpen] = useState(false);

  const tk = tokens(dark);
  const width = useWindowWidth();
  const isSmall = width < 900;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analysisData, docsData] = await Promise.all([
          getAnalysis(id),
          getDocuments(id),
        ]);
        setAnalysis(analysisData);
        setNotes(analysisData?.mediator_notes || "");
        setDocuments(docsData || { requesting_party: [], against_party: [] });
      } catch (err) {
        setError("Failed to load analysis");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // No case ID guard
  if (!id)
    return (
      <MediatorLayout dark={dark} setDark={setDark}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <p style={{ color: tk.sub, fontSize: 15 }}>No case selected</p>
          <button
            onClick={() => navigate("/mediator")}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              background: "#1e40af",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </MediatorLayout>
    );

  const handleFlag = async (claimText) => {
    try {
      await flagAnalysisClaim(id, claimText);
      setFlagged((prev) => ({ ...prev, [claimText]: !prev[claimText] }));
    } catch {
      // fail silently
    }
  };

  const handleSaveNotes = async () => {
    setNotesLoading(true);
    try {
      await saveNotes(id, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch {
      alert("Failed to save notes");
    } finally {
      setNotesLoading(false);
    }
  };

  if (loading)
    return (
      <MediatorLayout dark={dark} setDark={setDark}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
            color: tk.sub,
          }}
        >
          Loading analysis...
        </div>
      </MediatorLayout>
    );

  if (error)
    return (
      <MediatorLayout dark={dark} setDark={setDark}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <AlertTriangle size={24} color="#ef4444" />
          <p style={{ color: "#ef4444", fontSize: 15 }}>{error}</p>
          <button
            onClick={() => navigate(`/mediator/cases/${id}`)}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              background: "#1e40af",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Back to Case
          </button>
        </div>
      </MediatorLayout>
    );

  if (!analysis)
    return (
      <MediatorLayout dark={dark} setDark={setDark}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <p style={{ color: tk.sub, fontSize: 15 }}>
            No analysis available yet
          </p>
          <button
            onClick={() => navigate(`/mediator/cases/${id}`)}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              background: "#1e40af",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Back to Case
          </button>
        </div>
      </MediatorLayout>
    );

  const ce = analysis.conflict_extraction || {};
  const ns = analysis.neutral_summary || {};
  const med = analysis.mediatability || {};
  const tone = analysis.tone_analysis || {};

  return (
    <MediatorLayout dark={dark} setDark={setDark}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate(`/mediator/cases/${id}`)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: tk.sub,
            fontSize: 13,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: 0,
          }}
        >
          ← Back to Case
        </button>
        <h1
          style={{
            fontSize: isSmall ? 20 : 24,
            fontWeight: 700,
            margin: "0 0 4px",
            color: tk.text,
          }}
        >
          AI Dispute Analysis
        </h1>
        <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
          Case {id?.slice(0, 8).toUpperCase()}
          {ce.dispute_type && ` • ${ce.dispute_type}`}
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isSmall ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Documents",
            value:
              (documents.requesting_party?.length || 0) +
              (documents.against_party?.length || 0),
            color: "#6366f1",
          },
          {
            label: "Key Claims",
            value:
              (ce.claims_party_a?.length || 0) +
              (ce.claims_party_b?.length || 0),
            color: "#10b981",
          },
          {
            label: "Disputed Facts",
            value: ce.disputed_facts?.length || 0,
            color: "#f59e0b",
          },
          {
            label: "Confidence",
            value: ce.extraction_confidence
              ? `${Math.round(ce.extraction_confidence * 100)}%`
              : "—",
            color: "#8b5cf6",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              background: tk.surface,
              borderRadius: 10,
              border: `1px solid ${tk.border}`,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 12, color: tk.sub, marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Split layout ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isSmall ? "1fr" : "1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* ══ LEFT — Raw submissions + documents ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Requesting Party Submission */}
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${tk.border}`,
                background: dark ? "#1e293b" : "#f8fafc",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
                Requesting Party — Raw Submission
              </span>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <p
                style={{
                  fontSize: 13,
                  color: tk.text,
                  lineHeight: 1.7,
                  margin: "0 0 16px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {analysis.requesting_party_statement ||
                  "No statement submitted yet"}
              </p>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: tk.sub,
                  marginBottom: 8,
                }}
              >
                DOCUMENTS
              </div>
              <DocumentList docs={documents.requesting_party} tk={tk} />
            </div>
          </div>

          {/* Against Party Submission */}
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${tk.border}`,
                background: dark ? "#1e293b" : "#f8fafc",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
                Against Party — Raw Submission
              </span>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <p
                style={{
                  fontSize: 13,
                  color: tk.text,
                  lineHeight: 1.7,
                  margin: "0 0 16px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {analysis.against_party_statement ||
                  "No statement submitted yet"}
              </p>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: tk.sub,
                  marginBottom: 8,
                }}
              >
                DOCUMENTS
              </div>
              <DocumentList docs={documents.against_party} tk={tk} />
            </div>
          </div>
        </div>

        {/* ══ RIGHT — AI output ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Neutral Summary */}
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${tk.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
                AI Neutral Summary
              </span>
              <BiasBadge status={ns.bias_status || "none"} />
            </div>
            <div style={{ padding: "16px 18px" }}>
              {ns.edited_content ? (
                <>
                  <p
                    style={{
                      fontSize: 13,
                      color: tk.text,
                      lineHeight: 1.7,
                      margin: "0 0 8px",
                    }}
                  >
                    {ns.edited_content}
                  </p>
                  <span style={{ fontSize: 11, color: tk.sub }}>
                    Mediator edited —{" "}
                    {ns.edited_at
                      ? new Date(ns.edited_at).toLocaleString()
                      : ""}
                  </span>
                </>
              ) : (
                <p
                  style={{
                    fontSize: 13,
                    color: tk.text,
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {ns.summary || "Summary not yet generated"}
                </p>
              )}
            </div>
          </div>

          {/* Mediatability Score */}
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              padding: "16px 18px",
            }}
          >
            <MediatabilityBar
              score={med.total_score || 0}
              band={med.band || "—"}
              tk={tk}
            />

            {/* 7-factor breakdown */}
            <button
              onClick={() => setFactorsOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: tk.sub,
                fontSize: 12,
                marginTop: 12,
                padding: 0,
              }}
            >
              {factorsOpen ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
              {factorsOpen ? "Hide" : "Show"} factor breakdown
            </button>

            {factorsOpen && med.factors && (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {med.factors.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: tk.text }}>{f.name}</span>
                    <span style={{ fontWeight: 600, color: tk.sub }}>
                      {f.score}/{f.max}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {med.justification && (
              <p
                style={{
                  fontSize: 13,
                  color: tk.sub,
                  marginTop: 12,
                  lineHeight: 1.6,
                }}
              >
                {med.justification}
              </p>
            )}
          </div>

          {/* Conflict Claims */}
          {(ce.claims_party_a?.length > 0 || ce.claims_party_b?.length > 0) && (
            <div
              style={{
                background: tk.surface,
                borderRadius: 12,
                border: `1px solid ${tk.border}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: `1px solid ${tk.border}`,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
                  Conflict Claims
                </span>
                <p style={{ fontSize: 12, color: tk.sub, margin: "2px 0 0" }}>
                  Flag any claim you disagree with
                </p>
              </div>
              <div style={{ padding: "16px 18px" }}>
                {ce.claims_party_a?.length > 0 && (
                  <>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: tk.sub,
                        marginBottom: 8,
                      }}
                    >
                      REQUESTING PARTY
                    </div>
                    {ce.claims_party_a.map((claim, i) => (
                      <ClaimRow
                        key={i}
                        claim={claim.text || claim}
                        confidence={
                          claim.confidence || ce.extraction_confidence || 0.8
                        }
                        flagged={!!flagged[claim.text || claim]}
                        onFlag={() => handleFlag(claim.text || claim)}
                        tk={tk}
                      />
                    ))}
                  </>
                )}
                {ce.claims_party_b?.length > 0 && (
                  <>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: tk.sub,
                        margin: "12px 0 8px",
                      }}
                    >
                      AGAINST PARTY
                    </div>
                    {ce.claims_party_b.map((claim, i) => (
                      <ClaimRow
                        key={i}
                        claim={claim.text || claim}
                        confidence={
                          claim.confidence || ce.extraction_confidence || 0.8
                        }
                        flagged={!!flagged[claim.text || claim]}
                        onFlag={() => handleFlag(claim.text || claim)}
                        tk={tk}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tone Analysis */}
          {(tone.requesting_party || tone.against_party) && (
            <div
              style={{
                background: tk.surface,
                borderRadius: 12,
                border: `1px solid ${tk.border}`,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setToneOpen((o) => !o)}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  borderBottom: toneOpen ? `1px solid ${tk.border}` : "none",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
                  Tone Analysis (Mediator Only)
                </span>
                {toneOpen ? (
                  <ChevronUp size={16} color={tk.sub} />
                ) : (
                  <ChevronDown size={16} color={tk.sub} />
                )}
              </button>

              {toneOpen && (
                <div
                  style={{
                    padding: "16px 18px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  {[
                    { label: "Requesting Party", data: tone.requesting_party },
                    { label: "Against Party", data: tone.against_party },
                  ].map(
                    ({ label, data }) =>
                      data && (
                        <div key={label}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: tk.sub,
                              marginBottom: 8,
                            }}
                          >
                            {label.toUpperCase()}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                            }}
                          >
                            <div style={{ fontSize: 13, color: tk.text }}>
                              Category: <strong>{data.tone_category}</strong>
                            </div>
                            <div style={{ fontSize: 13, color: tk.text }}>
                              Hostility:{" "}
                              <strong
                                style={{
                                  color:
                                    data.hostility_score >= 7
                                      ? "#ef4444"
                                      : data.hostility_score >= 4
                                        ? "#f59e0b"
                                        : "#16a34a",
                                }}
                              >
                                {data.hostility_score}/10
                              </strong>
                            </div>
                            <div style={{ fontSize: 13, color: tk.text }}>
                              Openness:{" "}
                              <strong style={{ color: "#16a34a" }}>
                                {data.openness_score}/10
                              </strong>
                            </div>
                            {data.tone_summary && (
                              <p
                                style={{
                                  fontSize: 12,
                                  color: tk.sub,
                                  margin: "4px 0 0",
                                  lineHeight: 1.5,
                                }}
                              >
                                {data.tone_summary}
                              </p>
                            )}
                          </div>
                        </div>
                      ),
                  )}
                </div>
              )}
            </div>
          )}

          {/* Internal Notes */}
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${tk.border}`,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
                Internal Notes
              </span>
              <p style={{ fontSize: 12, color: tk.sub, margin: "2px 0 0" }}>
                Private — never shown to parties
              </p>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your observations, concerns, or notes here..."
                style={{
                  width: "100%",
                  minHeight: 120,
                  background: tk.inputBg,
                  border: `1px solid ${tk.border}`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: tk.text,
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.6,
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={handleSaveNotes}
                disabled={notesLoading}
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 16px",
                  borderRadius: 7,
                  background: notesSaved ? "#16a34a" : "#1e40af",
                  color: "#fff",
                  border: "none",
                  cursor: notesLoading ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  opacity: notesLoading ? 0.7 : 1,
                  transition: "background 0.2s",
                }}
              >
                {notesSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
                {notesSaved
                  ? "Saved!"
                  : notesLoading
                    ? "Saving..."
                    : "Save Notes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </MediatorLayout>
  );
}
