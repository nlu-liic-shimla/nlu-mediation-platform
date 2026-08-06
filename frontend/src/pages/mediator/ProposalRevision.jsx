import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { updateProposal, publishProposal } from "../../api/cases";
import { AlertTriangle } from "lucide-react";
import MediatorLayout from "../../layouts/MediatorLayout";
import client from "../../services/api";

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

/* ── PublishModal ───────────────────────────────────────── */
function PublishModal({ onCancel, onConfirm, loading, tk }) {
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
      onMouseDown={(e) => e.stopPropagation()}
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
          Publish Revised Proposal?
        </h3>
        <p
          style={{
            fontSize: 13,
            color: tk.sub,
            margin: "0 0 20px",
            lineHeight: 1.6,
          }}
        >
          Once published, both parties will see this revised proposal and can
          accept or reject it.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
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
              padding: "8px 24px",
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
            {loading ? "Publishing..." : "Confirm Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function ProposalRevision() {
  const { id, p_id } = useParams();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  const [proposalId, setProposalId] = useState(null); // NEW: the draft we actually save/publish
  const [revisedText, setRevisedText] = useState("");
  const [roundNumber, setRoundNumber] = useState(null);
  const [maxRounds, setMaxRounds] = useState(3);
  const [previousProposal, setPreviousProposal] = useState("");
  const [requestingReason, setRequestingReason] = useState("");
  const [againstReason, setAgainstReason] = useState("");
  const [changesSummary, setChangesSummary] = useState([]);

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [width, setWidth] = useState(window.innerWidth);
  const tk = tokens(dark);
  const isSmall = width < 900;

  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // ── Load revision data from API ──────────────────────────
  // Fetches the rejected proposal (by p_id) to read its rejection
  // reasons + AI revision_suggestions, then ensures a NEW draft proposal
  // exists for this round (creating one if needed) — because publishing
  // requires the case to pass through PROPOSAL_DRAFT, which only
  // POST /cases/{id}/proposals triggers. Reusing the old rejected
  // proposal's id for publish always fails with an invalid state
  // transition (MEDIATION_IN_PROGRESS -> PROPOSAL_PUBLISHED doesn't exist).
  useEffect(() => {
    const loadRevision = async () => {
      try {
        const res = await client.get(`/cases/${id}/proposals`);
        const proposals = Array.isArray(res.data)
          ? res.data
          : res.data?.proposals ?? [];

        const rejectedProposal =
          proposals.find((p) => p.id === p_id) ?? proposals[proposals.length - 1];

        if (!rejectedProposal) {
          setError("Proposal not found.");
          return;
        }

        // revision_suggestions is set by Sub-system H after rejection
        // shape: { revised_draft, changes_summary, requesting_reason, against_reason }
        const suggestions = rejectedProposal.revision_suggestions || {};

        setPreviousProposal(
          rejectedProposal.content || rejectedProposal.raw_text || ""
        );
        setRequestingReason(suggestions.requesting_reason || "");
        setAgainstReason(suggestions.against_reason || "");
        setChangesSummary(suggestions.changes_summary || []);

        // Find an existing draft for the next round, or create one.
        let draftProposal = proposals.find((p) => p.status === "draft");

        if (!draftProposal) {
          // This POST is what actually transitions the case
          // MEDIATION_IN_PROGRESS -> PROPOSAL_DRAFT on the backend.
          const created = await client.post(`/cases/${id}/proposals`);
          draftProposal = {
            id: created.data.proposal_id,
            content: created.data.draft_text,
            round: created.data.round,
          };
        }

        setProposalId(draftProposal.id);
        // Prefer the AI revision suggestion text; fall back to the fresh draft's content
        setRevisedText(suggestions.revised_draft || draftProposal.content || "");
        setRoundNumber(
          draftProposal.round || (rejectedProposal.round || 1) + 1
        );

        const caseRes = await client.get(`/cases/${id}`);
        setMaxRounds(caseRes.data?.max_rounds || 3);
      } catch {
        setError("Failed to load revision data. Please go back and try again.");
      } finally {
        setLoading(false);
      }
    };
    loadRevision();
  }, [id, p_id]);

  const handleSaveDraft = async () => {
    if (!proposalId) return;
    setSaving(true);
    try {
      await updateProposal(id, proposalId, revisedText);
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      alert("Failed to save draft. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!proposalId) return;
    setPublishing(true);
    try {
      // Make sure the latest edits are saved before publishing
      await updateProposal(id, proposalId, revisedText);
      await publishProposal(id, proposalId);
      setShowPublishModal(false);
      navigate(`/mediator/cases/${id}`);
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === "ROUNDS_EXHAUSTED") {
        alert("Maximum rounds reached. You need to extend rounds first.");
      } else {
        alert("Failed to publish. Try again.");
      }
      setShowPublishModal(false);
    } finally {
      setPublishing(false);
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
            color: tk.sub,
          }}
        >
          Loading revision...
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
      {showPublishModal && (
        <PublishModal
          onCancel={() => setShowPublishModal(false)}
          onConfirm={handlePublish}
          loading={publishing}
          tk={tk}
        />
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: 20 }}>
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    margin: 0,
                    color: tk.text,
                  }}
                >
                  Proposal Revision
                </h1>
                {roundNumber && (
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
                    Round {roundNumber} of {maxRounds}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
                Case {id?.slice(0, 8).toUpperCase()} — Review rejection reasons
                and revise
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  border: `1px solid ${tk.border}`,
                  background: "transparent",
                  color: tk.text,
                  fontSize: 13,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 500,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : savedAt
                    ? `Saved ${savedAt}`
                    : "Save Draft"}
              </button>
              <button
                onClick={() => setShowPublishModal(true)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  background: "#1e40af",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Publish
              </button>
            </div>
          </div>
        </div>

        {/* Max rounds warning */}
        {roundNumber >= maxRounds && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "#fef9c3",
              border: "1px solid #fde68a",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertTriangle size={16} color="#d97706" />
            <span style={{ fontSize: 13, color: "#92400e", fontWeight: 500 }}>
              This is the final round. Contact Backend Role to extend if needed.
            </span>
          </div>
        )}

        {/* Sub-system H not ready yet notice */}
        {changesSummary.length === 0 && !revisedText && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertTriangle size={16} color="#f59e0b" />
            <span style={{ fontSize: 13, color: "#92400e" }}>
              AI revision suggestions are still being generated. You can write your own revision in the editor on the right, or wait a moment and refresh.
            </span>
          </div>
        )}

        {/* ── Split layout ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isSmall ? "1fr" : "1fr 1fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* ── LEFT — Read only reference ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxHeight: isSmall ? "none" : "calc(100vh - 200px)",
              overflowY: "auto",
            }}
          >
            {/* Previous proposal */}
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
                <span style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>
                  Previous Proposal
                </span>
              </div>
              <div style={{ padding: "14px 16px" }}>
                <p
                  style={{
                    fontSize: 13,
                    color: tk.text,
                    lineHeight: 1.7,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {previousProposal || "No previous proposal text available"}
                </p>
              </div>
            </div>

            {/* Rejection reasons */}
            {(requestingReason || againstReason) && (
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
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: tk.text }}
                  >
                    Rejection Reasons
                  </span>
                </div>
                <div
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {requestingReason && (
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: tk.sub,
                          marginBottom: 4,
                          textTransform: "uppercase",
                        }}
                      >
                        Requesting Party
                      </div>
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          fontSize: 13,
                          color: "#dc2626",
                          lineHeight: 1.6,
                        }}
                      >
                        {requestingReason}
                      </div>
                    </div>
                  )}
                  {againstReason && (
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: tk.sub,
                          marginBottom: 4,
                          textTransform: "uppercase",
                        }}
                      >
                        Against Party
                      </div>
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 8,
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          fontSize: 13,
                          color: "#dc2626",
                          lineHeight: 1.6,
                        }}
                      >
                        {againstReason}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI changes summary */}
            {changesSummary.length > 0 && (
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
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: tk.text }}
                  >
                    AI Suggested Changes
                  </span>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <ol
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {changesSummary.map((change, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 13,
                          color: tk.text,
                          lineHeight: 1.6,
                        }}
                      >
                        {change}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT — Editable revised draft ── */}
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              overflow: "hidden",
              position: isSmall ? "static" : "sticky",
              top: 24,
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
                Revised Proposal Draft
              </span>
              <p style={{ fontSize: 12, color: tk.sub, margin: "2px 0 0" }}>
                AI pre-filled from rejection reasons — edit freely
              </p>
            </div>
            <div style={{ padding: "16px 18px" }}>
              <textarea
                value={revisedText}
                onChange={(e) => setRevisedText(e.target.value)}
                placeholder="Revised proposal will appear here once AI suggestions are ready, or write your own revision..."
                style={{
                  width: "100%",
                  minHeight: isSmall ? 300 : "calc(100vh - 380px)",
                  background: tk.inputBg,
                  border: `1px solid ${tk.border}`,
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontSize: 14,
                  color: tk.text,
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.8,
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: tk.sub,
                  textAlign: "right",
                }}
              >
                {revisedText.length} characters
              </div>
            </div>
          </div>
        </div>
      </div>
    </MediatorLayout>
  )
}