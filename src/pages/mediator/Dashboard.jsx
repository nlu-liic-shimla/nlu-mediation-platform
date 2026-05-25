"use client";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Brain,
  FileText,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Moon,
  Sun,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Eye,
  Scale,
  MessageSquare,
  X,
  Menu,
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
  { week: "Week 1", acc: 82 },
  { week: "Week 2", acc: 85 },
  { week: "Week 3", acc: 84 },
  { week: "Week 4", acc: 88 },
];

const CASES = [
  {
    id: "CASE-2024-001",
    status: "active",
    sCol: "#1e3a5f",
    priority: "high",
    pCol: "#ef4444",
    due: "2026-05-25",
  },
  {
    id: "CASE-2024-002",
    status: "proposal pending",
    sCol: "#6366f1",
    priority: "medium",
    pCol: "#6366f1",
    due: "2026-05-28",
  },
  {
    id: "CASE-2024-003",
    status: "analysis",
    sCol: "#0ea5e9",
    priority: "high",
    pCol: "#ef4444",
    due: "2026-05-24",
  },
  {
    id: "CASE-2024-004",
    status: "settlement",
    sCol: "#10b981",
    priority: "low",
    pCol: "#6b7280",
    due: "2026-05-30",
  },
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

/* ─── tokens ───────────────────────────────────────────────── */
const tokens = (dark) => ({
  bg: dark ? "#0f172a" : "#f1f5f9",
  surface: dark ? "#1e293b" : "#ffffff",
  border: dark ? "#334155" : "#e2e8f0",
  text: dark ? "#f1f5f9" : "#1e293b",
  sub: dark ? "#94a3b8" : "#64748b",
  inputBg: dark ? "#0f172a" : "#f8fafc",
  accent: "#1e40af",
  hover: dark ? "#334155" : "#f1f5f9",
});

/* ─── Badge ────────────────────────────────────────────────── */
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

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const notifRef = useRef(null);

  const tk = tokens(dark);

  /* detect mobile */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* close sidebar when switching to desktop */
  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  /* close notif on outside click */
  useEffect(() => {
    const h = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const sidebarW = isMobile ? 220 : collapsed ? 64 : 220;

  /* ── sidebar ───────────────────────────────────────────── */
  const Sidebar = () => (
    <>
      {/* overlay */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.45)",
            zIndex: 100,
          }}
        />
      )}

      <aside
        style={{
          width: sidebarW,
          background: tk.surface,
          borderRight: `1px solid ${tk.border}`,
          display: "flex",
          flexDirection: "column",
          padding: "20px 0",
          position: isMobile ? "fixed" : "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 110,
          transform: isMobile
            ? mobileOpen
              ? "translateX(0)"
              : "translateX(-100%)"
            : "translateX(0)",
          transition: "transform .28s ease, width .28s ease",
          overflowX: "hidden",
        }}
      >
        {/* logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: collapsed && !isMobile ? "0 16px" : "0 20px",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: tk.accent,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Scale size={18} color="#fff" />
          </div>
          {(!collapsed || isMobile) && (
            <span
              style={{
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: 1,
                color: tk.accent,
              }}
            >
              SULAH
            </span>
          )}
        </div>

        {/* nav */}
        <nav
          style={{
            flex: 1,
            padding: "0 8px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {[
            { icon: LayoutDashboard, label: "Dashboard", active: true },
            { icon: Brain, label: "AI Analysis", active: false },
            { icon: FileText, label: "Proposals", active: false },
            { icon: Settings2, label: "Admin Panel", active: false },
          ].map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: collapsed && !isMobile ? 0 : 12,
                justifyContent:
                  collapsed && !isMobile ? "center" : "flex-start",
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: active ? `${tk.accent}18` : "transparent",
                color: active ? tk.accent : tk.sub,
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                width: "100%",
                textAlign: "left",
                transition: "background .15s",
              }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {(!collapsed || isMobile) && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* AI assistant chip */}
        {(!collapsed || isMobile) && (
          <div
            style={{
              margin: "0 12px 16px",
              padding: "12px",
              background: dark ? "#0f172a" : "#eff6ff",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: `1px solid ${dark ? "#1e3a5f" : "#bfdbfe"}`,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: tk.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <MessageSquare size={15} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>
                AI Assistant
              </div>
              <div style={{ fontSize: 11, color: tk.sub }}>
                Always here to help
              </div>
            </div>
          </div>
        )}

        {/* collapse button — desktop only */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed((c) => !c)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: tk.sub,
              fontSize: 13,
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </aside>
    </>
  );

  /* ── topbar ─────────────────────────────────────────────── */
  const Topbar = () => (
    <header
      style={{
        background: tk.surface,
        borderBottom: `1px solid ${tk.border}`,
        padding: "0 20px",
        height: 60,
        display: "flex",
        alignItems: "center",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* hamburger — mobile only */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: `1px solid ${tk.border}`,
            background: tk.inputBg,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: tk.sub,
            flexShrink: 0,
          }}
        >
          <Menu size={18} />
        </button>
      )}

      {/* search */}
      <div
        style={{
          flex: 1,
          maxWidth: 420,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: tk.inputBg,
          border: `1px solid ${tk.border}`,
          borderRadius: 8,
          padding: "8px 14px",
        }}
      >
        <Search size={15} color={tk.sub} />
        <input
          placeholder="Search cases, documents, or proposals…"
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 13,
            color: tk.text,
            width: "100%",
            minWidth: 0,
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* theme toggle */}
      <button
        onClick={() => setDark((d) => !d)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          border: `1px solid ${tk.border}`,
          background: tk.inputBg,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: tk.sub,
          flexShrink: 0,
        }}
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* notifications */}
      <div ref={notifRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setNotifOpen((o) => !o)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: `1px solid ${tk.border}`,
            background: tk.inputBg,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: tk.sub,
            position: "relative",
          }}
        >
          <Bell size={16} />
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#ef4444",
              fontSize: 10,
              color: "#fff",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            2
          </span>
        </button>

        {notifOpen && (
          <div
            style={{
              position: "absolute",
              top: 44,
              right: 0,
              width: 290,
              background: tk.surface,
              border: `1px solid ${tk.border}`,
              borderRadius: 10,
              boxShadow: "0 8px 32px rgba(0,0,0,.14)",
              zIndex: 200,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: `1px solid ${tk.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: tk.text }}>
                Notifications
              </span>
              <button
                onClick={() => setNotifOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: tk.sub,
                }}
              >
                <X size={14} />
              </button>
            </div>
            {APPROVALS.map((n, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 16px",
                  borderBottom:
                    i < APPROVALS.length - 1
                      ? `1px solid ${tk.border}`
                      : "none",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: n.color,
                    marginTop: 4,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div
                    style={{ fontSize: 13, fontWeight: 500, color: tk.text }}
                  >
                    {n.label}
                  </div>
                  <div style={{ fontSize: 11, color: tk.sub }}>{n.caseId}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* avatar */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: tk.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          MC
        </div>
        {!isMobile && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: tk.text,
              whiteSpace: "nowrap",
            }}
          >
            Dr. Michael Chen
          </span>
        )}
      </div>
    </header>
  );

  /* ── card wrapper ───────────────────────────────────────── */
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

  /* ── main content ───────────────────────────────────────── */
  const mainMargin = isMobile ? 0 : collapsed ? 64 : 220;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: tk.bg,
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        color: tk.text,
        transition: "background .3s,color .3s",
      }}
    >
      <Sidebar />

      {/* page wrapper shifts right on desktop */}
      <div
        style={{
          marginLeft: mainMargin,
          transition: "margin-left .28s ease",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <Topbar />

        <main
          style={{ padding: isMobile ? "16px 12px" : "24px 24px", flex: 1 }}
        >
          {/* page title */}
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                fontSize: 24,
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
              gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {[
              {
                label: "Total Cases",
                value: "28",
                sub: "+4 this month",
                subC: "#10b981",
                icon: FileText,
                iconBg: "#eff6ff",
              },
              {
                label: "Pending Review",
                value: "6",
                sub: "3 high priority",
                subC: "#f59e0b",
                icon: Clock,
                iconBg: "#fff7ed",
              },
              {
                label: "Resolved",
                value: "68",
                sub: "85% success rate",
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
                  padding: "18px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: tk.sub, marginBottom: 6 }}>
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: tk.text,
                    }}
                  >
                    {value}
                  </div>
                  <div style={{ fontSize: 12, color: subC, marginTop: 6 }}>
                    {sub}
                  </div>
                </div>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: dark ? "#0f172a" : iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} color={tk.accent} />
                </div>
              </div>
            ))}
          </div>

          {/* ── two-column grid ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 300px",
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
              {/* Active Cases table */}
              <Card>
                <CardHead
                  title="Active Cases"
                  sub="All cases requiring attention"
                  action={
                    <button
                      style={{
                        padding: "6px 14px",
                        borderRadius: 7,
                        border: `1px solid ${tk.border}`,
                        background: "transparent",
                        fontSize: 12,
                        cursor: "pointer",
                        color: tk.text,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <SlidersHorizontal size={12} /> Filters
                    </button>
                  }
                />
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${tk.border}` }}>
                        {[
                          "Case ID",
                          "Parties",
                          "Status",
                          "Priority",
                          "Due Date",
                          "Action",
                        ].map((h) => (
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
                      {CASES.map((c, i) => (
                        <tr
                          key={c.id}
                          style={{
                            borderBottom:
                              i < CASES.length - 1
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
                            {c.id}
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              color: tk.sub,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Users size={13} /> 2 parties
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <Badge label={c.status} color={c.sCol} />
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <Badge label={c.priority} color={c.pCol} />
                          </td>
                          <td
                            style={{
                              padding: "14px 16px",
                              color: tk.sub,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {c.due}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <button
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Charts row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                  gap: 16,
                }}
              >
                {/* Case Volume */}
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
                  <div
                    style={{ fontSize: 12, color: tk.sub, marginBottom: 14 }}
                  >
                    Monthly case intake
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={caseVolumeData} barSize={22}>
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
                      <Bar
                        dataKey="cases"
                        fill={tk.accent}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Resolution Status */}
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
                  <div
                    style={{ fontSize: 12, color: tk.sub, marginBottom: 14 }}
                  >
                    Overall case outcomes
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie
                          data={resolutionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={64}
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
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
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
                              width: 12,
                              height: 12,
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
              {/* Pending Approvals */}
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
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: tk.text,
                          }}
                        >
                          {a.label}
                        </div>
                        <div
                          style={{ fontSize: 11, color: tk.sub, marginTop: 2 }}
                        >
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

              {/* Risk Indicators */}
              <Card>
                <CardHead
                  title="Risk Indicators"
                  sub="Cases requiring attention"
                />
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

              {/* AI Performance */}
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
        </main>
      </div>
    </div>
  );
}
