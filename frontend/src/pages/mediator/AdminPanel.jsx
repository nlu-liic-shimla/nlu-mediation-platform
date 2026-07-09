import { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import {
  Settings2,
  Activity,
  Sliders,
  Database,
  Cpu,
  RefreshCw,
  Save,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import MediatorLayout from "../../layouts/MediatorLayout";

const tokens = (dark) => ({
  bg: dark ? "#0f172a" : "#f1f5f9",
  surface: dark ? "#1e293b" : "#ffffff",
  border: dark ? "#334155" : "#e2e8f0",
  text: dark ? "#f1f5f9" : "#1e293b",
  sub: dark ? "#94a3b8" : "#64748b",
  inputBg: dark ? "#0f172a" : "#f8fafc",
  accent: "#1e40af",
});

export default function AdminPanel() {
  const { isDark } = useTheme();
  const tk = tokens(isDark);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [temp, setTemp] = useState(0.3);
  const [maxRounds, setMaxRounds] = useState(3);
  const [toneThreshold, setToneThreshold] = useState(70);
  const [autoRevise, setAutoRevise] = useState(true);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1200);
  };

  return (
    <MediatorLayout>
      <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              margin: "0 0 4px",
              color: tk.text,
            }}
          >
            System Admin Dashboard
          </h1>
          <p style={{ fontSize: 13, color: tk.sub, margin: 0 }}>
            Configure global parameters, monitor AI subsystems, and track backend service logs
          </p>
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {[
            {
              label: "System Load",
              value: "12.4%",
              sub: "Redis + Celery Tasks active",
              icon: Activity,
              color: "#10b981",
            },
            {
              label: "Claude API Latency",
              value: "1.42s",
              sub: "Average turnaround",
              icon: Cpu,
              color: "#6366f1",
            },
            {
              label: "Active Subsystems",
              value: "8 / 8",
              sub: "All pipelines operating",
              icon: Settings2,
              color: "#3b82f6",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: tk.surface,
                borderRadius: 12,
                border: `1px solid ${tk.border}`,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: tk.sub, marginBottom: 4 }}>
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: tk.text,
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: tk.sub, marginTop: 4 }}>
                  {s.sub}
                </div>
              </div>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: `${s.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <s.icon size={18} color={s.color} />
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* AI Settings Column */}
          <div
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 20,
                borderBottom: `1px solid ${tk.border}`,
                paddingBottom: 12,
              }}
            >
              <Sliders size={18} color={tk.accent} />
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: tk.text,
                  margin: 0,
                }}
              >
                AI Model Configurations
              </h2>
            </div>

            {/* Temp range */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <label
                  style={{ fontSize: 12, fontWeight: 600, color: tk.sub }}
                >
                  CLAUDE TEMPERATURE (CREATIVITY)
                </label>
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: tk.accent }}
                >
                  {temp}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.1"
                value={temp}
                onChange={(e) => setTemp(parseFloat(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }}
              />
              <p style={{ fontSize: 11, color: tk.sub, marginTop: 4, margin: 0 }}>
                Lower values yield deterministic conflict extraction; higher values yield creative proposals.
              </p>
            </div>

            {/* Max negotiation rounds */}
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: tk.sub,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                DEFAULT NEGOTIATION ROUND LIMIT
              </label>
              <select
                value={maxRounds}
                onChange={(e) => setMaxRounds(parseInt(e.target.value))}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: `1px solid ${tk.border}`,
                  background: tk.bg,
                  color: tk.text,
                  fontSize: 13,
                  outline: "none",
                }}
              >
                <option value={3}>3 Rounds (Standard)</option>
                <option value={5}>5 Rounds (Complex)</option>
                <option value={10}>10 Rounds (Uncapped)</option>
              </select>
            </div>

            {/* Hostility alert threshold */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <label
                  style={{ fontSize: 12, fontWeight: 600, color: tk.sub }}
                >
                  HOSTILITY CRITICAL THRESHOLD
                </label>
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}
                >
                  {toneThreshold}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={toneThreshold}
                onChange={(e) => setToneThreshold(parseInt(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }}
              />
            </div>

            {/* Auto revision toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 24,
                paddingTop: 16,
                borderTop: `1px solid ${tk.border}`,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>
                  Auto-trigger Sub-system H
                </div>
                <div style={{ fontSize: 11, color: tk.sub, marginTop: 2 }}>
                  Revise proposal instantly upon party rejection
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoRevise}
                onChange={(e) => setAutoRevise(e.target.checked)}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
            </div>
          </div>

          {/* Infrastructure Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* System Health */}
            <div
              style={{
                background: tk.surface,
                borderRadius: 12,
                border: `1px solid ${tk.border}`,
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                  borderBottom: `1px solid ${tk.border}`,
                  paddingBottom: 12,
                }}
              >
                <Database size={18} color={tk.accent} />
                <h2
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: tk.text,
                    margin: 0,
                  }}
                >
                  Platform Services
                </h2>
              </div>

              {[
                { name: "Supabase DB Connection", status: "Healthy" },
                { name: "Redis Message Broker", status: "Healthy" },
                { name: "Celery Task Worker 1", status: "Active (solo pool)" },
                { name: "Claude API Services", status: "Active (operational)" },
              ].map((serv, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: index < 3 ? `1px solid ${tk.border}` : "none",
                  }}
                >
                  <span style={{ fontSize: 13, color: tk.text }}>
                    {serv.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#16a34a",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#16a34a",
                      }}
                    />
                    {serv.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Action Bar */}
            <div
              style={{
                background: tk.surface,
                borderRadius: 12,
                border: `1px solid ${tk.border}`,
                padding: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <button
                onClick={() => {
                  setTemp(0.3);
                  setMaxRounds(3);
                  setToneThreshold(70);
                  setAutoRevise(true);
                }}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: `1px solid ${tk.border}`,
                  background: "transparent",
                  color: tk.text,
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Reset Defaults
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "9px 22px",
                  borderRadius: 8,
                  background: "#1e40af",
                  color: "#fff",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <RefreshCw
                    size={14}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <Save size={14} />
                )}
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>

            {/* Success flash warning */}
            {success && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "#dcfce7",
                  border: "1px solid #86efac",
                  color: "#166534",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CheckCircle size={15} />
                Configurations saved successfully. Changes applied to active pipelines.
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </MediatorLayout>
  );
}
