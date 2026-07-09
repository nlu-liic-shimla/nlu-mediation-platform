import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getQuestionnaires, getQuestionnaireResponses } from "../../api/cases";
import { AlertTriangle, Send } from "lucide-react";
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
  accent: "#1e40af",
});

/* ── isDivergent ─────────────────────────────────────────── */
function isDivergent(a, b) {
  if (!a || !b) return false;
  return (
    a.toString().trim().toLowerCase() !== b.toString().trim().toLowerCase()
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function QuestionnaireManagement() {
  const { isDark } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();

  const [questionnaire, setQuestionnaire] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [width, setWidth] = useState(window.innerWidth);
  const tk = tokens(isDark);
  const isSmall = width < 700;

  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get questionnaire list
        const qData = await getQuestionnaires(id);
        const q = Array.isArray(qData)
          ? qData[0]
          : qData.questionnaires?.[0] || qData;

        if (q?.id) {
          setQuestionnaire(q);
          // Get responses for this questionnaire
          try {
            const rData = await getQuestionnaireResponses(id, q.id);
            const questions = Array.isArray(rData)
              ? rData
              : rData.questions || rData.responses || [];
            setResponses(questions);
          } catch {
            setResponses([]);
          }
        }
      } catch {
        setError("Failed to load questionnaire");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSendQuestionnaire = async () => {
    setSending(true);
    try {
      await client.post(`/cases/${id}/questionnaires`);
      setSent(true);
      // Refresh
      const qData = await getQuestionnaires(id);
      const q = Array.isArray(qData)
        ? qData[0]
        : qData.questionnaires?.[0] || qData;
      if (q?.id) {
        setQuestionnaire(q);
        const rData = await getQuestionnaireResponses(id, q.id);
        const questions = Array.isArray(rData)
          ? rData
          : rData.questions || rData.responses || [];
        setResponses(questions);
      }
    } catch {
      alert("Failed to send questionnaire. Try again.");
    } finally {
      setSending(false);
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
                Case {id?.slice(0, 8).toUpperCase()} — Party responses side by
                side
              </p>
            </div>

            {/* Send questionnaire button */}
            {!questionnaire && (
              <button
                onClick={handleSendQuestionnaire}
                disabled={sending}
                style={{
                  padding: "9px 20px",
                  borderRadius: 8,
                  background: "#1e40af",
                  color: "#fff",
                  border: "none",
                  cursor: sending ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: sending ? 0.7 : 1,
                }}
              >
                <Send size={14} />
                {sending ? "Sending..." : "Send Questionnaire"}
              </button>
            )}
          </div>
        </div>

        {/* ── No questionnaire yet ── */}
        {!questionnaire && (
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              padding: "40px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: tk.text,
                margin: "0 0 8px",
              }}
            >
              No questionnaire sent yet
            </p>
            <p style={{ fontSize: 13, color: tk.sub, margin: "0 0 20px" }}>
              Send an AI-generated questionnaire to both parties based on the
              dispute type.
            </p>
            <button
              onClick={handleSendQuestionnaire}
              disabled={sending}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                background: "#1e40af",
                color: "#fff",
                border: "none",
                cursor: sending ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? "Sending..." : "Send Questionnaire Now"}
            </button>
          </div>
        )}

        {/* ── Questionnaire exists ── */}
        {questionnaire && (
          <>
            {/* Status */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              {[
                {
                  label: "Questions",
                  value:
                    responses.length || questionnaire.question_count || "—",
                },
                {
                  label: "Req Party",
                  value: questionnaire.requesting_party_answered
                    ? "✅ Answered"
                    : "⏳ Pending",
                  color: questionnaire.requesting_party_answered
                    ? "#16a34a"
                    : "#f59e0b",
                },
                {
                  label: "Against Party",
                  value: questionnaire.against_party_answered
                    ? "✅ Answered"
                    : "⏳ Pending",
                  color: questionnaire.against_party_answered
                    ? "#16a34a"
                    : "#f59e0b",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    background: tk.surface,
                    borderRadius: 10,
                    border: `1px solid ${tk.border}`,
                    padding: "12px 16px",
                    flex: 1,
                    minWidth: 120,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: tk.sub,
                      marginBottom: 4,
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: color || tk.text,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Three column table ── */}
            {responses.length > 0 ? (
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
                    background: tk.bg,
                  }}
                >
                  <span
                    style={{ fontSize: 14, fontWeight: 600, color: tk.text }}
                  >
                    Response Comparison
                  </span>
                  <p style={{ fontSize: 12, color: tk.sub, margin: "2px 0 0" }}>
                    Divergent answers highlighted in yellow
                  </p>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 13,
                      minWidth: 600,
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: `1px solid ${tk.border}`,
                          background: tk.bg,
                        }}
                      >
                        {["Question", "Requesting Party", "Against Party"].map(
                          (h) => (
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
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((q, i) => {
                        const rpAnswer =
                          q.requesting_party_answer || q.party_a_answer || "—";
                        const apAnswer =
                          q.against_party_answer || q.party_b_answer || "—";
                        const divergent = isDivergent(rpAnswer, apAnswer);

                        return (
                          <tr
                            key={q.id || i}
                            style={{
                              borderBottom:
                                i < responses.length - 1
                                  ? `1px solid ${tk.border}`
                                  : "none",
                              background: divergent ? "#fefce8" : "transparent",
                            }}
                          >
                            {/* Question */}
                            <td
                              style={{
                                padding: "14px 16px",
                                color: tk.text,
                                fontWeight: 500,
                                verticalAlign: "top",
                                borderLeft: divergent
                                  ? "3px solid #f59e0b"
                                  : "3px solid transparent",
                              }}
                            >
                              <div>{q.question_text || q.question || "—"}</div>
                              {q.directed_at && q.directed_at !== "both" && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: tk.sub,
                                    marginTop: 4,
                                    display: "block",
                                  }}
                                >
                                  Directed at: {q.directed_at}
                                </span>
                              )}
                            </td>

                            {/* Requesting party answer */}
                            <td
                              style={{
                                padding: "14px 16px",
                                color: tk.text,
                                verticalAlign: "top",
                              }}
                            >
                              {rpAnswer === "—" ? (
                                <span
                                  style={{ color: tk.sub, fontStyle: "italic" }}
                                >
                                  No answer yet
                                </span>
                              ) : (
                                <span>{rpAnswer}</span>
                              )}
                            </td>

                            {/* Against party answer */}
                            <td
                              style={{
                                padding: "14px 16px",
                                color: tk.text,
                                verticalAlign: "top",
                              }}
                            >
                              {apAnswer === "—" ? (
                                <span
                                  style={{ color: tk.sub, fontStyle: "italic" }}
                                >
                                  No answer yet
                                </span>
                              ) : (
                                <span>{apAnswer}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: tk.surface,
                  borderRadius: 12,
                  border: `1px solid ${tk.border}`,
                  padding: "30px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: 14, color: tk.sub, margin: 0 }}>
                  Waiting for parties to answer the questionnaire
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </MediatorLayout>
  );
}
