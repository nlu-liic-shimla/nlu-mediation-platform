import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MediatorLayout from "../../layouts/MediatorLayout";

const tokens = (dark) => ({
  surface: dark ? "#1e293b" : "#ffffff",
  border: dark ? "#334155" : "#e2e8f0",
  text: dark ? "#f1f5f9" : "#1e293b",
  sub: dark ? "#94a3b8" : "#64748b",
  accent: "#1e40af",
});

export default function QuestionnaireManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const tk = tokens(dark);

  return (
    <MediatorLayout dark={dark} setDark={setDark}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
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
          ← Back
        </button>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            margin: "0 0 8px",
            color: tk.text,
          }}
        >
          Questionnaire Management
        </h1>
        <p style={{ fontSize: 13, color: tk.sub, margin: "0 0 24px" }}>
          {id ? `Case: ${id.slice(0, 8).toUpperCase()}` : "No case selected"}
        </p>

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
            Questionnaires — Week 4
          </p>
          <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
            Questionnaire creation, party responses, and comparison view will be
            built in Week 4.
          </p>
        </div>
      </div>
    </MediatorLayout>
  );
}
