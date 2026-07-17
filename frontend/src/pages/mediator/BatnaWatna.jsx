import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBatnaWatna, getQuestionnaires, getQuestionnaireResponses, saveNotes, getCaseById } from "../../api/cases";
import { AlertTriangle, ChevronDown, ChevronUp, Save, CheckCircle2 } from "lucide-react";
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

/* ── Label config ───────────────────────────────────────── */
const LABEL_COLOR = {
  Strong: "#16a34a",
  Moderate: "#d97706",
  Weak: "#dc2626",
};

/* ── isDivergent helper ─────────────────────────────────── */
function isDivergent(a, b) {
  if (!a || !b) return false;
  return a.toString().trim().toLowerCase() !== b.toString().trim().toLowerCase();
}

/* ── ScoreCard ──────────────────────────────────────────── */
function ScoreCard({ title, score, label, reasoning, guidance, tk }) {
  const color = LABEL_COLOR[label] || "#64748b";
  return (
    <div
      style={{
        background: tk.surface,
        borderRadius: 12,
        border: `1px solid ${tk.border}`,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${tk.border}`,
          background: (dark) => (dark ? "#1e293b" : "#f8fafc"),
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: tk.sub,
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 28,
              fontWeight: 800,
              color,
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: 14,
              color: tk.sub,
              fontWeight: 500,
            }}
          >
            ({score}/10)
          </span>
        </div>
      </div>
      <div style={{ padding: "14px 18px" }}>
        <p
          style={{
            fontSize: 13,
            color: tk.text,
            lineHeight: 1.7,
            margin: "0 0 12px",
          }}
        >
          {reasoning}
        </p>
        {guidance && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: `${color}12`,
              border: `1px solid ${color}30`,
            }}
          >
            <p style={{ fontSize: 12, color, margin: 0, lineHeight: 1.6 }}>
              {guidance}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── PartyColumn ────────────────────────────────────────── */
function PartyColumn({ label, data, tk }) {
  if (!data) return null;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: tk.sub,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>

      {/* BATNA */}
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
            padding: "12px 16px",
            borderBottom: `1px solid ${tk.border}`,
            background: tk.bg,
          }}
        >
          <div style={{ fontSize: 12, color: tk.sub, marginBottom: 2 }}>
            BATNA — Best Alternative
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: LABEL_COLOR[data.batna_label] || "#64748b",
              }}
            >
              {data.batna_label}
            </span>
            <span style={{ fontSize: 13, color: tk.sub }}>
              ({data.batna_score}/10)
            </span>
          </div>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <p
            style={{ fontSize: 13, color: tk.text, lineHeight: 1.7, margin: 0 }}
          >
            {data.batna_reasoning}
          </p>
        </div>
      </div>

      {/* WATNA */}
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
            padding: "12px 16px",
            borderBottom: `1px solid ${tk.border}`,
            background: tk.bg,
          }}
        >
          <div style={{ fontSize: 12, color: tk.sub, marginBottom: 2 }}>
            WATNA — Worst Alternative
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: LABEL_COLOR[data.watna_label] || "#64748b",
              }}
            >
              {data.watna_label}
            </span>
            <span style={{ fontSize: 13, color: tk.sub }}>
              ({data.watna_score}/10)
            </span>
          </div>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <p
            style={{ fontSize: 13, color: tk.text, lineHeight: 1.7, margin: 0 }}
          >
            {data.watna_reasoning}
          </p>
        </div>
      </div>

      {/* Guidance */}
      {data.negotiation_guidance && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#1e40af",
              marginBottom: 4,
            }}
          >
            Negotiation Guidance
          </div>
          <p
            style={{
              fontSize: 13,
              color: "#1e3a5f",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {data.negotiation_guidance}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── QuestionnaireComparison ────────────────────────────── */
function QuestionnaireComparison({ responses, loading, tk }) {
  return (
    <div
      style={{
        background: tk.surface,
        borderRadius: 12,
        border: `1px solid ${tk.border}`,
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${tk.border}`,
          background: tk.bg,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
          Questionnaire Responses
        </span>
        <p style={{ fontSize: 12, color: tk.sub, margin: "2px 0 0" }}>
          Divergent answers highlighted in yellow
        </p>
      </div>

      {loading ? (
        <div style={{ padding: "24px", textAlign: "center", color: tk.sub, fontSize: 13 }}>
          Loading questionnaire responses...
        </div>
      ) : !responses || responses.length === 0 ? (
        <div style={{ padding: "24px", textAlign: "center", color: tk.sub, fontSize: 13 }}>
          No questionnaire responses available yet.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tk.border}`, background: tk.bg }}>
                {["Question", "Requesting Party", "Against Party"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: tk.sub,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {responses.map((q, i) => {
                const rpAnswer = q.requesting_party_answer || q.party_a_answer || "—";
                const apAnswer = q.against_party_answer || q.party_b_answer || "—";
                const divergent = isDivergent(rpAnswer, apAnswer);

                return (
                  <tr
                    key={q.id || i}
                    style={{
                      borderBottom: i < responses.length - 1 ? `1px solid ${tk.border}` : "none",
                      background: divergent ? "#fefce8" : "transparent",
                    }}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        color: tk.text,
                        fontWeight: 500,
                        verticalAlign: "top",
                        borderLeft: divergent ? "3px solid #f59e0b" : "3px solid transparent",
                      }}
                    >
                      {q.question_text || q.question || "—"}
                    </td>
                    <td style={{ padding: "14px 16px", color: tk.text, verticalAlign: "top" }}>
                      {rpAnswer === "—" ? (
                        <span style={{ color: tk.sub, fontStyle: "italic" }}>No answer yet</span>
                      ) : (
                        rpAnswer
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", color: tk.text, verticalAlign: "top" }}>
                      {apAnswer === "—" ? (
                        <span style={{ color: tk.sub, fontStyle: "italic" }}>No answer yet</span>
                      ) : (
                        apAnswer
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function BatnaWatna() {
  const { isDark } = useTheme();
const { id } = useParams();
const navigate = useNavigate();
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [width, setWidth] = useState(window.innerWidth);
const [qLoading, setQLoading] = useState(true);
const [qResponses, setQResponses] = useState([]);
const [notesLoaded, setNotesLoaded] = useState(false);
const [notes, setNotes] = useState("");
const [notesSaving, setNotesSaving] = useState(false);
const [notesSaved, setNotesSaved] = useState(false);

  const tk = tokens(isDark);
  const isSmall = width < 900;

  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getBatnaWatna(id);
        setData(res);
      } catch {
        setError("Failed to load BATNA/WATNA analysis");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  // ── Fetch questionnaire responses for the comparison table ──
  useEffect(() => {
    const fetchQuestionnaire = async () => {
      setQLoading(true);
      try {
        const qData = await getQuestionnaires(id);
        const q = Array.isArray(qData) ? qData[0] : qData.questionnaires?.[0] || qData;

        if (q?.id) {
          const rData = await getQuestionnaireResponses(id, q.id);
          const questions = Array.isArray(rData)
            ? rData
            : rData.questions || rData.responses || [];
          setQResponses(questions);
        } else {
          setQResponses([]);
        }
      } catch {
        setQResponses([]);
      } finally {
        setQLoading(false);
      }
    };
    fetchQuestionnaire();
  }, [id]);

  // ── Load existing mediator notes ──
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const caseData = await getCaseById(id);
        setNotes(caseData?.mediator_notes || "");
      } catch {
        // fail silently — notes are non-critical
      } finally {
        setNotesLoaded(true);
      }
    };
    fetchNotes();
  }, [id]);

  // ── Auto-save notes on blur ──
  const handleNotesBlur = async () => {
    if (!notesLoaded) return;
    setNotesSaving(true);
    try {
      await saveNotes(id, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch {
      // fail silently — don't block mediator workflow
    } finally {
      setNotesSaving(false);
    }
  };

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
          Loading BATNA/WATNA analysis...
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

  const rp = data?.requesting_party;
  const ap = data?.against_party;

  return (
    <MediatorLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
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
              fontSize: 22,
              fontWeight: 700,
              margin: "0 0 4px",
              color: tk.text,
            }}
          >
            BATNA / WATNA Analysis
          </h1>
          <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
            Case {id?.slice(0, 8).toUpperCase()} — Negotiation position analysis
          </p>
        </div>

        {/* ── Settlement Zone ── */}
        {data?.overall_settlement_zone && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#1e40af",
                marginBottom: 4,
              }}
            >
              SETTLEMENT ZONE
            </div>
            <p
              style={{
                fontSize: 14,
                color: "#1e3a5f",
                margin: 0,
                fontWeight: 500,
              }}
            >
              {data.overall_settlement_zone}
            </p>
          </div>
        )}

        {/* ── Two column layout ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isSmall ? "1fr" : "1fr 1fr",
            gap: 20,
            marginBottom: 20,
          }}
        >
          <PartyColumn label="Requesting Party" data={rp} tk={tk} />
          <PartyColumn label="Against Party" data={ap} tk={tk} />
        </div>

        {/* ── Questionnaire comparison table ── */}
        <QuestionnaireComparison responses={qResponses} loading={qLoading} tk={tk} />

        {/* ── Mediator notes — auto-save on blur ── */}
        <div
          style={{
            background: tk.surface,
            borderRadius: 12,
            border: `1px solid ${tk.border}`,
            overflow: "hidden",
            marginBottom: 20,
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
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
                Mediator Notes
              </span>
              <p style={{ fontSize: 12, color: tk.sub, margin: "2px 0 0" }}>
                Private — never shown to parties. Saves automatically when you click away.
              </p>
            </div>
            {notesSaving && (
              <span style={{ fontSize: 12, color: tk.sub }}>Saving...</span>
            )}
            {!notesSaving && notesSaved && (
              <span
                style={{
                  fontSize: 12,
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <CheckCircle2 size={13} /> Saved
              </span>
            )}
          </div>
          <div style={{ padding: "16px 18px" }}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add observations on negotiation positions, settlement strategy, or anything to remember before drafting a proposal..."
              style={{
                width: "100%",
                minHeight: 110,
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
          </div>
        </div>

        {/* ── Disclaimer ── */}
        {data?.disclaimer && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              background: tk.bg,
              border: `1px solid ${tk.border}`,
              marginBottom: 20,
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: tk.sub,
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {data.disclaimer}
            </p>
          </div>
        )}

        {/* ── Create Proposal button ── */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => navigate(`/mediator/cases/${id}/proposals/new`)}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              background: "#1e40af",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Create Proposal →
          </button>
        </div>
      </div>
    </MediatorLayout>
  );
}