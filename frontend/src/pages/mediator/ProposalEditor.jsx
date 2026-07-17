import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  createProposal,
  updateProposal,
  publishProposal,
  getBatnaWatna,
  getProposals,
  getQuestionnaires,
  getQuestionnaireResponses,
} from "../../api/cases";
import { AlertTriangle, CheckCircle2, Eye } from "lucide-react";
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

/* ── PreviewModal ───────────────────────────────────────── */
function PreviewModal({ text, onClose, tk }) {
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
          maxWidth: 600,
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3
            style={{ fontSize: 16, fontWeight: 700, color: tk.text, margin: 0 }}
          >
            Proposal Preview
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: tk.sub,
              fontSize: 20,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <p style={{ fontSize: 13, color: tk.sub, margin: "0 0 16px" }}>
          This is how parties will see the proposal.
        </p>
        <div
          style={{
            padding: "16px",
            borderRadius: 8,
            background: tk.bg,
            border: `1px solid ${tk.border}`,
            fontSize: 14,
            color: tk.text,
            lineHeight: 1.8,
            whiteSpace: "pre-wrap",
          }}
        >
          {text || "No content yet"}
        </div>
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
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
          Close Preview
        </button>
      </div>
    </div>
  );
}

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
          Publish Proposal?
        </h3>
        <p
          style={{
            fontSize: 13,
            color: tk.sub,
            margin: "0 0 20px",
            lineHeight: 1.6,
          }}
        >
          Once published, both parties will immediately see this proposal and
          can accept or reject it. This action cannot be undone.
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
export default function ProposalEditor() {
  const { isDark } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [proposalId, setProposalId] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [roundNumber, setRoundNumber] = useState(1);
  const [batnaData, setBatnaData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [qSummary, setQSummary] = useState(null);

  const [showPreview, setShowPreview] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const [width, setWidth] = useState(window.innerWidth);
  const tk = tokens(isDark);
  const isSmall = width < 900;

  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // On mount — create proposal and get AI draft (or resume existing draft)
  useEffect(() => {
    const init = async () => {
      try {
        const [proposalsList, batnaRes] = await Promise.all([
          getProposals(id).catch(() => []),
          getBatnaWatna(id).catch(() => null),
        ]);

        const draft = proposalsList.find((p) => p.status === "draft");
        if (draft) {
          setProposalId(draft.id);
          setDraftText(draft.content || "");
          setRoundNumber(draft.round || 1);
        } else {
          const proposalRes = await createProposal(id);
          setProposalId(proposalRes.proposal_id);
          setDraftText(proposalRes.draft_text || "");
          setRoundNumber(proposalRes.round_number || 1);
        }
        setBatnaData(batnaRes);
      } catch (err) {
        setError(
          "Failed to load or create proposal. Make sure BATNA/WATNA is complete.",
        );
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  useEffect(() => {
  const fetchQuestionnaireSummary = async () => {
    try {
      const qData = await getQuestionnaires(id);
      const q = Array.isArray(qData) ? qData[0] : qData.questionnaires?.[0] || qData;
      if (!q?.id) return;

      const rData = await getQuestionnaireResponses(id, q.id);
      const questions = rData.questions || [];
      const responses = rData.responses || [];

      const rpResponse = responses.find((r) => r.party_role === "requesting_party");
      const apResponse = responses.find((r) => r.party_role === "against_party");

      let answeredCount = 0;
      let divergentCount = 0;

      questions.forEach((question) => {
        const rpAnswer = rpResponse?.answers?.[question.question_id];
        const apAnswer = apResponse?.answers?.[question.question_id];
        const rpApplicable = question.directed_at !== "against_party";
        const apApplicable = question.directed_at !== "requesting_party";

        if ((rpApplicable && rpAnswer) || (apApplicable && apAnswer)) answeredCount++;
        if (rpApplicable && apApplicable && rpAnswer && apAnswer) {
          if (rpAnswer.toString().trim().toLowerCase() !== apAnswer.toString().trim().toLowerCase()) {
            divergentCount++;
          }
        }
      });

      setQSummary({
        total: questions.length,
        answered: answeredCount,
        divergent: divergentCount,
      });
    } catch {
      setQSummary(null);
    }
  };
  fetchQuestionnaireSummary();
}, [id]);

  const handleSaveDraft = async () => {
    if (!proposalId) return;
    setSaving(true);
    try {
      await updateProposal(id, proposalId, draftText);
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
      await publishProposal(id, proposalId);
      setShowPublishModal(false);
      navigate(`/mediator/cases/${id}`);
    } catch (err) {
      const msg = err?.response?.data?.code;
      if (msg === "ROUNDS_EXHAUSTED") {
        alert("Maximum rounds reached. Extend rounds before publishing.");
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
          Generating AI proposal draft...
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
          <p style={{ color: "#ef4444", fontSize: 15, textAlign: "center" }}>
            {error}
          </p>
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
      {showPreview && (
        <PreviewModal
          text={draftText}
          onClose={() => setShowPreview(false)}
          tk={tk}
        />
      )}

      {showPublishModal && (
        <PublishModal
          onCancel={() => setShowPublishModal(false)}
          onConfirm={handlePublish}
          loading={publishing}
          tk={tk}
        />
      )}

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate(`/mediator/cases/${id}/batna-watna`)}
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
          ← Back to BATNA/WATNA
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
              Proposal Editor
            </h1>
            <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
              Round {roundNumber} — Case {id?.slice(0, 8).toUpperCase()}
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
              onClick={() => setShowPreview(true)}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: `1px solid ${tk.border}`,
                background: "transparent",
                color: tk.text,
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Eye size={14} /> Preview
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

      {/* ── Split layout ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isSmall ? "1fr" : "1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* ── LEFT — Reference panel ── */}
        <div
          style={{
            background: tk.surface,
            borderRadius: 12,
            border: `1px solid ${tk.border}`,
            overflow: "hidden",
            maxHeight: isSmall ? "none" : "calc(100vh - 180px)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: `1px solid ${tk.border}`,
              background: tk.bg,
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>
              Reference Panel
            </span>
            <p style={{ fontSize: 12, color: tk.sub, margin: "2px 0 0" }}>
              Read only — use this to inform your proposal
            </p>
          </div>

          <div
            style={{
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* BATNA/WATNA summary */}
            {batnaData && (
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: tk.sub,
                    marginBottom: 8,
                    textTransform: "uppercase",
                  }}
                >
                  BATNA / WATNA Summary
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                 {[
  {
    label: "Req Party BATNA",
    value: batnaData.party_a?.batna_label,
  },
  {
    label: "Req Party WATNA",
    value: batnaData.party_a?.watna_label,
  },
  {
    label: "Against Party BATNA",
    value: batnaData.party_b?.batna_label,
  },
  {
    label: "Against Party WATNA",
    value: batnaData.party_b?.watna_label,
  },
].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 7,
                        background: tk.bg,
                        border: `1px solid ${tk.border}`,
                      }}
                    >
                      <div
                        style={{ fontSize: 11, color: tk.sub, marginBottom: 2 }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color:
                            value === "Strong"
                              ? "#16a34a"
                              : value === "Moderate"
                                ? "#d97706"
                                : "#dc2626",
                        }}
                      >
                        {value || "—"}
                      </div>
                    </div>
                  ))}
                </div>
                {batnaData.overall_settlement_zone && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#1e40af",
                        marginBottom: 2,
                      }}
                    >
                      SETTLEMENT ZONE
                    </div>
                    <p style={{ fontSize: 13, color: "#1e3a5f", margin: 0 }}>
                      {batnaData.overall_settlement_zone}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Placeholder for questionnaire comparison */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: tk.sub,
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Questionnaire Summary
              </div>
              <div
  style={{
    padding: "12px",
    borderRadius: 8,
    background: tk.bg,
    border: `1px solid ${tk.border}`,
    fontSize: 13,
    color: tk.text,
  }}
>
  {qSummary ? (
    <>
      <p style={{ margin: "0 0 4px" }}>
        <strong>{qSummary.answered}</strong> of <strong>{qSummary.total}</strong> questions answered.
      </p>
      {qSummary.divergent > 0 ? (
        <p style={{ margin: 0, color: "#d97706" }}>
          {qSummary.divergent} divergent answer{qSummary.divergent > 1 ? "s" : ""} — review before drafting terms.
        </p>
      ) : (
        <p style={{ margin: 0, color: tk.sub }}>No divergent answers.</p>
      )}
    </>
  ) : (
    <span style={{ color: tk.sub }}>Questionnaire responses visible after both parties answer.</span>
  )}
</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT — Editable text area ── */}
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
              Proposal Draft
            </span>
            <p style={{ fontSize: 12, color: tk.sub, margin: "2px 0 0" }}>
              AI pre-filled — edit freely or rewrite entirely
            </p>
          </div>
          <div style={{ padding: "16px 18px" }}>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="AI proposal draft will appear here..."
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
              {draftText.length} characters
            </div>
          </div>
        </div>
      </div>
    </MediatorLayout>
  );
}
