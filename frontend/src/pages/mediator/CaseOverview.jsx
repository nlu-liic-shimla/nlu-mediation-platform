import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCaseById, getAnalysisStatus } from "../../api/cases";
import { Copy, CheckCircle2, AlertTriangle } from "lucide-react";
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

/* ── Status colours ─────────────────────────────────────── */
const STATUS_COLORS = {
  INVITED: "#6366f1",
  PARTY_A_SUBMITTED: "#f59e0b",
  BOTH_SUBMITTED: "#3b82f6",
  BURST_1_PROCESSING: "#8b5cf6",
  BURST_1_COMPLETE: "#10b981",
  QUESTIONNAIRE_ACTIVE: "#06b6d4",
  QUESTIONNAIRE_COMPLETE: "#10b981",
  BURST_2_PROCESSING: "#8b5cf6",
  BURST_2_COMPLETE: "#10b981",
  PROPOSAL_PUBLISHED: "#3b82f6",
  PROPOSAL_UNDER_REVIEW: "#f59e0b",
  MEDIATION_IN_PROGRESS: "#6366f1",
  CLOSED: "#64748b",
  PROCESSING_FAILED: "#ef4444",
};

/* ── Next action messages ───────────────────────────────── */
const NEXT_ACTION = {
  INVITED: "Waiting for against party to accept invitation",
  PARTY_A_SUBMITTED: "Waiting for Party B to submit their statement",
  BOTH_SUBMITTED: "Both parties submitted — AI processing will begin",
  BURST_1_PROCESSING: "AI is analysing submissions — please wait",
  BURST_1_COMPLETE: "AI analysis complete — review and send questionnaire",
  QUESTIONNAIRE_ACTIVE: "Waiting for both parties to answer questionnaire",
  QUESTIONNAIRE_COMPLETE: "Questionnaire complete — AI generating BATNA/WATNA",
  BURST_2_PROCESSING: "AI is generating BATNA/WATNA scores — please wait",
  BURST_2_COMPLETE: "BATNA/WATNA ready — create and publish a proposal",
  PROPOSAL_PUBLISHED: "Proposal published — waiting for party responses",
  PROPOSAL_UNDER_REVIEW: "Parties are reviewing the proposal",
  MEDIATION_IN_PROGRESS: "Mediation in progress — monitor party responses",
  CLOSED: "This case is closed",
  PROCESSING_FAILED: "AI processing failed — contact support or retry",
};

/* ── StatusBadge ────────────────────────────────────────── */
function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || "#64748b";
  return (
    <span
      style={{
        padding: "4px 12px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        background: `${color}22`,
        color,
      }}
    >
      {status || "UNKNOWN"}
    </span>
  );
}

/* ── PartyRow ───────────────────────────────────────────── */
function PartyRow({ label, name, submitted, tk }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 0",
        borderBottom: `1px solid ${tk.border}`,
      }}
    >
      <div>
        <div style={{ fontSize: 12, color: tk.sub, marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: tk.text }}>
          {name || "Pending"}
        </div>
      </div>
      <span
        style={{
          padding: "4px 10px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          background: submitted ? "#dcfce7" : "#fef9c3",
          color: submitted ? "#16a34a" : "#ca8a04",
        }}
      >
        {submitted ? "Submitted" : "Pending"}
      </span>
    </div>
  );
}

/* ── AnalysisStatusBlock ────────────────────────────────── */
function AnalysisStatusBlock({ caseId, dark, navigate }) {
  const [analysisStatus, setAnalysisStatus] = useState(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await getAnalysisStatus(caseId);
        setAnalysisStatus(data);
      } catch {
        // endpoint not ready yet — fail silently
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [caseId]);

  const Spinner = () => (
    <>
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "2px solid #8b5cf6",
          borderTopColor: "transparent",
          animation: "spin 1s linear infinite",
          flexShrink: 0,
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );

  if (
    !analysisStatus ||
    analysisStatus.status === "pending" ||
    analysisStatus.status === "processing"
  ) {
    return (
      <div
        style={{
          padding: "14px 18px",
          borderRadius: 10,
          background: dark ? "#2e1065" : "#f5f3ff",
          border: `1px solid ${dark ? "#7c3aed" : "#ddd6fe"}`,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Spinner />
        <span style={{ fontSize: 14, color: "#7c3aed", fontWeight: 500 }}>
          AI pipeline running — analysing submissions. Usually takes 30–60
          seconds.
        </span>
      </div>
    );
  }

  if (analysisStatus.status === "complete") {
    return (
      <div
        style={{
          padding: "14px 18px",
          borderRadius: 10,
          background: dark ? "#052e16" : "#f0fdf4",
          border: `1px solid ${dark ? "#16a34a" : "#bbf7d0"}`,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CheckCircle2 size={16} color="#16a34a" />
          <span style={{ fontSize: 14, color: "#16a34a", fontWeight: 500 }}>
            Analysis ready
          </span>
        </div>
        <button
          onClick={() => navigate(`/mediator/cases/${caseId}/analysis`)}
          style={{
            padding: "6px 16px",
            borderRadius: 7,
            background: "#16a34a",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          View Results
        </button>
      </div>
    );
  }

  if (analysisStatus.status === "failed") {
    return (
      <div
        style={{
          padding: "14px 18px",
          borderRadius: 10,
          background: "#fef2f2",
          border: "1px solid #fecaca",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <AlertTriangle size={16} color="#ef4444" />
        <span style={{ fontSize: 14, color: "#dc2626", fontWeight: 500 }}>
          AI processing failed. Contact support or ask Backend to retry.
        </span>
      </div>
    );
  }

  return null;
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function CaseOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const tk = tokens(dark);

  /* ── Fetch + poll every 5s ──────────────────────────── */
  useEffect(() => {
    const fetchCase = async () => {
      try {
        const data = await getCaseById(id);
        setCaseData(data);
      } catch (err) {
        setError("Failed to load case");
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
    const interval = setInterval(fetchCase, 5000);
    return () => clearInterval(interval);
  }, [id]);

  /* ── Copy invite link ───────────────────────────────── */
  const handleCopy = () => {
    const link = `${window.location.origin}/invitations/${caseData?.invite_token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          Loading case...
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
            color: "#ef4444",
          }}
        >
          {error}
        </div>
      </MediatorLayout>
    );

  if (!caseData)
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
          Case not found
        </div>
      </MediatorLayout>
    );

  const nextAction = NEXT_ACTION[caseData.status] || "No action required";

  return (
    <MediatorLayout dark={dark} setDark={setDark}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* ── Back ── */}
        <button
          onClick={() => navigate("/mediator")}
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
          ← Back to Dashboard
        </button>

        {/* ── Case Header ── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: tk.sub, margin: "0 0 4px" }}>
            Case ID: {caseData.id?.slice(0, 8).toUpperCase()}
          </p>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              margin: "0 0 12px",
              color: tk.text,
            }}
          >
            {caseData.title || "Untitled Case"}
          </h1>
          <StatusBadge status={caseData.status} />
        </div>

        {/* ── Next Action banner ── */}
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 10,
            background: dark ? "#1e3a5f" : "#eff6ff",
            border: `1px solid ${dark ? "#1e40af" : "#bfdbfe"}`,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <AlertTriangle size={16} color="#3b82f6" />
          <span
            style={{
              fontSize: 14,
              color: dark ? "#93c5fd" : "#1e40af",
              fontWeight: 500,
            }}
          >
            {nextAction}
          </span>
        </div>

        {/* ── Analysis status polling — only when BURST_1_PROCESSING ── */}
        {caseData.status === "BURST_1_PROCESSING" && (
          <AnalysisStatusBlock caseId={id} dark={dark} navigate={navigate} />
        )}

        {/* ── BURST_1_COMPLETE — view results button ── */}
        {caseData.status === "BURST_1_COMPLETE" && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              background: dark ? "#052e16" : "#f0fdf4",
              border: `1px solid ${dark ? "#16a34a" : "#bbf7d0"}`,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span style={{ fontSize: 14, color: "#16a34a", fontWeight: 500 }}>
                AI analysis complete
              </span>
            </div>
            <button
              onClick={() => navigate(`/mediator/cases/${id}/analysis`)}
              style={{
                padding: "6px 16px",
                borderRadius: 7,
                background: "#16a34a",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              View Results
            </button>
          </div>
        )}

        {/* ── PROCESSING_FAILED ── */}
        {caseData.status === "PROCESSING_FAILED" && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertTriangle size={16} color="#ef4444" />
            <span style={{ fontSize: 14, color: "#dc2626", fontWeight: 500 }}>
              AI processing failed. Please contact support or ask Backend to
              retry the Celery task.
            </span>
          </div>
        )}

        {/* ── Parties ── */}
        <div
          style={{
            background: tk.surface,
            borderRadius: 12,
            border: `1px solid ${tk.border}`,
            padding: "16px 20px",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: tk.text,
              margin: "0 0 4px",
            }}
          >
            Parties
          </h2>
          <p style={{ fontSize: 12, color: tk.sub, margin: "0 0 8px" }}>
            Submission status for each party
          </p>
          <PartyRow
            label="Requesting Party"
            name={caseData.party_a_name}
            submitted={caseData.party_a_submitted}
            tk={tk}
          />
          <PartyRow
            label="Against Party"
            name={caseData.party_b_name}
            submitted={caseData.party_b_submitted}
            tk={tk}
          />
        </div>

        {/* ── Invite Link ── */}
        {caseData.status === "INVITED" && (
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              padding: "16px 20px",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: tk.text,
                margin: "0 0 4px",
              }}
            >
              Invitation Link
            </h2>
            <p style={{ fontSize: 12, color: tk.sub, margin: "0 0 12px" }}>
              Share this link with the against party
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: tk.bg,
                border: `1px solid ${tk.border}`,
                borderRadius: 8,
                padding: "10px 14px",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: tk.sub,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {`${window.location.origin}/invitations/${caseData?.invite_token}`}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: `1px solid ${tk.border}`,
                  background: copied ? "#dcfce7" : tk.surface,
                  color: copied ? "#16a34a" : tk.text,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* ── Case Details ── */}
        <div
          style={{
            background: tk.surface,
            borderRadius: 12,
            border: `1px solid ${tk.border}`,
            padding: "16px 20px",
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: tk.text,
              margin: "0 0 12px",
            }}
          >
            Case Details
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              {
                label: "Created",
                value: new Date(caseData.created_at).toLocaleDateString(),
              },
              {
                label: "Negotiation Round",
                value: caseData.negotiation_round ?? 0,
              },
              {
                label: "Case Type",
                value: caseData.case_type || "Not specified",
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                }}
              >
                <span style={{ color: tk.sub }}>{label}</span>
                <span style={{ fontWeight: 500, color: tk.text }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MediatorLayout>
  );
}
