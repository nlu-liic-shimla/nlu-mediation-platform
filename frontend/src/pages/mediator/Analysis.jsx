import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAnalysis,
  getDocuments,
  flagAnalysisClaim,
  unflagAnalysisClaim,
  saveNotes,
  getSubmissions,
  getFlags,
  getFlaggedClaims,
  getCaseById,
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
import { useTheme } from "../../context/ThemeContext";

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
function BiasBadge({ biasRemoval }) {
  let status = "none";
  if (biasRemoval) {
    if (!biasRemoval.bias_detected) status = "none";
    else if (biasRemoval.bias_check_passed) status = "corrected";
    else status = "unresolved";
  }

  const config = {
    none: { color: "#16a34a", bg: "#dcfce7", label: "✓ No bias detected" },
    corrected: { color: "#d97706", bg: "#fef9c3", label: "⚠ Bias detected and corrected" },
    unresolved: { color: "#dc2626", bg: "#fee2e2", label: "✗ Potential bias — review carefully" },
  };
  const c = config[status];
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
  const percentage = score ? score * 10 : 0;
  const color =
    percentage >= 70 ? "#16a34a" : percentage >= 40 ? "#d97706" : "#dc2626";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: tk.sub }}>Mediatability Score</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {score || 0}/10 — {band || "—"}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: tk.border, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            borderRadius: 4,
            width: `${percentage}%`,
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
        <p style={{ margin: 0, fontSize: 13, color: tk.text }}>
          {typeof claim === "string" ? claim : claim?.text || String(claim)}
        </p>
        <span style={{ fontSize: 11, color: confColor, marginTop: 4, display: "block" }}>
          Confidence: {Math.round((confidence || 0) * 100)}%
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
function DocumentList({ docs, tk }) {
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
              {doc.file_name || doc.filename || "Document"}
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
  const { isDark } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState("pending");
  const [documents, setDocuments] = useState({ requesting_party: [], against_party: [] });
  const [submissions, setSubmissions] = useState({ requesting_party: null, against_party: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [flagged, setFlagged] = useState({});
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

  const [toneOpen, setToneOpen] = useState(false);
  const [factorsOpen, setFactorsOpen] = useState(false);

  const tk = tokens(isDark);
  const width = useWindowWidth();
  const isSmall = width < 900;

useEffect(() => {
  if (!id) return;

  const fetchData = async () => {
    try {
      const [analysisResponse, docsData, subsData, flagsData, caseResult] =
        await Promise.all([
          getAnalysis(id),
          getDocuments(id).catch(() => ({ requesting_party: [], against_party: [] })),
          getSubmissions(id).catch(() => ({ submissions: [] })),
          getFlaggedClaims(id).catch(() => ({ flags: [] })),
          getCaseById(id).catch(() => null),
        ]);

      const status = analysisResponse?.status || "pending";
      setAnalysisStatus(status);

      if (status === "complete") {
        const aiData = analysisResponse?.data || analysisResponse;
        setAnalysis(aiData);
      } else {
        setAnalysis(null);
      }

      setNotes(caseResult?.mediator_notes || "");

      const flagMap = {};
      (flagsData?.flags || []).forEach((flag) => {
        flagMap[flag.claim_text] = true;
      });
      setFlagged(flagMap);

      setDocuments(docsData || { requesting_party: [], against_party: [] });

      const subs = subsData?.submissions || [];
      const subMap = { requesting_party: null, against_party: null };
      subs.forEach((sub) => {
        if (sub.invitation_role === "requesting_party") subMap.requesting_party = sub;
        else if (sub.invitation_role === "against_party") subMap.against_party = sub;
      });
      if (!subMap.requesting_party && !subMap.against_party) {
        if (subs[0]) subMap.requesting_party = subs[0];
        if (subs[1]) subMap.against_party = subs[1];
      }
      setSubmissions(subMap);
    } catch (err) {
      console.error("Analysis fetch error:", err);
      setError("Failed to load analysis");
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [id]);

  /* ── Guards ── */
  if (!id)
    return (
      <MediatorLayout>
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

  if (loading)
    return (
      <MediatorLayout>
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
      <MediatorLayout>
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
      <MediatorLayout>
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
            {analysisStatus === "processing"
              ? "AI analysis is in progress — check back shortly"
              : analysisStatus === "failed"
              ? "AI analysis failed — ask mediator to retry"
              : "AI analysis not yet available for this case"}
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

  /* ── Safe destructure ── */
  const ce = analysis.conflict_extraction || {};
  const ns = analysis.neutral_summary || {};
  const med = analysis.mediatability || {};
  const tone = analysis.tone_analysis || {};
  const biasRemoval = analysis.bias_removal || null;

  /* ── Handlers ── */
  const handleFlag = async (claimText) => {
  const isCurrentlyFlagged = !!flagged[claimText];
  try {
    if (isCurrentlyFlagged) {
      await unflagAnalysisClaim(id, claimText);
    } else {
      await flagAnalysisClaim(id, claimText);
    }
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

  /* ── Render ── */
  return (
    <MediatorLayout>
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
          {ce.dispute_type &&
            ` • ${String(ce.dispute_type)
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase())}`}
        </p>
      </div>

      {/* ── Low confidence warning ── */}
      {ce.extraction_confidence !== undefined && ce.extraction_confidence < 0.5 && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: "#fefce8",
            border: "1px solid #fde047",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <AlertTriangle size={16} color="#ca8a04" />
          <span style={{ fontSize: 13, color: "#92400e" }}>
            Low confidence extraction ({Math.round(ce.extraction_confidence * 100)}%) —
            review the conflict claims carefully before proceeding.
          </span>
        </div>
      )}

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
              (ce.claims_party_a?.length || 0) + (ce.claims_party_b?.length || 0),
            color: "#10b981",
          },
          { label: "Disputed Facts", value: ce.disputed_facts?.length || 0, color: "#f59e0b" },
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
            <div style={{ fontSize: 12, color: tk.sub, marginBottom: 4 }}>{label}</div>
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            position: isSmall ? "static" : "sticky",
            top: isSmall ? "auto" : 16,
            alignSelf: "start",
            maxHeight: isSmall ? "none" : "calc(100vh - 80px)",
            overflowY: isSmall ? "visible" : "auto",
          }}
        >
          {/* Requesting Party Submission */}
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${tk.border}`, background: isDark ? "#1e293b" : "#f8fafc" }}>
  <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
    Requesting Party — Raw Submission
  </span>
  <p style={{ fontSize: 11, color: "#d97706", margin: "4px 0 0" }}>
    ⚠ Unedited — may contain emotional or biased language. See AI Neutral Summary for a processed version.
  </p>
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
                {submissions.requesting_party?.statement || "No statement available"}
              </p>
              <div style={{ fontSize: 12, fontWeight: 600, color: tk.sub, marginBottom: 8 }}>
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
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${tk.border}`, background: isDark ? "#1e293b" : "#f8fafc" }}>
  <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
    Against Party — Raw Submission
  </span>
  <p style={{ fontSize: 11, color: "#d97706", margin: "4px 0 0" }}>
    ⚠ Unedited — may contain emotional or biased language. See AI Neutral Summary for a processed version.
  </p>
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
                {submissions.against_party?.statement || "No statement available"}
              </p>
              <div style={{ fontSize: 12, fontWeight: 600, color: tk.sub, marginBottom: 8 }}>
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
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
                AI Neutral Summary
              </span>
              <BiasBadge biasRemoval={biasRemoval} />
            </div>
            <div style={{ padding: "16px 18px" }}>
              {analysis.mediator_edited_content ? (
                <>
                  <p style={{ fontSize: 13, color: tk.text, lineHeight: 1.7, margin: "0 0 8px" }}>
                    {analysis.mediator_edited_content}
                  </p>
                  <span style={{ fontSize: 11, color: tk.sub }}>
                    Mediator edited —{" "}
                    {analysis.edited_at ? new Date(analysis.edited_at).toLocaleString() : ""}
                  </span>
                </>
              ) : biasRemoval?.bias_detected && biasRemoval?.revised_summary ? (
                <>
                  <p style={{ fontSize: 13, color: tk.text, lineHeight: 1.7, margin: "0 0 8px" }}>
                    {biasRemoval.revised_summary}
                  </p>
                  <span style={{ fontSize: 11, color: "#d97706" }}>
                    Bias was detected and corrected in this summary
                  </span>
                </>
              ) : (
                <p style={{ fontSize: 13, color: tk.text, lineHeight: 1.7, margin: 0 }}>
                  {ns.summary || "Summary not yet generated"}
                </p>
              )}

              {(ns.party_a_position || ns.party_b_position) && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  {ns.party_a_position && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: tk.sub, marginBottom: 4 }}>
                        REQUESTING PARTY POSITION
                      </div>
                      <p style={{ fontSize: 12, color: tk.text, lineHeight: 1.6, margin: 0 }}>
                        {ns.party_a_position}
                      </p>
                    </div>
                  )}
                  {ns.party_b_position && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: tk.sub, marginBottom: 4 }}>
                        AGAINST PARTY POSITION
                      </div>
                      <p style={{ fontSize: 12, color: tk.text, lineHeight: 1.6, margin: 0 }}>
                        {ns.party_b_position}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {ns.key_issues?.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: tk.sub, marginBottom: 6 }}>
                    KEY ISSUES
                  </div>
                  {ns.key_issues.map((issue, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 12,
                        color: tk.text,
                        padding: "4px 0",
                        borderBottom:
                          i < ns.key_issues.length - 1 ? `1px solid ${tk.border}` : "none",
                      }}
                    >
                      {i + 1}. {issue}
                    </div>
                  ))}
                </div>
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
              score={med.mediatability_score || 0}
              band={med.mediatability_band || "—"}
              tk={tk}
            />
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
              {factorsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {factorsOpen ? "Hide" : "Show"} factor breakdown
            </button>

            {factorsOpen && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {med.positive_factors?.map((f, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#16a34a" }}>+ {f}</div>
                ))}
                {med.negative_factors?.map((f, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#ef4444" }}>− {f}</div>
                ))}
                {med.recommended_approach && (
                  <div style={{ marginTop: 8, fontSize: 12, color: tk.sub, fontStyle: "italic" }}>
                    {med.recommended_approach}
                  </div>
                )}
              </div>
            )}

            {med.score_justification && (
              <p style={{ fontSize: 13, color: tk.sub, marginTop: 12, lineHeight: 1.6 }}>
                {med.score_justification}
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
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${tk.border}` }}>
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
                    <div style={{ fontSize: 12, fontWeight: 600, color: tk.sub, marginBottom: 8 }}>
                      REQUESTING PARTY
                    </div>
                    {ce.claims_party_a.map((claim, i) => {
                      const claimText =
                        typeof claim === "string" ? claim : claim?.text || String(claim);
                      return (
                        <ClaimRow
                          key={i}
                          claim={claimText}
                          confidence={ce.extraction_confidence || 0.8}
                          flagged={!!flagged[claimText]}
                          onFlag={() => handleFlag(claimText)}
                          tk={tk}
                        />
                      );
                    })}
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
                    {ce.claims_party_b.map((claim, i) => {
                      const claimText =
                        typeof claim === "string" ? claim : claim?.text || String(claim);
                      return (
                        <ClaimRow
                          key={i}
                          claim={claimText}
                          confidence={ce.extraction_confidence || 0.8}
                          flagged={!!flagged[claimText]}
                          onFlag={() => handleFlag(claimText)}
                          tk={tk}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tone Analysis */}
          {(tone.party_a_tone || tone.party_b_tone) && (
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
                <div style={{ padding: "16px 18px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                      marginBottom: 16,
                    }}
                  >
                    {[
                      { label: "Requesting Party", data: tone.party_a_tone },
                      { label: "Against Party", data: tone.party_b_tone },
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
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                        )
                    )}
                  </div>

                  {tone.combined_conflict_intensity !== undefined && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: tk.bg,
                        border: `1px solid ${tk.border}`,
                        marginBottom: 12,
                      }}
                    >
                      <span style={{ fontSize: 13, color: tk.sub }}>
                        Combined conflict intensity:{" "}
                      </span>
                      <strong
                        style={{
                          color:
                            tone.combined_conflict_intensity >= 7
                              ? "#ef4444"
                              : tone.combined_conflict_intensity >= 4
                              ? "#f59e0b"
                              : "#16a34a",
                        }}
                      >
                        {tone.combined_conflict_intensity}/10
                      </strong>
                    </div>
                  )}

                  {tone.mediator_advisory && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#1e40af",
                          marginBottom: 4,
                        }}
                      >
                        MEDIATOR ADVISORY
                      </div>
                      <p style={{ fontSize: 13, color: "#1e40af", margin: 0, lineHeight: 1.6 }}>
                        {tone.mediator_advisory}
                      </p>
                    </div>
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
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${tk.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
                Internal Notes
              </span>
              <p style={{ fontSize: 12, color: tk.sub, margin: "2px 0 0" }}>
                Private — never shown to parties. Fed to AI during proposal revision.
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
                {notesSaved ? "Saved!" : notesLoading ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </MediatorLayout>
  );
}