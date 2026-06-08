import MediatorLayout from "../../layouts/MediatorLayout";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCases } from "../../api/cases";
import {
  Brain,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
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

/* ─── static data ─────────────────────────────────────────── */
const caseVolumeData = [
  { month: "Jan", cases: 10 },
  { month: "Feb", cases: 15 },
  { month: "Mar", cases: 13 },
  { month: "Apr", cases: 20 },
  { month: "May", cases: 28 },
];
const resolutionData = [
  { name: "Resolved", value: 68 },
  { name: "Pending", value: 6 },
  { name: "Active", value: 22 },
];
const RES_COLORS = ["#1e3a5f", "#3b82f6", "#bfdbfe"];
const aiPerfData = [
  { week: "W1", acc: 82 },
  { week: "W2", acc: 85 },
  { week: "W3", acc: 84 },
  { week: "W4", acc: 88 },
];
const APPROVALS = [
  {
    color: "#f59e0b",
    label: "Proposal approval required",
    caseId: "CASE-2024-003",
  },
  {
    color: "#6366f1",
    label: "Document verification needed",
    caseId: "CASE-2024-001",
  },
  {
    color: "#a855f7",
    label: "Session scheduling required",
    caseId: "CASE-2024-002",
  },
];
const RISKS = [
  { label: "High Risk Cases", count: 3, color: "#ef4444" },
  { label: "Approaching Deadline", count: 5, color: "#f59e0b" },
  { label: "Stalled Negotiations", count: 2, color: "#6b7280" },
];

/* ─── tokens ──────────────────────────────────────────────── */
const tokens = (dark) => ({
  bg: dark ? "#0f172a" : "#f1f5f9",
  surface: dark ? "#1e293b" : "#ffffff",
  border: dark ? "#334155" : "#e2e8f0",
  text: dark ? "#f1f5f9" : "#1e293b",
  sub: dark ? "#94a3b8" : "#64748b",
  accent: "#1e40af",
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

/* ─── TABS ────────────────────────────────────────────────── */
const TABS = ["Applications", "Active Cases", "Closed Cases"];

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [cases, setCases] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Active Cases");
  const width = useWindowWidth();

  const tk = tokens(dark);
  const isNarrow = width < 1024;
  const isSmall = width < 640;

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const data = await getCases();
        setCases(data);
      } catch (err) {
        console.error("Failed to load cases", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  /* ── filter cases by tab ── */
  const CLOSED_STATES = ["MEDIATION_COMPLETE", "MEDIATION_FAILED"];
  const APPLICATION_STATES = [
    "APPLICATION_PENDING",
    "APPLICATION_REJECTED",
    "WITHDRAWN",
  ];

  const filteredCases = cases.filter((c) => {
    if (activeTab === "Applications")
      return APPLICATION_STATES.includes(c.status);
    if (activeTab === "Closed Cases") return CLOSED_STATES.includes(c.status);
    return (
      !APPLICATION_STATES.includes(c.status) &&
      !CLOSED_STATES.includes(c.status)
    );
  });

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
        <div style={{ fontWeight: 600, fontSize: 15, color: tk.text }}>
          {title}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: tk.sub, marginTop: 2 }}>{sub}</div>
        )}
      </div>
      {action}
    </div>
  );

  /* ── Applications tab content ── */
  const ApplicationsTable = () => (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          minWidth: 500,
        }}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${tk.border}` }}>
            {["Case ID", "Dispute Type", "Status", "Filed", "Action"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontWeight: 500,
                    color: tk.sub,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={5}
                style={{ padding: "30px", textAlign: "center", color: tk.sub }}
              >
                Loading applications...
              </td>
            </tr>
          ) : filteredCases.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                style={{ padding: "30px", textAlign: "center", color: tk.sub }}
              >
                No pending applications
              </td>
            </tr>
          ) : (
            filteredCases.map((c, i) => (
              <tr
                key={c.id}
                style={{
                  borderBottom:
                    i < filteredCases.length - 1
                      ? `1px solid ${tk.border}`
                      : "none",
                }}
              >
                <td
                  style={{
                    padding: "14px 16px",
                    fontWeight: 500,
                    color: tk.text,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.id?.slice(0, 8).toUpperCase()}
                </td>
                <td style={{ padding: "14px 16px", color: tk.sub }}>
                  {c.dispute_type || c.brief_description?.slice(0, 30) || "—"}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <Badge
                    label={c.status}
                    color={
                      c.status === "APPLICATION_PENDING"
                        ? "#f59e0b"
                        : c.status === "APPLICATION_REJECTED"
                          ? "#ef4444"
                          : "#64748b"
                    }
                  />
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    color: tk.sub,
                    whiteSpace: "nowrap",
                  }}
                >
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {c.status === "APPLICATION_PENDING" ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => navigate(`/mediator/cases/${c.id}`)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          border: "none",
                          background: "#1e40af",
                          fontSize: 12,
                          cursor: "pointer",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <CheckCircle size={12} /> Accept
                      </button>
                      <button
                        onClick={() => navigate(`/mediator/cases/${c.id}`)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 6,
                          border: `1px solid ${tk.border}`,
                          background: "transparent",
                          fontSize: 12,
                          cursor: "pointer",
                          color: "#ef4444",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate(`/mediator/cases/${c.id}`)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: `1px solid ${tk.border}`,
                        background: "transparent",
                        fontSize: 12,
                        cursor: "pointer",
                        color: tk.text,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
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
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          minWidth: 500,
        }}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${tk.border}` }}>
            {["Case ID", "Parties", "Status", "Created", "Action"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "10px 16px",
                  textAlign: "left",
                  fontWeight: 500,
                  color: tk.sub,
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={5}
                style={{ padding: "30px", textAlign: "center", color: tk.sub }}
              >
                Loading cases...
              </td>
            </tr>
          ) : filteredCases.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                style={{ padding: "30px", textAlign: "center", color: tk.sub }}
              >
                {activeTab === "Closed Cases"
                  ? "No closed cases"
                  : "No cases yet — invite a party to begin"}
              </td>
            </tr>
          ) : (
            filteredCases.map((c, i) => (
              <tr
                key={c.id}
                style={{
                  borderBottom:
                    i < filteredCases.length - 1
                      ? `1px solid ${tk.border}`
                      : "none",
                }}
              >
                <td
                  style={{
                    padding: "14px 16px",
                    fontWeight: 500,
                    color: tk.text,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.id?.slice(0, 8).toUpperCase()}
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    color: tk.sub,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Users size={13} /> 2 parties
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <Badge label={c.status || "pending"} color="#1e3a5f" />
                </td>
                <td
                  style={{
                    padding: "14px 16px",
                    color: tk.sub,
                    whiteSpace: "nowrap",
                  }}
                >
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <button
                    onClick={() => navigate(`/mediator/cases/${c.id}`)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: `1px solid ${tk.border}`,
                      background: "transparent",
                      fontSize: 12,
                      cursor: "pointer",
                      color: tk.text,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      whiteSpace: "nowrap",
                    }}
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

  return (
    <MediatorLayout dark={dark} setDark={setDark}>
      {/* page title */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: isSmall ? 20 : 24,
            fontWeight: 700,
            margin: 0,
            color: tk.text,
          }}
        >
          Mediator Dashboard
        </h1>
        <p style={{ fontSize: 13, color: tk.sub, margin: "4px 0 0" }}>
          Overview of all active cases and system analytics
        </p>
      </div>

      {/* ── stat cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isSmall
            ? "1fr 1fr"
            : "repeat(auto-fit, minmax(175px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Total Cases",
            value: cases
              .filter(
                (c) =>
                  ![
                    "APPLICATION_PENDING",
                    "APPLICATION_REJECTED",
                    "WITHDRAWN",
                  ].includes(c.status),
              )
              .length.toString(),
            sub: "Active cases",
            subC: "#10b981",
            icon: FileText,
            iconBg: "#eff6ff",
          },
          {
            label: "Applications",
            value: cases
              .filter((c) => c.status === "APPLICATION_PENDING")
              .length.toString(),
            sub: "Awaiting review",
            subC: "#f59e0b",
            icon: Clock,
            iconBg: "#fff7ed",
          },
          {
            label: "Resolved",
            value: cases
              .filter((c) => c.status === "MEDIATION_COMPLETE")
              .length.toString(),
            sub: "Completed",
            subC: "#10b981",
            icon: CheckCircle2,
            iconBg: "#f0fdf4",
          },
          {
            label: "AI Accuracy",
            value: "88%",
            sub: "+3% this week",
            subC: "#6366f1",
            icon: Brain,
            iconBg: "#f5f3ff",
          },
        ].map(({ label, value, sub, subC, icon: Icon, iconBg }) => (
          <div
            key={label}
            style={{
              background: tk.surface,
              borderRadius: 12,
              border: `1px solid ${tk.border}`,
              padding: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: tk.sub, marginBottom: 4 }}>
                {label}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: tk.text,
                }}
              >
                {value}
              </div>
              <div style={{ fontSize: 11, color: subC, marginTop: 4 }}>
                {sub}
              </div>
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: dark ? "#0f172a" : iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={18} color={tk.accent} />
            </div>
          </div>
        ))}
      </div>

      {/* ── main grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isNarrow ? "1fr" : "minmax(0,1fr) 300px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* LEFT */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minWidth: 0,
          }}
        >
          {/* ── Tabs + Cases card ── */}
          <Card>
            {/* Tab bar */}
            <div
              style={{
                display: "flex",
                borderBottom: `1px solid ${tk.border}`,
                padding: "0 20px",
                gap: 0,
                overflowX: "auto",
              }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "14px 16px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: activeTab === tab ? 600 : 400,
                    color: activeTab === tab ? tk.accent : tk.sub,
                    borderBottom:
                      activeTab === tab
                        ? `2px solid ${tk.accent}`
                        : "2px solid transparent",
                    whiteSpace: "nowrap",
                    transition: "color .15s",
                  }}
                >
                  {tab}
                  {tab === "Applications" &&
                    cases.filter((c) => c.status === "APPLICATION_PENDING")
                      .length > 0 && (
                      <span
                        style={{
                          marginLeft: 6,
                          padding: "1px 7px",
                          borderRadius: 10,
                          background: "#ef4444",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {
                          cases.filter(
                            (c) => c.status === "APPLICATION_PENDING",
                          ).length
                        }
                      </span>
                    )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === "Applications" ? (
              <ApplicationsTable />
            ) : (
              <CasesTable />
            )}
          </Card>

          {/* Charts row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isSmall
                ? "1fr"
                : "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <Card style={{ padding: "18px 20px" }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: tk.text,
                  marginBottom: 2,
                }}
              >
                Case Volume
              </div>
              <div style={{ fontSize: 12, color: tk.sub, marginBottom: 14 }}>
                Monthly case intake
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={caseVolumeData} barSize={20}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: tk.sub }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: tk.sub }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: tk.surface,
                      border: `1px solid ${tk.border}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    cursor={{ fill: `${tk.accent}18` }}
                  />
                  <Bar dataKey="cases" fill={tk.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card style={{ padding: "18px 20px" }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: tk.text,
                  marginBottom: 2,
                }}
              >
                Resolution Status
              </div>
              <div style={{ fontSize: 12, color: tk.sub, marginBottom: 14 }}>
                Overall case outcomes
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie
                      data={resolutionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={58}
                      dataKey="value"
                      stroke="none"
                    >
                      {resolutionData.map((_, i) => (
                        <Cell key={i} fill={RES_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: tk.surface,
                        border: `1px solid ${tk.border}`,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {resolutionData.map((d, i) => (
                    <div
                      key={d.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: RES_COLORS[i],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: tk.sub }}>{d.name}</span>
                      <span style={{ fontWeight: 600, color: tk.text }}>
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <CardHead
              title="Pending Approvals"
              sub="Items requiring your action"
            />
            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {APPROVALS.map((a, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    background: `${a.color}12`,
                    border: `1px solid ${a.color}30`,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <AlertTriangle
                    size={14}
                    color={a.color}
                    style={{ marginTop: 1, flexShrink: 0 }}
                  />
                  <div>
                    <div
                      style={{ fontSize: 13, fontWeight: 500, color: tk.text }}
                    >
                      {a.label}
                    </div>
                    <div style={{ fontSize: 11, color: tk.sub, marginTop: 2 }}>
                      {a.caseId}
                    </div>
                  </div>
                </div>
              ))}
              <button
                style={{
                  marginTop: 4,
                  padding: "9px",
                  borderRadius: 8,
                  border: `1px solid ${tk.border}`,
                  background: "transparent",
                  fontSize: 13,
                  cursor: "pointer",
                  color: tk.text,
                  fontWeight: 500,
                  width: "100%",
                }}
              >
                View All
              </button>
            </div>
          </Card>

          <Card>
            <CardHead title="Risk Indicators" sub="Cases requiring attention" />
            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {RISKS.map((r) => (
                <div
                  key={r.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 13, color: tk.text }}>
                    {r.label}
                  </span>
                  <span
                    style={{
                      minWidth: 26,
                      height: 22,
                      borderRadius: 11,
                      background: r.color,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 7px",
                    }}
                  >
                    {r.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: "18px 20px" }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 15,
                color: tk.text,
                marginBottom: 2,
              }}
            >
              AI Performance
            </div>
            <div style={{ fontSize: 12, color: tk.sub, marginBottom: 14 }}>
              Weekly accuracy trend
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={aiPerfData} barSize={20}>
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: tk.sub }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[70, 100]}
                  tick={{ fontSize: 10, fill: tk.sub }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: tk.surface,
                    border: `1px solid ${tk.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="acc" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </MediatorLayout>
  );
}
