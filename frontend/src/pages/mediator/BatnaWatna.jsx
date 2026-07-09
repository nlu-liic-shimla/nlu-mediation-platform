import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBatnaWatna } from "../../api/cases";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
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

/* ── Label config ───────────────────────────────────────── */
const LABEL_COLOR = {
  Strong: "#16a34a",
  Moderate: "#d97706",
  Weak: "#dc2626",
};

/* ── ScoreCard ──────────────────────────────────────────── */
function ScoreCard({ title, score, label, reasoning, guidance, tk }) {
  const color = LABEL_COLOR[label] || "#64748b";
  return (
    <div
      style={{
        background: tk.surface,
        borderRadius: 12,
        border: `1px solid ${tk.border}`,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${tk.border}`,
          background: (dark) => (dark ? "#1e293b" : "#f8fafc"),
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: tk.sub,
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 28,
              fontWeight: 800,
              color,
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: 14,
              color: tk.sub,
              fontWeight: 500,
            }}
          >
            ({score}/10)
          </span>
        </div>
      </div>
      <div style={{ padding: "14px 18px" }}>
        <p
          style={{
            fontSize: 13,
            color: tk.text,
            lineHeight: 1.7,
            margin: "0 0 12px",
          }}
        >
          {reasoning}
        </p>
        {guidance && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: `${color}12`,
              border: `1px solid ${color}30`,
            }}
          >
            <p style={{ fontSize: 12, color, margin: 0, lineHeight: 1.6 }}>
              {guidance}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── PartyColumn ────────────────────────────────────────── */
function PartyColumn({ label, data, tk }) {
  if (!data) return null;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: tk.sub,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>

      {/* BATNA */}
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
          <div style={{ fontSize: 12, color: tk.sub, marginBottom: 2 }}>
            BATNA — Best Alternative
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: LABEL_COLOR[data.batna_label] || "#64748b",
              }}
            >
              {data.batna_label}
            </span>
            <span style={{ fontSize: 13, color: tk.sub }}>
              ({data.batna_score}/10)
            </span>
          </div>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <p
            style={{ fontSize: 13, color: tk.text, lineHeight: 1.7, margin: 0 }}
          >
            {data.batna_reasoning}
          </p>
        </div>
      </div>

      {/* WATNA */}
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
          <div style={{ fontSize: 12, color: tk.sub, marginBottom: 2 }}>
            WATNA — Worst Alternative
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: LABEL_COLOR[data.watna_label] || "#64748b",
              }}
            >
              {data.watna_label}
            </span>
            <span style={{ fontSize: 13, color: tk.sub }}>
              ({data.watna_score}/10)
            </span>
          </div>
        </div>
        <div style={{ padding: "12px 16px" }}>
          <p
            style={{ fontSize: 13, color: tk.text, lineHeight: 1.7, margin: 0 }}
          >
            {data.watna_reasoning}
          </p>
        </div>
      </div>

      {/* Guidance */}
      {data.negotiation_guidance && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#1e40af",
              marginBottom: 4,
            }}
          >
            Negotiation Guidance
          </div>
          <p
            style={{
              fontSize: 13,
              color: "#1e3a5f",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {data.negotiation_guidance}
          </p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function BatnaWatna() {
  const { isDark } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [width, setWidth] = useState(window.innerWidth);

  const tk = tokens(isDark);
  const isSmall = width < 900;

  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getBatnaWatna(id);
        setData(res);
      } catch {
        setError("Failed to load BATNA/WATNA analysis");
      } finally {
        setLoading(false);
      }
    };
    fetch();
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
          Loading BATNA/WATNA analysis...
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

  const rp = data?.requesting_party;
  const ap = data?.against_party;

  return (
    <MediatorLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
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
            BATNA / WATNA Analysis
          </h1>
          <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
            Case {id?.slice(0, 8).toUpperCase()} — Negotiation position analysis
          </p>
        </div>

        {/* ── Settlement Zone ── */}
        {data?.overall_settlement_zone && (
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 10,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#1e40af",
                marginBottom: 4,
              }}
            >
              SETTLEMENT ZONE
            </div>
            <p
              style={{
                fontSize: 14,
                color: "#1e3a5f",
                margin: 0,
                fontWeight: 500,
              }}
            >
              {data.overall_settlement_zone}
            </p>
          </div>
        )}

        {/* ── Two column layout ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isSmall ? "1fr" : "1fr 1fr",
            gap: 20,
            marginBottom: 20,
          }}
        >
          <PartyColumn label="Requesting Party" data={rp} tk={tk} />
          <PartyColumn label="Against Party" data={ap} tk={tk} />
        </div>

        {/* ── Disclaimer ── */}
        {data?.disclaimer && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              background: tk.bg,
              border: `1px solid ${tk.border}`,
              marginBottom: 20,
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: tk.sub,
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {data.disclaimer}
            </p>
          </div>
        )}

        {/* ── Create Proposal button ── */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => navigate(`/mediator/cases/${id}/proposals/new`)}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              background: "#1e40af",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Create Proposal →
          </button>
        </div>
      </div>
    </MediatorLayout>
  );
}
