import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MediatorLayout from "../../layouts/MediatorLayout";

const tokens = (dark) => ({
  bg: dark ? "#0f172a" : "#f1f5f9",
  surface: dark ? "#1e293b" : "#ffffff",
  border: dark ? "#334155" : "#e2e8f0",
  text: dark ? "#f1f5f9" : "#1e293b",
  sub: dark ? "#94a3b8" : "#64748b",
  accent: "#1e40af",
});

export default function Analysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const tk = tokens(dark);

  // No case selected — came from sidebar directly
  if (!id) {
    return (
      <MediatorLayout dark={dark} setDark={setDark}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: dark ? "#0f172a" : "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            🧠
          </div>
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: tk.text,
                margin: "0 0 6px",
              }}
            >
              No case selected
            </p>
            <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
              Open a case from the dashboard to view AI analysis
            </p>
          </div>
          <button
            onClick={() => navigate("/mediator")}
            style={{
              padding: "9px 22px",
              borderRadius: 8,
              background: tk.accent,
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </MediatorLayout>
    );
  }

  // Case selected — Week 3 will fill this with real AI analysis data
  return (
    <MediatorLayout dark={dark} setDark={setDark}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Back */}
        <button
          onClick={() => navigate(`/mediator/cases/${id}`)}
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
          ← Back to Case
        </button>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: tk.sub, margin: "0 0 4px" }}>
            Case ID: {id?.slice(0, 8).toUpperCase()}
          </p>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              margin: "0 0 8px",
              color: tk.text,
            }}
          >
            AI Dispute Analysis
          </h1>
          <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
            AI pipeline results will appear here after both parties submit —
            Week 3
          </p>
        </div>

        {/* Placeholder cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Neutral Summary", status: "Pending" },
            { label: "Conflict Extraction", status: "Pending" },
            { label: "Mediatability Score", status: "Pending" },
            { label: "Tone Analysis", status: "Pending" },
          ].map(({ label, status }) => (
            <div
              key={label}
              style={{
                background: tk.surface,
                borderRadius: 12,
                border: `1px solid ${tk.border}`,
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 13, color: tk.sub, marginBottom: 6 }}>
                {label}
              </div>
              <div
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  background: "#f1f5f9",
                  color: "#64748b",
                }}
              >
                {status}
              </div>
            </div>
          ))}
        </div>

        {/* Coming soon banner */}
        <div
          style={{
            background: tk.surface,
            borderRadius: 12,
            border: `1px solid ${tk.border}`,
            padding: "32px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: tk.text,
              margin: "0 0 8px",
            }}
          >
            AI Analysis — Week 3
          </p>
          <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
            Once Backend wires the Burst 1 Celery pipeline, real AI output will
            populate here. This page will show neutral summary, conflict claims,
            tone scores, and mediatability score.
          </p>
        </div>
      </div>
    </MediatorLayout>
  );
}
