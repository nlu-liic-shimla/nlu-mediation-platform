import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import MediatorLayout from "../../layouts/MediatorLayout";
import client from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

/* ── tokens ─────────────────────────────────────────────── */
const tokens = (dark) => ({
  bg: dark ? "#0f172a" : "#f1f5f9",
  surface: dark ? "#1e293b" : "#ffffff",
  border: dark ? "#334155" : "#e2e8f0",
  text: dark ? "#f1f5f9" : "#1e293b",
  sub: dark ? "#94a3b8" : "#64748b",
  inputBg: dark ? "#0f172a" : "#f8fafc",
});

/* ── Status badge ───────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    BURST_1_COMPLETE:       { label: "Ready to Send",         color: "#16a34a", bg: "#dcfce7" },
    QUESTIONNAIRE_ACTIVE:   { label: "Questionnaire Active",  color: "#d97706", bg: "#fef3c7" },
    QUESTIONNAIRE_COMPLETE: { label: "Both Parties Answered", color: "#1e40af", bg: "#dbeafe" },
    BURST_2_PROCESSING:     { label: "Burst 2 Processing",    color: "#7c3aed", bg: "#ede9fe" },
    BURST_2_COMPLETE:       { label: "Burst 2 Complete",      color: "#16a34a", bg: "#dcfce7" },
  };
  const s = map[status] || { label: status, color: "#64748b", bg: "#f1f5f9" };
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 20,
        background: s.bg,
        color: s.color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  );
}

/* ── Party response row ─────────────────────────────────── */
function PartyRow({ label, answered, tk }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderRadius: 8,
        background: tk.bg,
        border: `1px solid ${tk.border}`,
      }}
    >
      <span style={{ fontSize: 13, color: tk.text, fontWeight: 500 }}>
        {label}
      </span>
      {answered ? (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#16a34a",
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={14} /> Answered
        </span>
      ) : (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#d97706",
            fontWeight: 600,
          }}
        >
          <Clock size={14} /> Pending
        </span>
      )}
    </div>
  );
}

/* ── Question preview card ──────────────────────────────── */
function QuestionCard({ question, index, tk }) {
  const typeLabel = {
    open_ended: "Open Ended",
    yes_no: "Yes / No",
    scale_1_5: "Scale 1–5",
  };
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 8,
        background: tk.bg,
        border: `1px solid ${tk.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <span
          style={{
            flexShrink: 0,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "#1e40af",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {index + 1}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: tk.text, margin: "0 0 6px", lineHeight: 1.6 }}>
            {question.question_text || question.text || "—"}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 10,
                background: "#eff6ff",
                color: "#1e40af",
                fontWeight: 600,
              }}
            >
              {typeLabel[question.question_type || question.type] || question.question_type || question.type}
            </span>
            {question.directed_at && (
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: "#f0fdf4",
                  color: "#16a34a",
                  fontWeight: 600,
                }}
              >
                → {question.directed_at === "both" ? "Both parties" : question.directed_at}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function QuestionnaireManagement() {
  const { isDark } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
const [sendError, setSendError] = useState(null);
const [sendSuccess, setSendSuccess] = useState(false);

  const [width, setWidth] = useState(window.innerWidth);
  const tk = tokens(isDark);
  const isSmall = width < 700;

  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // ── Fetch case + questionnaire data ──────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch case details
        const caseRes = await client.get(`/cases/${id}`);
        setCaseData(caseRes.data);

        // Fetch questionnaires for the case
        const qRes = await client.get(`/cases/${id}/questionnaires`);
        const qList = Array.isArray(qRes.data)
          ? qRes.data
          : qRes.data?.questionnaires ?? [];

        if (qList.length > 0) {
          const q = qList[0];
          setQuestionnaire(q);

          // Fetch responses for the questionnaire (mediator gets all)
          try {
            const rRes = await client.get(
              `/cases/${id}/questionnaires/${q.id}/responses`
            );
            const rList = Array.isArray(rRes.data)
              ? rRes.data
              : rRes.data?.responses ?? [];
            setResponses(rList);
          } catch {
            setResponses([]);
          }
        }
      } catch {
        setError("Failed to load questionnaire data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ── Send questionnaire to both parties ───────────────────
  // Endpoint: POST /cases/{id}/questionnaires
  // Only enabled when status = BURST_1_COMPLETE
  const handleSend = async () => {
    setSending(true);
    setSendError(null);
    try {
      const res = await client.post(`/cases/${id}/questionnaires`);
      const newQ = res.data;
      setQuestionnaire(newQ);
      setSendSuccess(true);

      // Refresh case status
      const caseRes = await client.get(`/cases/${id}`);
      setCaseData(caseRes.data);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to send questionnaire. Please try again.";
      setSendError(msg);
    } finally {
      setSending(false);
    }
  };

  // ── Derived state ─────────────────────────────────────────
  const status = caseData?.status || "";
  const canSend = status === "BURST_1_COMPLETE" && !questionnaire;
  const questionnaireActive = [
    "QUESTIONNAIRE_ACTIVE",
    "QUESTIONNAIRE_COMPLETE",
    "BURST_2_PROCESSING",
    "BURST_2_COMPLETE",
  ].includes(status);

  const requestingPartyAnswered = responses.some(
    (r) => r.role === "requesting_party" || r.party_role === "requesting_party"
  );
  const againstPartyAnswered = responses.some(
    (r) => r.role === "against_party" || r.party_role === "against_party"
  );
  const bothAnswered =
    requestingPartyAnswered && againstPartyAnswered ||
    status === "QUESTIONNAIRE_COMPLETE" ||
    status === "BURST_2_PROCESSING" ||
    status === "BURST_2_COMPLETE";

  const questions = questionnaire
    ? Array.isArray(questionnaire.questions)
      ? questionnaire.questions
      : questionnaire.questions?.questions ?? []
    : [];

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
          Loading questionnaire...
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

  return (
    <MediatorLayout>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  margin: "0 0 4px",
                  color: tk.text,
                }}
              >
                Questionnaire Management
              </h1>
              <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
                Case {id?.slice(0, 8).toUpperCase()} — AI-generated dispute questionnaire
              </p>
            </div>
            {status && <StatusBadge status={status} />}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertTriangle size={16} color="#ef4444" />
            <span style={{ fontSize: 13, color: "#dc2626" }}>{error}</span>
          </div>
        )}

        {/* ── Send questionnaire panel ── */}
        {!questionnaireActive && (
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
                Send Questionnaire
              </span>
              <p style={{ fontSize: 12, color: tk.sub, margin: "2px 0 0" }}>
                Sub-system C will generate dispute-specific questions and send to both parties
              </p>
            </div>
            <div style={{ padding: "20px 18px" }}>
              {status !== "BURST_1_COMPLETE" ? (
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 8,
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    fontSize: 13,
                    color: "#92400e",
                  }}
                >
                  <strong>Not available yet.</strong> The questionnaire can only be sent after Burst 1 (AI analysis) is complete. Current status: <strong>{status || "Unknown"}</strong>
                </div>
              ) : sendSuccess ? (
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 8,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    fontSize: 13,
                    color: "#15803d",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <CheckCircle2 size={16} />
                  Questionnaire sent to both parties successfully. Waiting for responses.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <p style={{ fontSize: 13, color: tk.sub, margin: 0, lineHeight: 1.6 }}>
                    Clicking <strong>Send Questionnaire</strong> will call Sub-system C to generate
                    dispute-specific questions and notify both parties immediately. The case status
                    will change to <strong>Questionnaire Active</strong>.
                  </p>
                  {sendError && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        fontSize: 13,
                        color: "#dc2626",
                      }}
                    >
                      {sendError}
                    </div>
                  )}
                  <button
                    onClick={handleSend}
                    disabled={sending || !canSend}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 24px",
                      borderRadius: 8,
                      background: canSend ? "#1e40af" : "#94a3b8",
                      color: "#fff",
                      border: "none",
                      cursor: canSend && !sending ? "pointer" : "not-allowed",
                      fontSize: 14,
                      fontWeight: 600,
                      width: "fit-content",
                      opacity: sending ? 0.7 : 1,
                    }}
                  >
                    <Send size={15} />
                    {sending ? "Sending..." : "Send Questionnaire"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Response status panel ── */}
        {questionnaireActive && (
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
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
                  Response Status
                </span>
                <p style={{ fontSize: 12, color: tk.sub, margin: "2px 0 0" }}>
                  Burst 2 fires automatically once both parties respond
                </p>
              </div>
              {bothAnswered && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "#16a34a",
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={14} /> Both answered
                </span>
              )}
            </div>
            <div
              style={{
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <PartyRow
                label="Requesting Party"
                answered={requestingPartyAnswered || bothAnswered}
                tk={tk}
              />
              <PartyRow
                label="Against Party"
                answered={againstPartyAnswered || bothAnswered}
                tk={tk}
              />
            </div>

            {bothAnswered && status === "BURST_2_COMPLETE" && (
              <div style={{ padding: "0 18px 16px" }}>
                <button
                  onClick={() => navigate(`/mediator/cases/${id}/batna-watna`)}
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
                  View BATNA/WATNA Analysis →
                </button>
              </div>
            )}

            {status === "BURST_2_PROCESSING" && (
              <div
                style={{
                  margin: "0 18px 16px",
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "#ede9fe",
                  border: "1px solid #c4b5fd",
                  fontSize: 13,
                  color: "#5b21b6",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Clock size={14} />
                Burst 2 (BATNA/WATNA analysis) is running. This usually takes 30–60 seconds.
              </div>
            )}
          </div>
        )}

        {/* ── Question preview ── */}
        {questionnaire && questions.length > 0 && (
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
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
                  Generated Questions
                </span>
                <p style={{ fontSize: 12, color: tk.sub, margin: "2px 0 0" }}>
                  {questions.length} questions — mediator view includes all questions and purposes
                </p>
              </div>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: "#eff6ff",
                  color: "#1e40af",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {questions.length} Qs
              </span>
            </div>
            <div
              style={{
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {questions.map((q, i) => (
                <QuestionCard key={q.id || i} question={q} index={i} tk={tk} />
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state: questionnaire sent but no questions yet ── */}
        {questionnaire && questions.length === 0 && (
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              padding: "32px",
              textAlign: "center",
              color: tk.sub,
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            Questionnaire sent. Question details not yet available — the backend is processing.
          </div>
        )}
      </div>
    </MediatorLayout>
  );
}