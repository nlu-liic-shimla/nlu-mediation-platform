import MediatorLayout from "../../layouts/MediatorLayout";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCases, createCase, acceptApplication, rejectApplication } from "../../api/cases";
import { useTheme } from "../../context/ThemeContext";
import {
  Brain,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

/* ─── static chart data ───────────────────────────────────── */
const caseVolumeData = [
  { month: "Jan", cases: 10 },
  { month: "Feb", cases: 15 },
  { month: "Mar", cases: 13 },
  { month: "Apr", cases: 20 },
  { month: "May", cases: 28 },
];
const resolutionData = [
  { name: "Resolved", value: 68 },
  { name: "Pending",  value: 6  },
  { name: "Active",   value: 22 },
];
const RES_COLORS = ["#1e3a5f", "#3b82f6", "#bfdbfe"];
const aiPerfData = [
  { week: "W1", acc: 82 },
  { week: "W2", acc: 85 },
  { week: "W3", acc: 84 },
  { week: "W4", acc: 88 },
];

/* ─── tokens ──────────────────────────────────────────────── */
const tokens = (dark) => ({
  bg:      dark ? "#0f172a" : "#f1f5f9",
  surface: dark ? "#1e293b" : "#ffffff",
  border:  dark ? "#334155" : "#e2e8f0",
  text:    dark ? "#f1f5f9" : "#1e293b",
  sub:     dark ? "#94a3b8" : "#64748b",
  accent:  "#1e40af",
});

/* ─── useWindowWidth ──────────────────────────────────────── */
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWidth(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return width;
}

/* ─── Badge ───────────────────────────────────────────────── */
const Badge = ({ label, color }) => (
  <span
    style={{
      padding: "3px 10px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      background: `${color}22`,
      color,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </span>
);

const TABS = ["Applications", "Active Cases", "Closed Cases"];

const CLOSED_STATES      = ["MEDIATION_COMPLETE", "MEDIATION_FAILED"];
const APPLICATION_STATES = ["APPLICATION_PENDING", "APPLICATION_REJECTED", "WITHDRAWN"];

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [cases, setCases]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("Active Cases");

  // ── Step 1: New Case modal state ──
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState({
    title: '',
    brief_description: '',
    requesting_party_email: '',
    against_party_email: '',
  });
  const [newCaseLoading, setNewCaseLoading] = useState(false);
  const [newCaseError, setNewCaseError] = useState('');

  const width    = useWindowWidth();
  const tk       = tokens(isDark);
  const isNarrow = width < 1024;
  const isSmall  = width < 640;

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const data = await getCases();
        console.log("Cases from API:", JSON.stringify(data));
        setCases(data);
      } catch (err) {
        console.error("Failed to load cases", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  // ── Step 2: Create case handler ──
  const handleCreateCase = async () => {
    if (!newCaseForm.title.trim()) {
      setNewCaseError('Case title is required');
      return;
    }
    if (!newCaseForm.brief_description.trim() || newCaseForm.brief_description.trim().length < 20) {
      setNewCaseError('Description is required and must be at least 20 characters.');
      return;
    }
    if (!newCaseForm.requesting_party_email.trim()) {
      setNewCaseError('Requesting party email is required');
      return;
    }
    setNewCaseLoading(true);
    setNewCaseError('');
    try {
      const payload = {
        dispute_type: newCaseForm.title,
        brief_description: newCaseForm.brief_description,
        requesting_party_email: newCaseForm.requesting_party_email || null,
        against_party_email: newCaseForm.against_party_email || null,
      };
      await createCase(payload);
      setShowNewCase(false);
      setNewCaseForm({ title: '', brief_description: '', requesting_party_email: '', against_party_email: '' });
      // Refresh cases list
      const data = await getCases();
      setCases(data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setNewCaseError(detail.map(e => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join(', '));
      } else if (typeof detail === 'string') {
        setNewCaseError(detail);
      } else if (detail?.message) {
        setNewCaseError(detail.message);
      } else {
        setNewCaseError('Failed to create case. Try again.');
      }
    } finally {
      setNewCaseLoading(false);
    }
  };

  /* ── filter cases by tab ── */
  const filteredCases = cases.filter((c) => {
    if (activeTab === "Applications") return APPLICATION_STATES.includes(c.status);
    if (activeTab === "Closed Cases") return CLOSED_STATES.includes(c.status);
    return !APPLICATION_STATES.includes(c.status) && !CLOSED_STATES.includes(c.status);
  });

  /* ── FIX: derive pending approvals from real cases ── */
  const pendingApprovals = cases
    .filter((c) => c.status === "APPLICATION_PENDING")
    .slice(0, 3)
    .map((c) => ({
      color:  "#f59e0b",
      label:  "Application pending review",
      caseId: c.id?.slice(0, 8).toUpperCase() + "…",
      id:     c.id,
    }));

  const showApprovals = pendingApprovals.length > 0;

  /* ── FIX: derive risk indicators from real cases ── */
  const highRiskCount       = cases.filter((c) => c.status === "PROCESSING_FAILED").length;
  const approachingDeadline = cases.filter((c) =>
    c.next_session_date &&
    new Date(c.next_session_date) - Date.now() < 3 * 24 * 60 * 60 * 1000
  ).length;
  const stalledCount = cases.filter((c) =>
    c.status === "BOTH_SUBMITTED" &&
    new Date() - new Date(c.updated_at) > 7 * 24 * 60 * 60 * 1000
  ).length;

  const RISKS = [
    { label: "High Risk Cases",       count: highRiskCount,       color: "#ef4444" },
    { label: "Approaching Deadline",  count: approachingDeadline, color: "#f59e0b" },
    { label: "Stalled Negotiations",  count: stalledCount,        color: "#6b7280" },
  ];

  /* ── shared sub-components ── */
  const Card = ({ children, style = {} }) => (
    <div
      style={{
        background: tk.surface,
        borderRadius: 12,
        border: `1px solid ${tk.border}`,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );

  const CardHead = ({ title, sub, action }) => (
    <div
      style={{
        padding: "16px 20px",
        borderBottom: `1px solid ${tk.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, color: tk.text }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: tk.sub, marginTop: 2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );

  /* ── Applications tab ── */
  const ApplicationsTable = () => (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${tk.border}` }}>
            {["Case ID", "Dispute Type", "Status", "Filed", "Action"].map((h) => (
              <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: tk.sub, whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center", color: tk.sub }}>Loading applications...</td></tr>
          ) : filteredCases.length === 0 ? (
            <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center", color: tk.sub }}>No pending applications</td></tr>
          ) : (
            filteredCases.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i < filteredCases.length - 1 ? `1px solid ${tk.border}` : "none" }}>
                <td style={{ padding: "14px 16px", fontWeight: 500, color: tk.text, whiteSpace: "nowrap" }}>
                  {c.id?.slice(0, 8).toUpperCase()}
                </td>
                <td style={{ padding: "14px 16px", color: tk.sub }}>
                  {c.dispute_type || c.brief_description?.slice(0, 30) || "—"}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <Badge
                    label={c.status}
                    color={
                      c.status === "APPLICATION_PENDING" ? "#f59e0b"
                      : c.status === "APPLICATION_REJECTED" ? "#ef4444"
                      : "#64748b"
                    }
                  />
                </td>
                <td style={{ padding: "14px 16px", color: tk.sub, whiteSpace: "nowrap" }}>
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {c.status === "APPLICATION_PENDING" ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={async () => {
                          try {
                            await acceptApplication(c.id);
                            const data = await getCases();
                            setCases(data);
                          } catch (err) {
                            console.error("Accept failed", err);
                            alert(err?.response?.data?.detail?.message || "Failed to accept application");
                          }
                        }}
                        style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#1e40af", fontSize: 12, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <CheckCircle size={12} /> Accept
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await rejectApplication(c.id, "Mediator declined");
                            const data = await getCases();
                            setCases(data);
                          } catch (err) {
                            console.error("Reject failed", err);
                            alert(err?.response?.data?.detail?.message || "Failed to reject application");
                          }
                        }}
                        style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${tk.border}`, background: "transparent", fontSize: 12, cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate(`/mediator/cases/${c.id}`)}
                      style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${tk.border}`, background: "transparent", fontSize: 12, cursor: "pointer", color: tk.text, display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Eye size={12} /> View
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  /* ── Active / Closed cases table ── */
  const CasesTable = () => (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${tk.border}` }}>
            {["Case ID", "Parties", "Status", "Created", "Action"].map((h) => (
              <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: tk.sub, whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} style={{ padding: "30px", textAlign: "center", color: tk.sub }}>Loading cases...</td></tr>
          ) : filteredCases.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: tk.sub }}>
                {activeTab === "Closed Cases" ? "No closed cases" : "No cases yet — invite a party to begin"}
              </td>
            </tr>
          ) : (
            filteredCases.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i < filteredCases.length - 1 ? `1px solid ${tk.border}` : "none" }}>
                <td style={{ padding: "14px 16px", fontWeight: 500, color: tk.text, whiteSpace: "nowrap" }}>
                  {c.id?.slice(0, 8).toUpperCase()}
                </td>
                <td style={{ padding: "14px 16px", color: tk.sub, whiteSpace: "nowrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Users size={13} /> 2 parties
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <Badge label={STATUS_DISPLAY[c.status] || c.status?.replace(/_/g,' ') || "pending"} color="#1e3a5f" />
                </td>
                <td style={{ padding: "14px 16px", color: tk.sub, whiteSpace: "nowrap" }}>
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <button
                    onClick={() => navigate(`/mediator/cases/${c.id}`)}
                    style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${tk.border}`, background: "transparent", fontSize: 12, cursor: "pointer", color: tk.text, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}
                  >
                    <Eye size={12} /> Review
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  /* ════════════════════════════════════════════════════════ */
  return (
    <MediatorLayout>
      {/* page title + New Case button */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isSmall ? 20 : 24, fontWeight: 700, margin: 0, color: tk.text }}>
            Mediator Dashboard
          </h1>
          <p style={{ fontSize: 13, color: tk.sub, margin: "4px 0 0" }}>
            Overview of all active cases and system analytics
          </p>
        </div>
        {/* Step 3: New Case button wired to open modal */}
        <button
          className="pd-new-case-btn"
          onClick={() => setShowNewCase(true)}
          style={{
            padding: "9px 20px",
            borderRadius: 8,
            border: "none",
            background: "#1e40af",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          + New Case
        </button>
      </div>

      {/* stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isSmall ? "1fr 1fr" : "repeat(auto-fit, minmax(175px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Total Cases",
            value: cases.filter((c) => !APPLICATION_STATES.includes(c.status)).length.toString(),
            sub: "Active cases", subC: "#10b981",
            icon: FileText, iconBg: "#eff6ff",
          },
          {
            label: "Applications",
            value: cases.filter((c) => c.status === "APPLICATION_PENDING").length.toString(),
            sub: "Awaiting review", subC: "#f59e0b",
            icon: Clock, iconBg: "#fff7ed",
          },
          {
            label: "Resolved",
            value: cases.filter((c) => c.status === "MEDIATION_COMPLETE").length.toString(),
            sub: "Completed", subC: "#10b981",
            icon: CheckCircle2, iconBg: "#f0fdf4",
          },
          {
            label: "AI Accuracy",
            value: "88%",
            sub: "+3% this week", subC: "#6366f1",
            icon: Brain, iconBg: "#f5f3ff",
          },
        ].map(({ label, value, sub, subC, icon: Icon, iconBg }) => (
          <div
            key={label}
            style={{ background: tk.surface, borderRadius: 12, border: `1px solid ${tk.border}`, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <div>
              <div style={{ fontSize: 11, color: tk.sub, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: tk.text }}>{value}</div>
              <div style={{ fontSize: 11, color: subC, marginTop: 4 }}>{sub}</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: isDark ? "#0f172a" : iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={18} color={tk.accent} />
            </div>
          </div>
        ))}
      </div>

      {/* main grid */}
      <div style={{ display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "minmax(0,1fr) 300px", gap: 16, alignItems: "start" }}>

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

          {/* Tabs + Cases */}
          <Card>
            <div style={{ display: "flex", borderBottom: `1px solid ${tk.border}`, padding: "0 20px", gap: 0, overflowX: "auto" }}>
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "14px 16px", border: "none", background: "transparent", cursor: "pointer",
                    fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? tk.accent : tk.sub,
                    borderBottom: activeTab === tab ? `2px solid ${tk.accent}` : "2px solid transparent",
                    whiteSpace: "nowrap", transition: "color .15s",
                  }}
                >
                  {tab}
                  {tab === "Applications" && cases.filter((c) => c.status === "APPLICATION_PENDING").length > 0 && (
                    <span style={{ marginLeft: 6, padding: "1px 7px", borderRadius: 10, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                      {cases.filter((c) => c.status === "APPLICATION_PENDING").length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {activeTab === "Applications" ? <ApplicationsTable /> : <CasesTable />}
          </Card>

          {/* Charts row */}
          <div style={{ display: "grid", gridTemplateColumns: isSmall ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <Card style={{ padding: "18px 20px" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: tk.text, marginBottom: 2 }}>Case Volume</div>
              <div style={{ fontSize: 12, color: tk.sub, marginBottom: 14 }}>Monthly case intake</div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={caseVolumeData} barSize={20}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: tk.sub }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: tk.sub }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 8, fontSize: 12 }} cursor={{ fill: `${tk.accent}18` }} />
                  <Bar dataKey="cases" fill={tk.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card style={{ padding: "18px 20px" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: tk.text, marginBottom: 2 }}>Resolution Status</div>
              <div style={{ fontSize: 12, color: tk.sub, marginBottom: 14 }}>Overall case outcomes</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie data={resolutionData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" stroke="none">
                      {resolutionData.map((_, i) => <Cell key={i} fill={RES_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {resolutionData.map((d, i) => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: RES_COLORS[i], flexShrink: 0 }} />
                      <span style={{ color: tk.sub }}>{d.name}</span>
                      <span style={{ fontWeight: 600, color: tk.text }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Pending Approvals */}
          <Card>
            <CardHead title="Pending Approvals" sub="Items requiring your action" />
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {loading ? (
                <p style={{ fontSize: 13, color: tk.sub, textAlign: "center", padding: "8px 0" }}>Loading...</p>
              ) : !showApprovals ? (
                <p style={{ fontSize: 13, color: tk.sub, textAlign: "center", padding: "8px 0" }}>No pending approvals</p>
              ) : (
                pendingApprovals.map((a, i) => (
                  <div
                    key={i}
                    onClick={() => navigate(`/mediator/cases/${a.id}`)}
                    style={{ padding: "12px 14px", borderRadius: 8, background: `${a.color}12`, border: `1px solid ${a.color}30`, display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}
                  >
                    <AlertTriangle size={14} color={a.color} style={{ marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: tk.text }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: tk.sub, marginTop: 2 }}>Case {a.caseId}</div>
                    </div>
                  </div>
                ))
              )}
              <button
                onClick={() => setActiveTab("Applications")}
                style={{ marginTop: 4, padding: "9px", borderRadius: 8, border: `1px solid ${tk.border}`, background: "transparent", fontSize: 13, cursor: "pointer", color: tk.text, fontWeight: 500, width: "100%" }}
              >
                View All
              </button>
            </div>
          </Card>

          {/* Risk Indicators */}
          <Card>
            <CardHead title="Risk Indicators" sub="Cases requiring attention" />
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {RISKS.map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: tk.text }}>{r.label}</span>
                  <span style={{ minWidth: 26, height: 22, borderRadius: 11, background: r.color, color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 7px" }}>
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* AI Performance chart */}
          <Card style={{ padding: "18px 20px" }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: tk.text, marginBottom: 2 }}>AI Performance</div>
            <div style={{ fontSize: 12, color: tk.sub, marginBottom: 14 }}>Weekly accuracy trend</div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={aiPerfData} barSize={20}>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: tk.sub }} axisLine={false} tickLine={false} />
                <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: tk.sub }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="acc" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      {/* Step 4: New Case modal */}
      {showNewCase && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: tk.surface, borderRadius: 14, border: `1px solid ${tk.border}`, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: tk.text, margin: '0 0 4px' }}>
              Create New Case
            </h2>
            <p style={{ fontSize: 13, color: tk.sub, margin: '0 0 24px' }}>
              Invitation links will be generated automatically for both parties.
            </p>

            {/* Title */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: tk.sub, display: 'block', marginBottom: 6 }}>
                CASE TITLE *
              </label>
              <input
                type="text"
                placeholder="e.g. Contract Dispute — Acme vs Beta Corp"
                value={newCaseForm.title}
                onChange={e => setNewCaseForm(p => ({ ...p, title: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${tk.border}`, background: tk.bg, color: tk.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            {/* Brief description */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: tk.sub, display: 'block', marginBottom: 6 }}>
                BRIEF DESCRIPTION
              </label>
              <textarea
                placeholder="Short summary of the dispute (optional)"
                value={newCaseForm.brief_description}
                onChange={e => setNewCaseForm(p => ({ ...p, brief_description: e.target.value }))}
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${tk.border}`, background: tk.bg, color: tk.text, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            {/* Requesting party email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: tk.sub, display: 'block', marginBottom: 6 }}>
                REQUESTING PARTY EMAIL *
              </label>
              <input
                type="email"
                placeholder="party-a@example.com"
                value={newCaseForm.requesting_party_email}
                onChange={e => setNewCaseForm(p => ({ ...p, requesting_party_email: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${tk.border}`, background: tk.bg, color: tk.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            {/* Against party email */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: tk.sub, display: 'block', marginBottom: 6 }}>
                AGAINST PARTY EMAIL
              </label>
              <input
                type="email"
                placeholder="party-b@example.com (optional — can add later)"
                value={newCaseForm.against_party_email}
                onChange={e => setNewCaseForm(p => ({ ...p, against_party_email: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${tk.border}`, background: tk.bg, color: tk.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            {/* Error */}
            {newCaseError && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
                {newCaseError}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowNewCase(false); setNewCaseError(''); }}
                style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${tk.border}`, background: 'transparent', color: tk.text, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCase}
                disabled={newCaseLoading}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#1e40af', color: '#fff', fontSize: 13, cursor: newCaseLoading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: newCaseLoading ? 0.7 : 1 }}
              >
                {newCaseLoading ? 'Creating...' : 'Create Case'}
              </button>
            </div>

          </div>
        </div>
      )}

    </MediatorLayout>
  );
}
const STATUS_DISPLAY = {
  BOTH_INVITED:          "Awaiting Submissions",
  FIRST_PARTY_SUBMITTED: "1 of 2 Submitted",
  BOTH_SUBMITTED:        "Processing",
  BURST_1_PROCESSING:    "AI Running",
  BURST_1_COMPLETE:      "Analysis Ready",
  PROCESSING_FAILED:     "Failed",
  QUESTIONNAIRE_ACTIVE:  "Questionnaire Sent",
  QUESTIONNAIRE_COMPLETE:"Questionnaire Done",
  BURST_2_COMPLETE:      "BATNA Ready",
  PROPOSAL_DRAFT:        "Proposal Draft",
  PROPOSAL_PUBLISHED:    "Proposal Sent",
  MEDIATION_IN_PROGRESS: "In Progress",
  MEDIATION_COMPLETE:    "Resolved",
  MEDIATION_FAILED:      "Failed",
}