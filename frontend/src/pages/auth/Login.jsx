import { useState } from "react";
import { useNavigate } from 'react-router-dom'
import { Scale } from 'lucide-react'

const LoginPage = ({ onLogin }) => {
  const navigate = useNavigate()
  const [role, setRole] = useState("party");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  if (!email || !password) {
    setError("Please fill in all fields.");
    return;
  }
  setLoading(true);
  try {
    const { login } = await import("../../api/auth");
    const role = await login(email, password);
    if (role === "mediator") navigate("/mediator");
    else navigate("/party");
  } catch (err) {
    setError("Invalid credentials. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={styles.page}>
      {/* ── Left panel ── */}
      <div style={styles.left}>
        {/* Subtle grid overlay */}
        <div style={styles.gridOverlay} aria-hidden="true" />

        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
  <Scale size={32} color="white" strokeWidth={1.8} />
</div>
          <span style={styles.logoText}>SULAH</span>
        </div>

        {/* Hero text */}
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Intelligent Dispute<br />Resolution Platform
          </h1>
          <p style={styles.heroSubtitle}>
            Powered by advanced AI to facilitate fair, efficient, and
            transparent mediation processes for all parties involved.
          </p>

          {/* Feature list */}
          <div style={styles.featureList}>
            {[
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                ),
                title: "Secure & Confidential",
                desc: "Enterprise-grade security for sensitive mediation data",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M9 21V9"/>
                  </svg>
                ),
                title: "AI-Powered Analytics",
                desc: "Data-driven insights to reach optimal resolutions",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                ),
                title: "Collaborative Platform",
                desc: "Seamless communication between all parties",
              },
            ].map((f) => (
              <div key={f.title} style={styles.featureItem}>
                <div style={styles.featureIconWrap}>{f.icon}</div>
                <div>
                  <div style={styles.featureTitle}>{f.title}</div>
                  <div style={styles.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={styles.right}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Welcome back</h2>
          <p style={styles.cardSubtitle}>Sign in to access your mediation dashboard</p>

          {/* Role toggle */}
          <div style={styles.toggleWrap} role="group" aria-label="Select user type">
            <button
              type="button"
              onClick={() => setRole("party")}
              style={{
                ...styles.toggleBtn,
                ...(role === "party" ? styles.toggleActive : styles.toggleInactive),
              }}
            >
              Party User
            </button>
            <button
              type="button"
              onClick={() => setRole("mediator")}
              style={{
                ...styles.toggleBtn,
                ...(role === "mediator" ? styles.toggleActive : styles.toggleInactive),
              }}
            >
              Mediator
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div style={styles.fieldGroup}>
              <label htmlFor="email" style={styles.label}>Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="sarah.johnson@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                onFocus={(e) => (e.target.style.borderColor = "#2a3f8f")}
                onBlur={(e) => (e.target.style.borderColor = "#dde1ea")}
              />
            </div>

            {/* Password */}
            <div style={styles.fieldGroup}>
              <div style={styles.labelRow}>
                <label htmlFor="password" style={styles.label}>Password</label>
                <button type="button" style={styles.forgotBtn} onClick={() => navigate('/auth/forgot-password')}>Forgot password?</button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...styles.input, paddingRight: "44px" }}
                  onFocus={(e) => (e.target.style.borderColor = "#2a3f8f")}
                  onBlur={(e) => (e.target.style.borderColor = "#dde1ea")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a94a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a94a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.errorBox} role="alert">
                {error}
              </div>
            )}

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.signInBtn,
                opacity: loading ? 0.75 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => { if (!loading) e.target.style.background = "#1e2f6e"; }}
              onMouseLeave={(e) => { e.target.style.background = "#2a3f8f"; }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div style={styles.dividerRow}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or continue with</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Google button */}
          <button
            type="button"
            style={styles.googleBtn}
            onMouseEnter={(e) => (e.target.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.target.style.background = "#fff")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Sign up link */}
          <p style={styles.signupText}>
            Don't have an account?{" "}
            <button type="button" style={styles.signupLink} onClick={() => navigate('/auth/register')}>Sign up</button>
          </p>
        </div>
      </div>

      {/* Responsive styles injected */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @media (max-width: 768px) {
          .sulah-page { flex-direction: column !important; min-height: auto !important; }
          .sulah-left { display: none !important; }
          .sulah-right {
            width: 100% !important;
            min-height: 100vh !important;
            padding: 2rem 1.25rem !important;
            justify-content: flex-start !important;
            padding-top: 3rem !important;
          }
          .sulah-card {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
        }
        @media (max-width: 480px) {
          .sulah-right { padding: 2rem 1rem !important; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'DM Sans', sans-serif",
  },

  // ── Left ──
  left: {
    flex: "0 0 48%",
    background: "linear-gradient(135deg, #1a2a6c 0%, #2a3f8f 45%, #1e3a5f 100%)",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    padding: "2.5rem 3rem",
    overflow: "hidden",
    className: "sulah-left",
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    position: "relative",
    zIndex: 1,
  },
  // FIND and update in styles object:

logoIcon: {
  width: "56px",        // was 48px
  height: "56px",       // was 48px
  borderRadius: "14px", // was 12px
  background: "rgba(255,255,255,0.15)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(8px)",
},
logoText: {
  fontFamily: "'Sora', sans-serif",
  fontSize: "26px",     // was 22px
  fontWeight: "700",
  color: "#fff",
  letterSpacing: "0.1em",
},
  heroContent: {
    marginTop: "auto",
    marginBottom: "auto",
    position: "relative",
    zIndex: 1,
  },
  heroTitle: {
    fontFamily: "'Sora', sans-serif",
    fontSize: "clamp(28px, 3vw, 40px)",
    fontWeight: "800",
    color: "#fff",
    lineHeight: "1.2",
    margin: "0 0 1.25rem",
  },
  heroSubtitle: {
    fontSize: "15px",
    color: "rgba(255,255,255,0.75)",
    lineHeight: "1.7",
    margin: "0 0 2.5rem",
    maxWidth: "420px",
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  featureItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
  },
  featureIconWrap: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "rgba(255,255,255,0.9)",
  },
  featureTitle: {
    fontFamily: "'Sora', sans-serif",
    fontSize: "14px",
    fontWeight: "600",
    color: "#fff",
    marginBottom: "3px",
  },
  featureDesc: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.6)",
    lineHeight: "1.5",
  },

  // ── Right ──
  right: {
    flex: 1,
    background: "#f7f8fc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    className: "sulah-right",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #eaecf2",
    padding: "2.5rem 2.25rem",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 4px 32px rgba(0,0,0,0.06)",
    className: "sulah-card",
  },
  cardTitle: {
    fontFamily: "'Sora', sans-serif",
    fontSize: "26px",
    fontWeight: "700",
    color: "#0f1c3f",
    margin: "0 0 6px",
  },
  cardSubtitle: {
    fontSize: "14px",
    color: "#8a94a6",
    margin: "0 0 1.75rem",
  },

  // Toggle
  toggleWrap: {
    display: "flex",
    background: "#f1f3f8",
    borderRadius: "10px",
    padding: "4px",
    marginBottom: "1.75rem",
    gap: "4px",
  },
  toggleBtn: {
    flex: 1,
    padding: "10px",
    border: "none",
    borderRadius: "7px",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  toggleActive: {
    background: "#fff",
    color: "#0f1c3f",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
  },
  toggleInactive: {
    background: "transparent",
    color: "#8a94a6",
  },

  // Fields
  fieldGroup: {
    marginBottom: "1.25rem",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "500",
    color: "#3d4a5c",
    marginBottom: "8px",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1.5px solid #dde1ea",
    borderRadius: "9px",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    color: "#0f1c3f",
    outline: "none",
    transition: "border-color 0.15s",
    background: "#fff",
  },
  eyeBtn: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
  },
  forgotBtn: {
    background: "none",
    border: "none",
    fontSize: "13px",
    color: "#2a3f8f",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: "500",
    padding: 0,
  },

  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
    marginBottom: "1rem",
  },

  signInBtn: {
    width: "100%",
    padding: "13px",
    background: "#2a3f8f",
    color: "#fff",
    border: "none",
    borderRadius: "9px",
    fontSize: "15px",
    fontFamily: "'Sora', sans-serif",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.15s",
    marginTop: "0.25rem",
  },

  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "1.5rem 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#eaecf2",
  },
  dividerText: {
    fontSize: "13px",
    color: "#b0b8c9",
    whiteSpace: "nowrap",
  },

  googleBtn: {
    width: "100%",
    padding: "12px",
    background: "#fff",
    border: "1.5px solid #dde1ea",
    borderRadius: "9px",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: "500",
    color: "#3d4a5c",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "background 0.15s",
  },

  signupText: {
    textAlign: "center",
    fontSize: "13px",
    color: "#8a94a6",
    margin: "1.25rem 0 0",
  },
  signupLink: {
    background: "none",
    border: "none",
    color: "#2a3f8f",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "13px",
    padding: 0,
  },
};

export default LoginPage;