import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuditLog } from "../../api/cases";
import { AlertTriangle } from "lucide-react";
import MediatorLayout from "../../layouts/MediatorLayout";
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

/* ── Action color ───────────────────────────────────────── */
const actionColor = (action) => {
  if (!action) return "#64748b";
  const a = action.toUpperCase();
  if (
    a.includes("COMPLETE") ||
    a.includes("ACCEPTED") ||
    a.includes("CONFIRMED")
  )
    return "#16a34a";
  if (a.includes("FAILED") || a.includes("REJECTED")) return "#ef4444";
  if (a.includes("PROCESSING") || a.includes("PENDING")) return "#f59e0b";
  if (a.includes("PUBLISHED") || a.includes("CREATED")) return "#1e40af";
  return "#64748b";
};
const ACTION_LABELS = {
  STATE_TRANSITION: "Status changed",
  INVITATION_GENERATED: "Invitation link generated",
  INVITATION_ACCEPTED: "Party joined the case",
  INVITATION_DECLINED: "Party declined invitation",
  INVITATION_REGENERATED: "Invitation link regenerated",
  APPLICATION_ACCEPTED: "Application accepted",
  APPLICATION_REJECTED: "Application rejected",
  APPLICATION_WITHDRAWN: "Application withdrawn",
  CASE_CLOSED_PARTY_DECLINED: "Case closed — party declined too many times",
  REQUESTING_PARTY_ANSWERED: "Requesting party answered questionnaire",
  AGAINST_PARTY_ANSWERED: "Against party answered questionnaire",
  PROPOSAL_DRAFT_CREATED: "Proposal draft created",
  PROPOSAL_DRAFT_SAVED: "Proposal draft saved",
  PROPOSAL_PUBLISHED: "Proposal published",
  PARTY_ACCEPTED_PROPOSAL: "Party accepted proposal",
  PARTY_REJECTED_PROPOSAL: "Party rejected proposal",
  MEDIATION_COMPLETE: "Mediation completed",
  MEDIATION_IN_PROGRESS: "Negotiation continuing",
  PROPOSAL_REVISION_GENERATED: "AI generated a revised proposal",
  ROUNDS_EXTENDED: "Negotiation rounds extended",
  CASE_FINALISED: "Case finalised by mediator",
};

const STATE_LABELS = {
  BOTH_INVITED: "Both Invited",
  FIRST_PARTY_SUBMITTED: "First Party Submitted",
  BOTH_SUBMITTED: "Both Submitted",
  BURST_1_PROCESSING: "AI Analysis Running",
  BURST_1_COMPLETE: "AI Analysis Complete",
  PROCESSING_FAILED: "Processing Failed",
  QUESTIONNAIRE_ACTIVE: "Questionnaire Active",
  QUESTIONNAIRE_COMPLETE: "Questionnaire Complete",
  BURST_2_PROCESSING: "BATNA/WATNA Running",
  BURST_2_COMPLETE: "BATNA/WATNA Complete",
  PROPOSAL_DRAFT: "Proposal Drafted",
  PROPOSAL_PUBLISHED: "Proposal Published",
  MEDIATION_IN_PROGRESS: "Negotiation In Progress",
  MEDIATION_COMPLETE: "Mediation Complete",
  MEDIATION_FAILED: "Mediation Failed",
};

const humanizeAction = (action) => ACTION_LABELS[action] || (action ? action.replace(/_/g, " ").toLowerCase() : "—");
const humanizeState = (state) => STATE_LABELS[state] || (state ? state.replace(/_/g, " ") : "—");

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function AuditLog() {
  const { isDark } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [width, setWidth] = useState(window.innerWidth);

  const tk = tokens(isDark);
  const isSmall = width < 700;

  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getAuditLog(id);
        setLogs(Array.isArray(data) ? data : data.logs || []);
      } catch {
        setError("Failed to load audit log");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [id]);

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
          Loading audit log...
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
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: "0 0 4px",
              color: tk.text,
            }}
          >
            Audit Log
          </h1>
          <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
            Case {id?.slice(0, 8).toUpperCase()} — Every event recorded in order
          </p>
        </div>

        {/* ── Table ── */}
        <div
          style={{
            background: tk.surface,
            borderRadius: 12,
            border: `1px solid ${tk.border}`,
            overflow: "hidden",
          }}
        >
          {logs.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: tk.sub,
                fontSize: 14,
              }}
            >
              No events recorded yet
            </div>
          ) : (
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
                    {[
                      "Timestamp",
                      "Actor",
                      "Action",
                      "Old State",
                      "New State",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontWeight: 600,
                          color: tk.sub,
                          whiteSpace: "nowrap",
                          fontSize: 12,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr
                      key={log.id || i}
                      style={{
                        borderBottom:
                          i < logs.length - 1
                            ? `1px solid ${tk.border}`
                            : "none",
                      }}
                    >
                      {/* Timestamp */}
                      <td
                        style={{
                          padding: "14px 16px",
                          color: tk.sub,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString()
                          : "—"}
                      </td>

                      {/* Actor */}
                      <td
                        style={{ padding: "14px 16px", whiteSpace: "nowrap" }}
                      >
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            background: "#eff6ff",
                            color: "#1e40af",
                          }}
                        >
                          {log.actor_role ||
                            log.actor_id?.slice(0, 8) ||
                            "System"}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: 5,
                            fontSize: 12,
                            fontWeight: 600,
                            background: `${actionColor(log.action)}18`,
                            color: actionColor(log.action),
                            whiteSpace: "nowrap",
                          }}
                        >
                          {humanizeAction(log.action)}
                        </span>
                      </td>

                      {/* Old State */}
                      <td
                        style={{
                          padding: "14px 16px",
                          color: tk.sub,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.old_state || "—"}
                      </td>

                      {/* New State */}
                      <td
                        style={{ padding: "14px 16px", whiteSpace: "nowrap" }}
                      >
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 5,
                            fontSize: 12,
                            fontWeight: 600,
                            background: `${actionColor(log.new_state)}18`,
                            color: actionColor(log.new_state),
                          }}
                        >
                          {log.new_state || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MediatorLayout>
  );
}
