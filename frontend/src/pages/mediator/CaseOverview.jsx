import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCaseById, getAnalysisStatus } from "../../api/cases";
import {
  Copy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Link,
} from "lucide-react";
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

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return width;
}

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

const NEXT_ACTION = {
  APPLICATION_PENDING: "Application submitted — waiting for mediator review",
  APPLICATION_REJECTED: "Application was rejected by mediator",
  WITHDRAWN: "Application was withdrawn",
  BOTH_INVITED: "Generate invitation links below and share with both parties",
  FIRST_PARTY_SUBMITTED:
    "One party submitted — generate link for the other party below",
  BOTH_SUBMITTED: "Both parties submitted — AI processing will begin shortly",
  BURST_1_PROCESSING: "AI is analysing submissions — please wait",
  BURST_1_COMPLETE: "AI analysis complete — view results or send questionnaire",
  PROCESSING_FAILED: "AI processing failed — use Retry Analysis below",
  QUESTIONNAIRE_ACTIVE: "Waiting for both parties to answer the questionnaire",
  QUESTIONNAIRE_COMPLETE: "Questionnaire complete — AI generating BATNA/WATNA",
  BURST_2_PROCESSING: "AI is generating BATNA/WATNA scores — please wait",
  BURST_2_COMPLETE: "BATNA/WATNA ready — create and publish a proposal",
  PROPOSAL_DRAFT: "Proposal saved as draft — publish when ready",
  PROPOSAL_PUBLISHED: "Proposal published — waiting for party responses",
  MEDIATION_IN_PROGRESS: "Mediation in progress — monitor party responses",
  MEDIATION_COMPLETE: "Mediation complete — settlement PDF available",
  MEDIATION_FAILED: "Mediation failed — case is closed",
};

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
      {status ? status.replace(/_/g, " ") : "UNKNOWN"}
    </span>
  );
}

/* ── PartyRow ───────────────────────────────────────────── */
function PartyRow({
  label,
  email,
  submitted,
  invited,
  attemptCount,
  tk,
  isSmall,
}) {
  // Three clear states driven by invitationStatus + submission status
  // declined = link was generated AND attempt_count >= 1 AND not submitted
  const declined = invited && !submitted && attemptCount > 0;
  const maxDeclines = attemptCount >= 3;

  let badge;
  if (submitted) {
    badge = { bg: "#dcfce7", color: "#16a34a", text: "✅ Submitted" };
  } else if (maxDeclines) {
    badge = {
      bg: "#fef2f2",
      color: "#dc2626",
      text: `❌ Declined (${attemptCount}×)`,
    };
  } else if (declined) {
    badge = {
      bg: "#fee2e2",
      color: "#ef4444",
      text: `⚠ Declined (${attemptCount}/3)`,
    };
  } else if (invited) {
    badge = { bg: "#fef9c3", color: "#ca8a04", text: "✉ Invited" };
  } else {
    badge = { bg: "#f1f5f9", color: "#94a3b8", text: "○ Not Invited" };
  }

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
          {email || "Not provided"}
        </div>
        {declined && (
          <div style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>
            {maxDeclines
              ? "Maximum attempts reached — close case or contact party directly"
              : `Declined ${attemptCount} of 3 times — regenerate link to retry`}
          </div>
        )}
      </div>
      <span
        style={{
          padding: "4px 10px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          background: badge.bg,
          color: badge.color,
          alignSelf: isSmall ? "flex-start" : "center",
          flexShrink: 0,
        }}
      >
        {badge.text}
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
        /* fail silently */
      }
    };
    poll();
    const interval = setInterval(poll, 2000);
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
          AI processing failed. Use the Retry button below.
        </span>
      </div>
    );
  }

  return null;
}

/* ── InviteLinkModal ────────────────────────────────────── */
function InviteLinkModal({
  party,
  isFirstTime,
  onClose,
  onConfirm,
  loading,
  tk,
}) {
  const partyLabel =
    party === "requesting_party" ? "Requesting Party" : "Against Party";
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
          {isFirstTime
            ? "Generate Invitation Link"
            : "Regenerate Invitation Link"}
        </h3>
        <p style={{ fontSize: 13, color: tk.sub, margin: "0 0 16px" }}>
          {isFirstTime
            ? `Generate an invitation link for the ${partyLabel}. Share it immediately — it will not be shown again.`
            : `Generate a new invitation link for the ${partyLabel}. The existing link will stop working immediately.`}
        </p>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            background: isFirstTime ? "#eff6ff" : "#fef9c3",
            border: `1px solid ${isFirstTime ? "#bfdbfe" : "#fde68a"}`,
            marginBottom: 20,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: isFirstTime ? "#1e40af" : "#92400e",
            }}
          >
            {isFirstTime
              ? "The link will be shown once — copy it immediately after generating."
              : "Old link stops working immediately. New link shown once — copy and share right away."}
          </p>
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
            {loading
              ? "Generating..."
              : isFirstTime
                ? "Generate Link"
                : "Yes, Regenerate"}
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
            Link Generated
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

/* ── CloseCaseModal ─────────────────────────────────────── */
function CloseCaseModal({ partyLabel, onClose, onConfirm, loading, tk }) {
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
          Close Case?
        </h3>
        <p style={{ fontSize: 13, color: tk.sub, margin: "0 0 16px" }}>
          The <strong style={{ color: tk.text }}>{partyLabel}</strong> has
          declined the invitation 3 times. Mediation cannot proceed without both
          parties.
        </p>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            marginBottom: 20,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
            Closing this case will mark it as Mediation Failed. The requesting
            party will be notified that mediation was unsuccessful. This action
            cannot be undone.
          </p>
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
              background: "#ef4444",
              color: "#fff",
              fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Closing..." : "Close Case"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function CaseOverview() {
  const { id } = useParams();
  console.log("CaseOverview id from URL:", id);
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Party submission status — from /submissions endpoint
  const [partyStatus, setPartyStatus] = useState({
    party_a_email: null,
    party_a_submitted: false,
    party_b_email: null,
    party_b_submitted: false,
  });

  // Invitation status — from /invitation-status endpoint
  // Includes: link_generated, accepted, attempt_count per party
  const [invitationStatus, setInvitationStatus] = useState({
    requesting_party: {
      link_generated: false,
      accepted: false,
      attempt_count: 0,
    },
    against_party: { link_generated: false, accepted: false, attempt_count: 0 },
  });

  // Invite link modal — { party, isFirstTime }
  const [inviteModal, setInviteModal] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [newLink, setNewLink] = useState(null);

  // Close case modal — { partyKey, partyLabel }
  const [closeModal, setCloseModal] = useState(null);
  const [closeLoading, setCloseLoading] = useState(false);

  const tk = tokens(dark);
  const width = useWindowWidth();
  const isSmall = width < 640;

  // ── Fetch party submission status ────────────────────────
  const fetchPartyStatus = useCallback(async (caseId) => {
    try {
      const res = await client.get(`/cases/${caseId}/submissions`);
      const subs = res.data?.submissions || [];
      const status = {
        party_a_email: null,
        party_a_submitted: false,
        party_b_email: null,
        party_b_submitted: false,
      };
      subs.forEach((sub) => {
        if (sub.invitation_role === "requesting_party") {
          status.party_a_submitted = true;
          status.party_a_email = sub.party_email || null;
        } else if (sub.invitation_role === "against_party") {
          status.party_b_submitted = true;
          status.party_b_email = sub.party_email || null;
        }
      });
      // Fallback: if invitation_role not on submission, use order
      if (
        !status.party_a_submitted &&
        !status.party_b_submitted &&
        subs.length > 0
      ) {
        if (subs[0]) status.party_a_submitted = true;
        if (subs[1]) status.party_b_submitted = true;
      }
      setPartyStatus(status);
    } catch {
      /* fail silently */
    }
  }, []);

  // ── Fetch invitation status ───────────────────────────────
  // Returns: { requesting_party: { link_generated, accepted, attempt_count }, ... }
  const fetchInvitationStatus = useCallback(async (caseId) => {
    try {
      const res = await client.get(`/cases/${caseId}/invitation-status`);
      setInvitationStatus(
        res.data || {
          requesting_party: {
            link_generated: false,
            accepted: false,
            attempt_count: 0,
          },
          against_party: {
            link_generated: false,
            accepted: false,
            attempt_count: 0,
          },
        },
      );
    } catch {
      /* fail silently */
    }
  }, []);

  // ── Main poll ─────────────────────────────────────────────
  useEffect(() => {
    const fetchCase = async () => {
      try {
        const data = await getCaseById(id);
        setCaseData(data);
        await fetchPartyStatus(id);
        await fetchInvitationStatus(id);
      } catch {
        setError("Failed to load case");
      } finally {
        setLoading(false);
      }
    };
    fetchCase();
    const interval = setInterval(fetchCase, 5000);
    return () => clearInterval(interval);
  }, [id, fetchPartyStatus, fetchInvitationStatus]);

  // ── Generate / Regenerate link ───────────────────────────
  const handleInviteConfirm = async () => {
    setInviteLoading(true);
    try {
      const emailForParty =
        inviteModal.party === "requesting_party"
          ? caseData?.requesting_party_email || ""
          : caseData?.against_party_email || "";

      const res = await client.post(`/cases/${id}/invitations/regenerate`, {
        party: inviteModal.party,
        email: emailForParty,
        invitation_role: inviteModal.party,
      });

      const token = res.data?.token;
      if (!token) throw new Error("No token returned");

      const link = `${window.location.origin}/invitations/${token}`;
      setNewLink(link);
      setInviteModal(null);

      // Refresh invitation status so button switches to Regenerate
      await fetchInvitationStatus(id);
      const updated = await getCaseById(id);
      setCaseData(updated);
    } catch {
      alert("Failed to generate link. Try again.");
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Close case after 3 declines ──────────────────────────
  const handleCloseCase = async () => {
    setCloseLoading(true);
    try {
      await client.post(`/cases/${id}/close-declined`);
      const updated = await getCaseById(id);
      setCaseData(updated);
      setCloseModal(null);
    } catch {
      alert("Failed to close case. Try again.");
    } finally {
      setCloseLoading(false);
    }
  };

  // ── Button label logic ───────────────────────────────────
  const getButtonLabel = (partyKey) => {
    const status = invitationStatus[partyKey];
    if (!status?.link_generated)
      return { label: "Get Invitation Link", isFirstTime: true };
    return { label: "Regenerate", isFirstTime: false };
  };

  // ── Decline detection from invitationStatus ──────────────
  // A party has "declined" if link was generated but attempt_count > 0 and not submitted
  const requestingPartyDeclined =
    invitationStatus.requesting_party?.link_generated &&
    (invitationStatus.requesting_party?.attempt_count || 0) > 0 &&
    !partyStatus.party_a_submitted;

  const againstPartyDeclined =
    invitationStatus.against_party?.link_generated &&
    (invitationStatus.against_party?.attempt_count || 0) > 0 &&
    !partyStatus.party_b_submitted;

  const requestingPartyMaxDeclines =
    (invitationStatus.requesting_party?.attempt_count || 0) >= 3;

  const againstPartyMaxDeclines =
    (invitationStatus.against_party?.attempt_count || 0) >= 3;

  const showDeclineWarning =
    (requestingPartyMaxDeclines || againstPartyMaxDeclines) &&
    caseData?.status !== "MEDIATION_FAILED";

  const showInvitationSection = [
    "BOTH_INVITED",
    "FIRST_PARTY_SUBMITTED",
  ].includes(caseData?.status);

  // ── Loading / error guards ───────────────────────────────
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

  const caseTitle = caseData.dispute_type
    ? caseData.dispute_type
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()) + " Dispute"
    : caseData.brief_description?.slice(0, 60) || "Untitled Case";

  return (
    <MediatorLayout dark={dark} setDark={setDark}>
      {/* ── Modals ── */}
      {inviteModal && (
        <InviteLinkModal
          party={inviteModal.party}
          isFirstTime={inviteModal.isFirstTime}
          onClose={() => setInviteModal(null)}
          onConfirm={handleInviteConfirm}
          loading={inviteLoading}
          tk={tk}
        />
      )}
      {newLink && (
        <NewLinkModal link={newLink} onClose={() => setNewLink(null)} tk={tk} />
      )}
      {closeModal && (
        <CloseCaseModal
          partyLabel={closeModal.partyLabel}
          onClose={() => setCloseModal(null)}
          onConfirm={handleCloseCase}
          loading={closeLoading}
          tk={tk}
        />
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
            {caseTitle}
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

        {/* ── Analysis polling during BURST_1_PROCESSING ── */}
        {caseData.status === "BURST_1_PROCESSING" && (
          <AnalysisStatusBlock caseId={id} dark={dark} navigate={navigate} />
        )}

        {/* ── BURST_1_COMPLETE actions ── */}
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
        {/* ── BURST_2_COMPLETE ── */}
        {caseData.status === "BURST_2_COMPLETE" && (
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
                BATNA/WATNA analysis ready
              </span>
            </div>
            <button
              onClick={() => navigate(`/mediator/cases/${id}/batna-watna`)}
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
              View BATNA/WATNA
            </button>
          </div>
        )}
        {/* Finalise Case button */}
        {caseData.status === "MEDIATION_COMPLETE" && (
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
                Both parties accepted — ready to finalise
              </span>
            </div>
            <button
              onClick={() => navigate(`/mediator/cases/${id}/finalise`)}
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
              Finalise Case
            </button>
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
                  await client.post(`/cases/${id}/analysis/retry-full`);
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

        {/* ── Party declined 3 times warning + Close Case button ── */}
        {showDeclineWarning && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              marginBottom: 16,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <AlertTriangle
                size={16}
                color="#ef4444"
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <div>
                <div
                  style={{ fontSize: 14, color: "#dc2626", fontWeight: 600 }}
                >
                  {requestingPartyMaxDeclines && againstPartyMaxDeclines
                    ? "Both parties have declined the invitation 3 times"
                    : requestingPartyMaxDeclines
                      ? "Requesting party has declined the invitation 3 times"
                      : "Against party has declined the invitation 3 times"}
                </div>
                <div style={{ fontSize: 12, color: "#ef4444", marginTop: 2 }}>
                  Mediation cannot proceed without both parties. You may close
                  this case or contact the party directly.
                </div>
              </div>
            </div>
            <button
              onClick={() =>
                setCloseModal({
                  partyKey: requestingPartyMaxDeclines
                    ? "requesting_party"
                    : "against_party",
                  partyLabel: requestingPartyMaxDeclines
                    ? "Requesting Party"
                    : "Against Party",
                })
              }
              style={{
                padding: "6px 16px",
                borderRadius: 7,
                background: "#ef4444",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              Close Case
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
            Status updates every 5 seconds
          </p>
          <PartyRow
            label="Requesting Party"
            email={partyStatus.party_a_email || caseData.requesting_party_email}
            submitted={partyStatus.party_a_submitted}
            invited={invitationStatus.requesting_party?.link_generated}
            attemptCount={invitationStatus.requesting_party?.attempt_count || 0}
            tk={tk}
            isSmall={isSmall}
          />
          <PartyRow
            label="Against Party"
            email={partyStatus.party_b_email || caseData.against_party_email}
            submitted={partyStatus.party_b_submitted}
            invited={invitationStatus.against_party?.link_generated}
            attemptCount={invitationStatus.against_party?.attempt_count || 0}
            tk={tk}
            isSmall={isSmall}
          />
        </div>

        {/* ── Invitation Links ── */}
        {showInvitationSection && (
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
              Links are one-time — shown only when generated. Use the button
              below to get a link for each party.
            </p>

            {/* Requesting Party invitation row */}
            {!partyStatus.party_a_submitted &&
              (() => {
                const { label, isFirstTime } =
                  getButtonLabel("requesting_party");
                return (
                  <div style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: tk.sub,
                        marginBottom: 6,
                        fontWeight: 500,
                      }}
                    >
                      Requesting Party
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
                          minWidth: 0,
                        }}
                      >
                        {isFirstTime
                          ? "No link generated yet — click to generate"
                          : "Link previously generated — regenerate to get a new one"}
                      </span>
                      <button
                        onClick={() =>
                          setInviteModal({
                            party: "requesting_party",
                            isFirstTime,
                          })
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 10px",
                          borderRadius: 6,
                          border: `1px solid ${isFirstTime ? "#bfdbfe" : tk.border}`,
                          background: isFirstTime ? "#eff6ff" : "transparent",
                          color: isFirstTime ? "#1e40af" : tk.sub,
                          fontSize: 11,
                          cursor: "pointer",
                          flexShrink: 0,
                          fontWeight: 600,
                        }}
                      >
                        {isFirstTime ? (
                          <Link size={11} />
                        ) : (
                          <RefreshCw size={11} />
                        )}
                        {label}
                      </button>
                    </div>
                  </div>
                );
              })()}

            {/* Against Party invitation row */}
            {!partyStatus.party_b_submitted &&
              (() => {
                const { label, isFirstTime } = getButtonLabel("against_party");
                return (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: tk.sub,
                        marginBottom: 6,
                        fontWeight: 500,
                      }}
                    >
                      Against Party
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
                          minWidth: 0,
                        }}
                      >
                        {isFirstTime
                          ? "No link generated yet — click to generate"
                          : "Link previously generated — regenerate to get a new one"}
                      </span>
                      <button
                        onClick={() =>
                          setInviteModal({
                            party: "against_party",
                            isFirstTime,
                          })
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 10px",
                          borderRadius: 6,
                          border: `1px solid ${isFirstTime ? "#bfdbfe" : tk.border}`,
                          background: isFirstTime ? "#eff6ff" : "transparent",
                          color: isFirstTime ? "#1e40af" : tk.sub,
                          fontSize: 11,
                          cursor: "pointer",
                          flexShrink: 0,
                          fontWeight: 600,
                        }}
                      >
                        {isFirstTime ? (
                          <Link size={11} />
                        ) : (
                          <RefreshCw size={11} />
                        )}
                        {label}
                      </button>
                    </div>
                  </div>
                );
              })()}

            {/* Both submitted — no links needed */}
            {partyStatus.party_a_submitted && partyStatus.party_b_submitted && (
              <p style={{ fontSize: 13, color: "#16a34a", margin: 0 }}>
                ✅ Both parties have submitted — no invitation links needed.
              </p>
            )}
          </div>
        )}
        {/* ── Audit Log button ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 16,
          }}
        >
          <button
            onClick={() => navigate(`/mediator/cases/${id}/audit-log`)}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: `1px solid ${tk.border}`,
              background: "transparent",
              color: tk.sub,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            📋 View Audit Log
          </button>
        </div>
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
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              {
                label: "Dispute Type",
                value: caseData.dispute_type
                  ? caseData.dispute_type
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())
                  : "Not specified",
              },
              {
                label: "Description",
                value: caseData.brief_description || "Not specified",
              },
              {
                label: "Monetary Value",
                value: caseData.monetary_value
                  ? `INR ${Number(caseData.monetary_value).toLocaleString("en-IN")}`
                  : "Not specified",
              },
              {
                label: "Created",
                value: caseData.created_at
                  ? new Date(caseData.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—",
              },
              {
                label: "Negotiation Round",
                value: `${caseData.negotiation_round ?? 0} of ${caseData.max_rounds ?? 3}`,
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
                  gap: isSmall ? 2 : 12,
                  padding: "10px 0",
                  borderBottom: `1px solid ${tk.border}`,
                }}
              >
                <span
                  style={{
                    color: tk.sub,
                    flexShrink: 0,
                    minWidth: isSmall ? "auto" : 140,
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontWeight: 500,
                    color: tk.text,
                    textAlign: isSmall ? "left" : "right",
                    wordBreak: "break-word",
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MediatorLayout>
  );
}
