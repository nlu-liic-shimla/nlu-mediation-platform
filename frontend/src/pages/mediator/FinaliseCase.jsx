import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { finaliseCase, getSettlementStatus } from "../../api/cases";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
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

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function FinaliseCase() {
  const { isDark } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [finalising, setFinalising] = useState(false);
  const [finalised, setFinalised] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pollError, setPollError] = useState(null);

  const tk = tokens(isDark);

  /* ── Poll settlement status every 3 seconds ── */
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await getSettlementStatus(id);
        setStatus(data);
      } catch {
        setPollError("Failed to load settlement status. Retrying...");
      } finally {
        setLoading(false);
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleFinalise = async () => {
    setFinalising(true);
    try {
      await finaliseCase(id);
      setFinalised(true);
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === "INVALID_CASE_STATE") {
        setError(
          "Case is not in the correct state to finalise. Both parties must accept the proposal first.",
        );
      } else {
        setError("Failed to finalise case. Try again.");
      }
    } finally {
      setFinalising(false);
    }
  };

  const bothConfirmed =
    status?.requesting_party?.confirmed && status?.against_party?.confirmed;
  const pdfReady = status?.pdf_ready;

  /* ── Party confirmation row ── */
  const PartyConfirmRow = ({ label, confirmed, confirmedAt }) => (
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
        <div style={{ fontSize: 13, fontWeight: 500, color: tk.text }}>
          {label}
        </div>
        {confirmedAt && (
          <div style={{ fontSize: 11, color: tk.sub, marginTop: 2 }}>
            Confirmed at {new Date(confirmedAt).toLocaleString()}
          </div>
        )}
      </div>
      <span
        style={{
          padding: "4px 10px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          background: confirmed ? "#dcfce7" : "#fef9c3",
          color: confirmed ? "#16a34a" : "#ca8a04",
        }}
      >
        {confirmed ? "✅ Confirmed" : "⏳ Pending"}
      </span>
    </div>
  );

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
          Loading case status...
        </div>
      </MediatorLayout>
    );

  if (pollError && !status)
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
          <p style={{ color: "#ef4444", fontSize: 15 }}>{pollError}</p>
          <button
            onClick={() => window.location.reload()}
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
            Refresh
          </button>
        </div>
      </MediatorLayout>
    );

  return (
    <MediatorLayout>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
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
            Finalise Case
          </h1>
          <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
            Case {id?.slice(0, 8).toUpperCase()} — Review and close the
            mediation
          </p>
        </div>

        {/* ── Error ── */}
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

        {/* ── Finalise button ── */}
        {!finalised && !pdfReady && (
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              padding: "20px",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: tk.text,
                margin: "0 0 8px",
              }}
            >
              Generate Settlement and Notify Parties
            </h2>
            <p
              style={{
                fontSize: 13,
                color: tk.sub,
                margin: "0 0 16px",
                lineHeight: 1.6,
              }}
            >
              Both parties have accepted the proposal. Click below to finalise
              the case and notify parties to confirm with their signature.
            </p>
            <button
              onClick={handleFinalise}
              disabled={finalising}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                background: "#1e40af",
                color: "#fff",
                border: "none",
                cursor: finalising ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
                opacity: finalising ? 0.7 : 1,
              }}
            >
              {finalising
                ? "Finalising..."
                : "Generate Settlement and Notify Parties"}
            </button>
          </div>
        )}

        {/* ── Party confirmation status ── */}
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
  Party Confirmation Status
</h2>
<p style={{ fontSize: 12, color: tk.sub, margin: "0 0 12px" }}>
  This updates automatically as parties confirm
</p>
          <PartyConfirmRow
            label="Requesting Party"
            confirmed={status?.requesting_party?.confirmed}
            confirmedAt={status?.requesting_party?.confirmed_at}
          />
          <PartyConfirmRow
            label="Against Party"
            confirmed={status?.against_party?.confirmed}
            confirmedAt={status?.against_party?.confirmed_at}
          />
        </div>

        {/* ── PDF Download ── */}
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
              margin: "0 0 8px",
            }}
          >
            Settlement PDF
          </h2>

          {pdfReady ? (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <CheckCircle2 size={16} color="#16a34a" />
                <span
                  style={{ fontSize: 13, color: "#16a34a", fontWeight: 500 }}
                >
                  PDF ready — both parties have confirmed
                </span>
              </div>
              <a
                href={status?.pdf_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 24px",
                  borderRadius: 8,
                  background: "#16a34a",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                ⬇ Download Settlement PDF
              </a>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px",
                borderRadius: 8,
                background: tk.bg,
                border: `1px solid ${tk.border}`,
              }}
            >
              <Clock size={16} color={tk.sub} />
              <span style={{ fontSize: 13, color: tk.sub }}>
                {bothConfirmed
                  ? "Both parties confirmed — generating PDF..."
                  : "Waiting for both parties to confirm before PDF is generated"}
              </span>
            </div>
          )}
        </div>
      </div>
    </MediatorLayout>
  );
}
