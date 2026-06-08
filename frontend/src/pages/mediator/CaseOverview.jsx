import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCaseById, getAnalysisStatus } from "../../api/cases";
import { Copy, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import MediatorLayout from "../../layouts/MediatorLayout";
import client from "../../services/api";

/* ── tokens ─────────────────────────────────────────────── */
const tokens = (dark) => ({
  bg: dark ? "#0f172a" : "#f1f5f9",
  surface: dark ? "#1e293b" : "#ffffff",
  border: dark ? "#334155" : "#e2e8f0",
  text: dark ? "#f1f5f9" : "#1e293b",
  sub: dark ? "#94a3b8" : "#64748b",
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

/* ── Status colours ─────────────────────────────────────── */
const STATUS_COLORS = {
  APPLICATION_PENDING: "#f59e0b",
  APPLICATION_REJECTED: "#ef4444",
  WITHDRAWN: "#64748b",
  BOTH_INVITED: "#6366f1",
  FIRST_PARTY_SUBMITTED: "#f59e0b",
  BOTH_SUBMITTED: "#3b82f6",
  BURST_1_PROCESSING: "#8b5cf6",
  BURST_1_COMPLETE: "#10b981",
  PROCESSING_FAILED: "#ef4444",
  QUESTIONNAIRE_ACTIVE: "#06b6d4",
  QUESTIONNAIRE_COMPLETE: "#10b981",
  BURST_2_PROCESSING: "#8b5cf6",
  BURST_2_COMPLETE: "#10b981",
  PROPOSAL_DRAFT: "#f59e0b",
  PROPOSAL_PUBLISHED: "#3b82f6",
  MEDIATION_IN_PROGRESS: "#6366f1",
  MEDIATION_COMPLETE: "#10b981",
  MEDIATION_FAILED: "#ef4444",
};

/* ── Next action messages ───────────────────────────────── */
const NEXT_ACTION = {
  APPLICATION_PENDING: "Application submitted — waiting for mediator review",
  APPLICATION_REJECTED: "Application was rejected by mediator",
  WITHDRAWN: "Application was withdrawn",
  BOTH_INVITED: "Both parties invited — waiting for submissions",
  FIRST_PARTY_SUBMITTED: "One party submitted — waiting for the other",
  BOTH_SUBMITTED: "Both parties submitted — AI processing will begin",
  BURST_1_PROCESSING: "AI is analysing submissions — please wait",
  BURST_1_COMPLETE: "AI analysis complete — send questionnaire to parties",
  PROCESSING_FAILED: "AI processing failed — retry or contact support",
  QUESTIONNAIRE_ACTIVE: "Waiting for both parties to answer questionnaire",
  QUESTIONNAIRE_COMPLETE: "Questionnaire complete — AI generating BATNA/WATNA",
  BURST_2_PROCESSING: "AI is generating BATNA/WATNA scores — please wait",
  BURST_2_COMPLETE: "BATNA/WATNA ready — create and publish a proposal",
  PROPOSAL_DRAFT: "Proposal saved as draft — publish when ready",
  PROPOSAL_PUBLISHED: "Proposal published — waiting for party responses",
  MEDIATION_IN_PROGRESS: "Mediation in progress — monitor party responses",
  MEDIATION_COMPLETE: "Mediation complete — settlement PDF available",
  MEDIATION_FAILED: "Mediation failed — case is closed",
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
        display: "inline-block",
        maxWidth: "100%",
        wordBreak: "break-word",
      }}
    >
      {status || "UNKNOWN"}
    </span>
  );
}

/* ── PartyRow ───────────────────────────────────────────── */
function PartyRow({ label, name, submitted, tk, isSmall }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: isSmall ? "flex-start" : "center",
        flexDirection: isSmall ? "column" : "row",
        gap: isSmall ? 8 : 0,
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
          alignSelf: isSmall ? "flex-start" : "center",
        }}
      >
        {submitted ? "✅ Submitted" : "✉ Invited"}
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
        // fail silently
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
    ["pending", "processing"].includes(analysisStatus.status)
  ) {
    return (
      <div
        style={{
          padding: "14px 18px",
          borderRadius: 10,
          background: dark ? "#2e1065" : "#f5f3ff",
          border: `1px solid ${dark ? "#7c3aed" : "#ddd6fe"}`,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <Spinner />
        <span style={{ fontSize: 14, color: "#7c3aed", fontWeight: 500 }}>
          AI pipeline running — usually takes 30–60 seconds
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
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
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
          marginBottom: 16,
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

/* ── RegenerateModal ────────────────────────────────────── */
function RegenerateModal({
  caseId,
  party,
  expiresIn,
  onClose,
  onConfirm,
  loading,
  tk,
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: tk.surface,
          borderRadius: 12,
          border: `1px solid ${tk.border}`,
          padding: 24,
          maxWidth: 440,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: tk.text,
            margin: "0 0 8px",
          }}
        >
          Regenerate Invitation Link?
        </h3>
        <p style={{ fontSize: 13, color: tk.sub, margin: "0 0 16px" }}>
          The current link for{" "}
          <strong style={{ color: tk.text }}>{party}</strong> is still active
          {expiresIn && (
            <span style={{ color: "#f59e0b" }}> (expires in {expiresIn})</span>
          )}
          .
        </p>

        <div
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            background: "#fef9c3",
            border: "1px solid #fde68a",
            marginBottom: 20,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
            If you regenerate:
          </p>
          <ul
            style={{
              margin: "6px 0 0",
              paddingLeft: 18,
              fontSize: 13,
              color: "#92400e",
            }}
          >
            <li>Old link stops working immediately</li>
            <li>You must share the new link manually</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: `1px solid ${tk.border}`,
              background: "transparent",
              color: tk.text,
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: "#1e40af",
              color: "#fff",
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Regenerating..." : "Yes, Regenerate"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── NewLinkModal ───────────────────────────────────────── */
function NewLinkModal({ link, onClose, tk }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: tk.surface,
          borderRadius: 12,
          border: `1px solid ${tk.border}`,
          padding: 24,
          maxWidth: 440,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <CheckCircle2 size={20} color="#16a34a" />
          <h3
            style={{ fontSize: 16, fontWeight: 700, color: tk.text, margin: 0 }}
          >
            New Link Generated
          </h3>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "#dc2626",
            margin: "0 0 16px",
            fontWeight: 500,
          }}
        >
          Copy this link now — it will not be shown again.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: tk.bg,
            border: `1px solid ${tk.border}`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: tk.sub,
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {link}
          </span>
          <button
            onClick={handleCopy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 6,
              border: `1px solid ${tk.border}`,
              background: copied ? "#dcfce7" : tk.surface,
              color: copied ? "#16a34a" : tk.text,
              fontSize: 12,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "9px",
            borderRadius: 8,
            border: `1px solid ${tk.border}`,
            background: "transparent",
            color: tk.text,
            fontSize: 13,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
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

  // Regenerate modal state
  const [regenModal, setRegenModal] = useState(null); // { party, expiresIn }
  const [regenLoading, setRegenLoading] = useState(false);
  const [newLink, setNewLink] = useState(null);

  const tk = tokens(dark);
  const width = useWindowWidth();
  const isSmall = width < 640;

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

  const handleCopy = () => {
    const link = `${window.location.origin}/invitations/${caseData?.invite_token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenConfirm = async () => {
    setRegenLoading(true);
    try {
      const res = await client.post(
        `/api/v1/cases/${id}/invitations/regenerate`,
        {
          party: regenModal.party,
        },
      );
      const token = res.data?.token;
      const link = `${window.location.origin}/invitations/${token}`;
      setNewLink(link);
      setRegenModal(null);
      // refresh case data
      const updated = await getCaseById(id);
      setCaseData(updated);
    } catch (err) {
      alert("Failed to regenerate link. Try again.");
    } finally {
      setRegenLoading(false);
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
            color: "#64748b",
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
            color: "#64748b",
          }}
        >
          Case not found
        </div>
      </MediatorLayout>
    );

  const nextAction = NEXT_ACTION[caseData.status] || "No action required";

  return (
    <MediatorLayout dark={dark} setDark={setDark}>
      {/* ── Regenerate confirmation modal ── */}
      {regenModal && (
        <RegenerateModal
          caseId={id}
          party={regenModal.party}
          expiresIn={regenModal.expiresIn}
          onClose={() => setRegenModal(null)}
          onConfirm={handleRegenConfirm}
          loading={regenLoading}
          tk={tk}
        />
      )}

      {/* ── New link modal ── */}
      {newLink && (
        <NewLinkModal link={newLink} onClose={() => setNewLink(null)} tk={tk} />
      )}

      <div style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>
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
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: tk.sub, margin: "0 0 4px" }}>
            Case ID: {caseData.id?.slice(0, 8).toUpperCase()}
          </p>
          <h1
            style={{
              fontSize: isSmall ? 20 : 24,
              fontWeight: 700,
              margin: "0 0 12px",
              color: tk.text,
              wordBreak: "break-word",
            }}
          >
            {caseData.title || "Untitled Case"}
          </h1>
          <StatusBadge status={caseData.status} />
        </div>

        {/* ── Next Action banner ── */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: dark ? "#1e3a5f" : "#eff6ff",
            border: `1px solid ${dark ? "#1e40af" : "#bfdbfe"}`,
            marginBottom: 16,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <AlertTriangle
            size={16}
            color="#3b82f6"
            style={{ flexShrink: 0, marginTop: 2 }}
          />
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

        {/* ── Analysis polling ── */}
        {caseData.status === "BURST_1_PROCESSING" && (
          <AnalysisStatusBlock caseId={id} dark={dark} navigate={navigate} />
        )}

        {/* ── BURST_1_COMPLETE ── */}
        {caseData.status === "BURST_1_COMPLETE" && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: dark ? "#052e16" : "#f0fdf4",
              border: `1px solid ${dark ? "#16a34a" : "#bbf7d0"}`,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span style={{ fontSize: 14, color: "#16a34a", fontWeight: 500 }}>
                AI analysis complete
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
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
                }}
              >
                View Results
              </button>
              <button
                onClick={() => navigate(`/mediator/cases/${id}/questionnaire`)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 7,
                  background: "#1e40af",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Send Questionnaire
              </button>
            </div>
          </div>
        )}

        {/* ── PROCESSING_FAILED ── */}
        {caseData.status === "PROCESSING_FAILED" && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertTriangle size={16} color="#ef4444" />
              <span style={{ fontSize: 14, color: "#dc2626", fontWeight: 500 }}>
                AI processing failed
              </span>
            </div>
            <button
              onClick={async () => {
                try {
                  await client.post(`/api/v1/cases/${id}/analysis/retry-full`);
                  const updated = await getCaseById(id);
                  setCaseData(updated);
                } catch {
                  alert("Retry failed. Contact support.");
                }
              }}
              style={{
                padding: "6px 16px",
                borderRadius: 7,
                background: "#ef4444",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Retry Analysis
            </button>
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
            isSmall={isSmall}
          />
          <PartyRow
            label="Against Party"
            name={caseData.party_b_name}
            submitted={caseData.party_b_submitted}
            tk={tk}
            isSmall={isSmall}
          />
        </div>

        {/* ── Invitation Links ── */}
        {["BOTH_INVITED", "FIRST_PARTY_SUBMITTED"].includes(
          caseData.status,
        ) && (
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
              Invitation Links
            </h2>
            <p style={{ fontSize: 12, color: tk.sub, margin: "0 0 16px" }}>
              Share these links with each party. Links are shown once — use
              regenerate if needed.
            </p>

            {/* Requesting Party Link */}
            {caseData.requesting_party_token && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: tk.sub, marginBottom: 6 }}>
                  Requesting Party Link
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: isSmall ? "wrap" : "nowrap",
                    background: tk.bg,
                    border: `1px solid ${tk.border}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: tk.sub,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {`${window.location.origin}/invitations/${caseData.requesting_party_token}`}
                  </span>
                  <button
                    onClick={() =>
                      setRegenModal({
                        party: "requesting_party",
                        expiresIn: caseData.requesting_party_token_expires,
                      })
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: `1px solid ${tk.border}`,
                      background: "transparent",
                      color: tk.sub,
                      fontSize: 11,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <RefreshCw size={11} /> Regenerate
                  </button>
                </div>
              </div>
            )}

            {/* Against Party Link */}
            {caseData.against_party_token && (
              <div>
                <div style={{ fontSize: 12, color: tk.sub, marginBottom: 6 }}>
                  Against Party Link
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: isSmall ? "wrap" : "nowrap",
                    background: tk.bg,
                    border: `1px solid ${tk.border}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: tk.sub,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {`${window.location.origin}/invitations/${caseData.against_party_token}`}
                  </span>
                  <button
                    onClick={() =>
                      setRegenModal({
                        party: "against_party",
                        expiresIn: caseData.against_party_token_expires,
                      })
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: `1px solid ${tk.border}`,
                      background: "transparent",
                      color: tk.sub,
                      fontSize: 11,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <RefreshCw size={11} /> Regenerate
                  </button>
                </div>
              </div>
            )}
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
                  alignItems: "flex-start",
                  fontSize: 14,
                  flexDirection: isSmall ? "column" : "row",
                  gap: isSmall ? 2 : 0,
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
