import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProposals, getCases, getCaseById } from "../../api/cases";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit2,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import MediatorLayout from "../../layouts/MediatorLayout";
import { useTheme } from "../../context/ThemeContext";

const tokens = (dark) => ({
  bg: dark ? "#0f172a" : "#f1f5f9",
  surface: dark ? "#1e293b" : "#ffffff",
  border: dark ? "#334155" : "#e2e8f0",
  text: dark ? "#f1f5f9" : "#1e293b",
  sub: dark ? "#94a3b8" : "#64748b",
  accent: "#1e40af",
});

export default function ProposalManagement() {
  const { isDark } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const tk = tokens(isDark);

  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [cases, setCases] = useState([]);
  const [caseData, setCaseData] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (id) {
          const [pList, cInfo] = await Promise.all([
            getProposals(id).catch(() => []),
            getCaseById(id).catch(() => null),
          ]);
          setProposals(pList);
          setCaseData(cInfo);
        } else {
          const cList = await getCases();
          setCases(cList);
        }
      } catch (err) {
        console.error("Failed to load proposals list", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <MediatorLayout>
      <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
        {/* Back Button */}
        <button
          onClick={() => navigate(id ? `/mediator/cases/${id}` : "/mediator")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: tk.sub,
            fontSize: 13,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: 0,
          }}
        >
          ← Back to {id ? "Case Details" : "Dashboard"}
        </button>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              margin: "0 0 4px",
              color: tk.text,
            }}
          >
            Proposal Management
          </h1>
          <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
            {id
              ? `Manage and review negotiation rounds for Case ${id.slice(0, 8).toUpperCase()}`
              : "Track settlement proposals and negotiation rounds across all cases"}
          </p>
        </div>

        {loading ? (
          <div style={{ color: tk.sub, padding: 40, textAlign: "center" }}>
            Loading proposals...
          </div>
        ) : id ? (
          /* Case specific proposals view */
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Case Info header */}
            {caseData && (
              <div
                style={{
                  background: tk.surface,
                  borderRadius: 12,
                  border: `1px solid ${tk.border}`,
                  padding: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
                    {caseData.dispute_type
                      ? caseData.dispute_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) + " Dispute"
                      : "Civil Dispute"}
                  </div>
                  <div style={{ fontSize: 12, color: tk.sub, marginTop: 2 }}>
                    Status: {caseData.status} • Round {caseData.negotiation_round} of {caseData.max_rounds}
                  </div>
                </div>

                {/* If Burst 2 is done and no proposal is active, show button */}
                {caseData.status === "BURST_2_COMPLETE" && (
                  <button
                    onClick={() => navigate(`/mediator/cases/${id}/proposals/new`)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: "#1e40af",
                      color: "#fff",
                      border: "none",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Draft Proposal Round
                  </button>
                )}
              </div>
            )}

            {/* List of Proposals */}
            {proposals.length === 0 ? (
              <div
                style={{
                  background: tk.surface,
                  borderRadius: 12,
                  border: `1px solid ${tk.border}`,
                  padding: 40,
                  textAlign: "center",
                  color: tk.sub,
                }}
              >
                No proposals drafted yet. Proceed to AI analysis and BATNA/WATNA first.
              </div>
            ) : (
              proposals.map((p, idx) => (
                <div
                  key={p.id}
                  style={{
                    background: tk.surface,
                    borderRadius: 12,
                    border: `1px solid ${tk.border}`,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      borderBottom: `1px solid ${tk.border}`,
                      paddingBottom: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: tk.text,
                        }}
                      >
                        Round {p.round} Proposal
                      </div>
                      <div style={{ fontSize: 11, color: tk.sub, marginTop: 2 }}>
                        Created: {new Date(p.created_at).toLocaleString()}
                        {p.published_at && ` · Published: ${new Date(p.published_at).toLocaleString()}`}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        background: p.status === "published" ? "#eff6ff" : "#f1f5f9",
                        color: p.status === "published" ? "#1e40af" : tk.sub,
                      }}
                    >
                      {p.status?.toUpperCase()}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: 13,
                      color: tk.text,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      margin: "0 0 16px",
                      maxHeight: 120,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 5,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {p.content}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", gap: 10 }}>
                      {p.status === "draft" ? (
                        <button
                          onClick={() => navigate(`/mediator/cases/${id}/proposals/new`)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 6,
                            border: "none",
                            background: "#1e40af",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Edit2 size={12} /> Edit & Publish
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: tk.sub }}>
                          Published proposals are read-only.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* General all cases proposals view */
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              overflow: "hidden",
            }}
          >
            {cases.length === 0 ? (
              <div style={{ color: tk.sub, padding: 40, textAlign: "center" }}>
                No active mediation cases found.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tk.border}`, background: tk.bg }}>
                    {["Case ID", "Dispute Type", "Round Status", "Negotiation Round", "Action"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: tk.sub, fontSize: 12, textTransform: "uppercase" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: i < cases.length - 1 ? `1px solid ${tk.border}` : "none" }}>
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: tk.text }}>
                        {c.id?.slice(0, 8).toUpperCase()}
                      </td>
                      <td style={{ padding: "14px 16px", color: tk.text }}>
                        {c.dispute_type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "Civil Dispute"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, background: "#eff6ff", color: "#1e40af" }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: tk.sub }}>
                        Round {c.negotiation_round} of {c.max_rounds}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <button
                          onClick={() => navigate(`/mediator/cases/${c.id}/proposals`)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: 6,
                            border: `1px solid ${tk.border}`,
                            background: "transparent",
                            fontSize: 12,
                            cursor: "pointer",
                            color: tk.text,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          Manage <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </MediatorLayout>
  );
}
