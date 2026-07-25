import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProposals, publishProposal } from "../../api/cases";
import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";
import MediatorLayout from "../../layouts/MediatorLayout";

/* ── tokens ─────────────────────────────────────────────── */
const tokens = (dark) => ({
  bg: dark ? "#0f172a" : "#f1f5f9",
  surface: dark ? "#1e293b" : "#ffffff",
  border: dark ? "#334155" : "#e2e8f0",
  text: dark ? "#f1f5f9" : "#1e293b",
  sub: dark ? "#94a3b8" : "#64748b",
  accent: "#1e40af",
});

/* ── Status config ──────────────────────────────────────── */
const PROPOSAL_STATUS = {
  draft: { label: "Draft", color: "#64748b" },
  published: { label: "Published", color: "#1e40af" },
  accepted: { label: "Accepted", color: "#16a34a" },
  rejected: { label: "Rejected", color: "#ef4444" },
  pending: { label: "Pending Review", color: "#f59e0b" },
};

/* ── ProposalCard ───────────────────────────────────────── */
function ProposalCard({ proposal, onRevise, navigate, id, tk }) {
  const [expanded, setExpanded] = useState(false);
  const status = PROPOSAL_STATUS[proposal.status] || PROPOSAL_STATUS.draft;

  const rpResponse = proposal.responses?.find(
    (r) => r.party_role === "requesting_party",
  );
  const apResponse = proposal.responses?.find(
    (r) => r.party_role === "against_party",
  );

  return (
    <div
      style={{
        background: tk.surface,
        borderRadius: 12,
        border: `1px solid ${tk.border}`,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${tk.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          background: tk.bg,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: tk.text,
                margin: 0,
              }}
            >
              Round {proposal.round_number} Proposal
            </h3>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                background: `${status.color}18`,
                color: status.color,
              }}
            >
              {status.label}
            </span>
          </div>
          <p style={{ fontSize: 12, color: tk.sub, margin: "4px 0 0" }}>
            Created{" "}
            {proposal.created_at
              ? new Date(proposal.created_at).toLocaleDateString()
              : "—"}
            {proposal.published_at &&
              ` • Published ${new Date(proposal.published_at).toLocaleDateString()}`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              padding: "6px 14px",
              borderRadius: 7,
              border: `1px solid ${tk.border}`,
              background: "transparent",
              color: tk.text,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {expanded ? "Hide" : "View"} Proposal
          </button>
          {proposal.status === "rejected" && (
            <button
              onClick={() => onRevise(proposal)}
              style={{
                padding: "6px 14px",
                borderRadius: 7,
                background: "#1e40af",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Revise
            </button>
          )}
        </div>
      </div>

      {/* Expanded proposal text */}
      {expanded && (
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${tk.border}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: tk.sub,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Proposal Text
          </div>
          <p
            style={{
              fontSize: 13,
              color: tk.text,
              lineHeight: 1.8,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {proposal.raw_text || "No text available"}
          </p>
        </div>
      )}

      {/* Party responses */}
      <div style={{ padding: "14px 20px" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: tk.sub,
            marginBottom: 10,
            textTransform: "uppercase",
          }}
        >
          Party Responses
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Requesting Party */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: tk.text }}>
              Requesting Party
            </span>
            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  background:
                    rpResponse?.decision === "accept"
                      ? "#dcfce7"
                      : rpResponse?.decision === "reject"
                        ? "#fee2e2"
                        : "#f1f5f9",
                  color:
                    rpResponse?.decision === "accept"
                      ? "#16a34a"
                      : rpResponse?.decision === "reject"
                        ? "#dc2626"
                        : "#64748b",
                }}
              >
                {rpResponse?.decision === "accept"
                  ? "✅ Accepted"
                  : rpResponse?.decision === "reject"
                    ? "❌ Rejected"
                    : "⏳ Pending"}
              </span>
              {rpResponse?.rejection_reason && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#dc2626",
                    margin: "4px 0 0",
                    maxWidth: 300,
                  }}
                >
                  Reason: {rpResponse.rejection_reason}
                </p>
              )}
            </div>
          </div>

          {/* Against Party */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: tk.text }}>Against Party</span>
            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  background:
                    apResponse?.decision === "accept"
                      ? "#dcfce7"
                      : apResponse?.decision === "reject"
                        ? "#fee2e2"
                        : "#f1f5f9",
                  color:
                    apResponse?.decision === "accept"
                      ? "#16a34a"
                      : apResponse?.decision === "reject"
                        ? "#dc2626"
                        : "#64748b",
                }}
              >
                {apResponse?.decision === "accept"
                  ? "✅ Accepted"
                  : apResponse?.decision === "reject"
                    ? "❌ Rejected"
                    : "⏳ Pending"}
              </span>
              {apResponse?.rejection_reason && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#dc2626",
                    margin: "4px 0 0",
                    maxWidth: 300,
                  }}
                >
                  Reason: {apResponse.rejection_reason}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function ProposalManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tk = tokens(dark);

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const data = await getProposals(id);
        const list = Array.isArray(data) ? data : data.proposals || [];
        setProposals(list);
      } catch {
        setError("Failed to load proposals");
      } finally {
        setLoading(false);
      }
    };
    fetchProposals();
  }, [id]);

  const handleRevise = (proposal) => {
    navigate(`/mediator/cases/${id}/proposals/${proposal.id}/revise`, {
      state: {
        previous_proposal: proposal.raw_text,
        round_number: (proposal.round_number || 1) + 1,
        max_rounds: 3,
        requesting_reason:
          proposal.responses?.find(
            (r) =>
              r.party_role === "requesting_party" && r.decision === "reject",
          )?.rejection_reason || "",
        against_reason:
          proposal.responses?.find(
            (r) => r.party_role === "against_party" && r.decision === "reject",
          )?.rejection_reason || "",
        changes_summary: proposal.changes_summary || [],
        revised_draft: proposal.revised_draft || proposal.raw_text || "",
      },
    });
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
          Loading proposals...
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

  return (
    <MediatorLayout dark={dark} setDark={setDark}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
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
                Proposal Management
              </h1>
              <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
                Case {id?.slice(0, 8).toUpperCase()} — All proposals and party
                responses
              </p>
            </div>
            <button
              onClick={() => navigate(`/mediator/cases/${id}/proposals/new`)}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                background: "#1e40af",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              + New Proposal
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "Total Rounds",
              value: proposals.length,
              color: "#1e40af",
            },
            {
              label: "Accepted",
              value: proposals.filter((p) => p.status === "accepted").length,
              color: "#16a34a",
            },
            {
              label: "Rejected",
              value: proposals.filter((p) => p.status === "rejected").length,
              color: "#ef4444",
            },
            {
              label: "Pending",
              value: proposals.filter(
                (p) => p.status === "published" || p.status === "pending",
              ).length,
              color: "#f59e0b",
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
              <div style={{ fontSize: 22, fontWeight: 700, color }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Proposals list ── */}
        {proposals.length === 0 ? (
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              padding: "40px",
              textAlign: "center",
            }}
          >
            <FileText size={32} color={tk.sub} style={{ marginBottom: 12 }} />
            <p
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: tk.text,
                margin: "0 0 8px",
              }}
            >
              No proposals yet
            </p>
            <p style={{ fontSize: 13, color: tk.sub, margin: "0 0 20px" }}>
              Create the first proposal after reviewing BATNA/WATNA analysis.
            </p>
            <button
              onClick={() => navigate(`/mediator/cases/${id}/batna-watna`)}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                background: "#1e40af",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Go to BATNA/WATNA
            </button>
          </div>
        ) : (
          // Most recent first
          [...proposals]
            .reverse()
            .map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onRevise={handleRevise}
                navigate={navigate}
                id={id}
                tk={tk}
              />
            ))
        )}
      </div>
    </MediatorLayout>
  );
}
