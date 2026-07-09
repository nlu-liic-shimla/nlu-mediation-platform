import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
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
  MessageSquare,
  Scale,
  X,
  Menu,
} from "lucide-react";

const tokens = (dark) => ({
  bg: dark ? "#0f172a" : "#f1f5f9",
  surface: dark ? "#1e293b" : "#ffffff",
  border: dark ? "#334155" : "#e2e8f0",
  text: dark ? "#f1f5f9" : "#1e293b",
  sub: dark ? "#94a3b8" : "#64748b",
  inputBg: dark ? "#0f172a" : "#f8fafc",
  accent: "#1e40af",
});

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/mediator" },
  { icon: Brain, label: "AI Analysis", path: "/mediator/analysis" },
  { icon: FileText, label: "Proposals", path: "/mediator/proposals" },
  { icon: Settings2, label: "Admin Panel", path: "/mediator/admin" },
];

export default function MediatorLayout({ children }) {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("nlu_user") || "{}");
  const tk = tokens(isDark);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  useEffect(() => {
    const h = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setNotifOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("nlu_token");
    localStorage.removeItem("nlu_role");
    localStorage.removeItem("nlu_user");
    navigate("/auth/login");
  };

  const sidebarW = isMobile ? 220 : collapsed ? 64 : 220;
  const mainMargin = isMobile ? 0 : collapsed ? 64 : 220;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: tk.bg,
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        color: tk.text,
        transition: "background .3s, color .3s",
      }}
    >
      {/* ── Sidebar ── */}
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
          position: "fixed",
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
        {/* Logo */}
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

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            padding: "0 8px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
            const active =
              location.pathname === path ||
              (path === "/mediator/analysis" &&
                location.pathname.includes("/cases/"));
            return (
              <button
                key={label}
                onClick={() => {
                  navigate(path);
                  setMobileOpen(false);
                }}
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
            );
          })}
        </nav>

        {/* AI Assistant chip */}
        {(!collapsed || isMobile) && (
          <div
            style={{
              margin: "0 12px 16px",
              padding: "12px",
              background: isDark ? "#0f172a" : "#eff6ff",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: `1px solid ${isDark ? "#1e3a5f" : "#bfdbfe"}`,
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

        {/* Collapse button */}
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

      {/* ── Main ── */}
      <div
        style={{
          marginLeft: mainMargin,
          transition: "margin-left .28s ease",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        {/* Topbar */}
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

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
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
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Notifications */}
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
                  position: "fixed",
                  top: 64,
                  right: 12,
                  width: "min(290px, calc(100vw - 24px))",
                  background: tk.surface,
                  border: `1px solid ${tk.border}`,
                  borderRadius: 10,
                  boxShadow: "0 8px 32px rgba(0,0,0,.14)",
                  zIndex: 9999,
                  overflow: "visible",
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
                  <span
                    style={{ fontWeight: 600, fontSize: 14, color: tk.text }}
                  >
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
                <div
                  style={{ padding: "12px 16px", fontSize: 13, color: tk.sub }}
                >
                  No new notifications
                </div>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
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
              {user?.email?.slice(0, 2).toUpperCase() || "MC"}
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
                {user?.email || "Mediator"}
              </span>
            )}
            <button
              onClick={handleLogout}
              style={{
                fontSize: 12,
                color: tk.sub,
                background: "none",
                border: `1px solid ${tk.border}`,
                borderRadius: 7,
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ padding: isMobile ? "16px 12px" : "24px", flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
