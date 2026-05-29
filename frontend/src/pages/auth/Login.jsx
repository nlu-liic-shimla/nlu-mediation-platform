import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Scale } from "lucide-react";
import { login } from "../../api/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("party");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    try {
      const actualRole = await login(email, password);
      if (role === "party" && actualRole === "mediator") {
        localStorage.removeItem("nlu_token");
        localStorage.removeItem("nlu_role");
        localStorage.removeItem("nlu_user");
        setError("These credentials belong to a Mediator account. Please use the Mediator login.");
        setLoading(false); return;
      }
      if (role === "mediator" && actualRole !== "mediator") {
        localStorage.removeItem("nlu_token");
        localStorage.removeItem("nlu_role");
        localStorage.removeItem("nlu_user");
        setError("These credentials belong to a Party account. Please use the Party User login.");
        setLoading(false); return;
      }
      if (actualRole === "mediator") navigate("/mediator");
      else navigate("/party");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-page {
          display: flex;
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          background: var(--bg-page);
        }

        /* ── Left panel ── */
        .login-left {
          flex: 0 0 48%;
          background: linear-gradient(135deg, #1a2a6c 0%, #2a3f8f 45%, #1e3a5f 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 2.5rem 3rem;
          overflow: hidden;
        }
        .login-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .login-logo {
          display: flex; align-items: center; gap: 12px;
          position: relative; z-index: 1;
        }
        .login-logo-icon {
          width: 56px; height: 56px; border-radius: 14px;
          background: rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(8px);
        }
        .login-logo-text {
          font-family: 'Sora', sans-serif;
          font-size: 26px; font-weight: 700;
          color: #fff; letter-spacing: 0.1em;
        }
        .login-hero {
          margin-top: auto; margin-bottom: auto;
          position: relative; z-index: 1;
        }
        .login-hero-title {
          font-family: 'Sora', sans-serif;
          font-size: clamp(26px, 3vw, 38px);
          font-weight: 800; color: #fff;
          line-height: 1.2; margin-bottom: 1.25rem;
        }
        .login-hero-sub {
          font-size: 15px; color: rgba(255,255,255,0.75);
          line-height: 1.7; margin-bottom: 2.5rem; max-width: 420px;
        }
        .login-features { display: flex; flex-direction: column; gap: 20px; }
        .login-feature { display: flex; align-items: flex-start; gap: 16px; }
        .login-feature-icon {
          width: 44px; height: 44px; border-radius: 10px;
          background: rgba(255,255,255,0.12);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: rgba(255,255,255,0.9);
        }
        .login-feature-title {
          font-family: 'Sora', sans-serif;
          font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 3px;
        }
        .login-feature-desc { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.5; }

        /* ── Right panel ── */
        .login-right {
          flex: 1;
          background: var(--bg-page);
          display: flex; align-items: center; justify-content: center;
          padding: 2rem;
        }
        .login-card {
          background: var(--bg-card);
          border-radius: 16px;
          border: 1px solid var(--border-card);
          padding: 2.5rem 2.25rem;
          width: 100%; max-width: 420px;
          box-shadow: var(--shadow);
        }
        .login-card-title {
          font-family: 'Sora', sans-serif;
          font-size: 26px; font-weight: 700;
          color: var(--text-primary); margin-bottom: 6px;
        }
        .login-card-sub { font-size: 14px; color: var(--text-muted); margin-bottom: 1.75rem; }

        /* Toggle */
        .login-toggle {
          display: flex; background: var(--bg-muted);
          border-radius: 10px; padding: 4px;
          margin-bottom: 1.75rem; gap: 4px;
        }
        .login-toggle-btn {
          flex: 1; padding: 10px; border: none; border-radius: 7px;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          font-weight: 500; cursor: pointer; transition: all 0.2s ease;
        }
        .login-toggle-btn.active {
          background: var(--bg-card); color: var(--text-primary);
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }
        .login-toggle-btn.inactive { background: transparent; color: var(--text-muted); }

        /* Fields */
        .login-field { margin-bottom: 1.25rem; }
        .login-label {
          display: block; font-size: 13px; font-weight: 500;
          color: var(--text-secondary); margin-bottom: 8px;
        }
        .login-label-row {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 8px;
        }
        .login-input {
          width: 100%; padding: 12px 14px;
          border: 1.5px solid var(--border); border-radius: 9px;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          color: var(--text-primary); background: var(--bg-input);
          outline: none; transition: border-color 0.15s;
        }
        .login-input:focus { border-color: var(--brand); }
        .login-pw-wrap { position: relative; }
        .login-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          padding: 4px; display: flex; align-items: center;
        }
        .login-forgot {
          background: none; border: none; font-size: 13px;
          color: var(--brand); cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-weight: 500; padding: 0;
        }
        .login-error {
          background: var(--error-bg); border: 1px solid var(--error-border);
          color: var(--error); border-radius: 8px;
          padding: 10px 14px; font-size: 13px; margin-bottom: 1rem;
        }
        .login-submit {
          width: 100%; padding: 13px;
          background: var(--brand); color: #fff;
          border: none; border-radius: 9px;
          font-size: 15px; font-family: 'Sora', sans-serif; font-weight: 600;
          cursor: pointer; transition: background 0.15s; margin-top: 0.25rem;
        }
        .login-submit:hover:not(:disabled) { background: var(--brand-hover); }
        .login-submit:disabled { opacity: 0.75; cursor: not-allowed; }

        .login-divider { display: flex; align-items: center; gap: 12px; margin: 1.5rem 0; }
        .login-divider-line { flex: 1; height: 1px; background: var(--border); }
        .login-divider-text { font-size: 13px; color: var(--text-placeholder); white-space: nowrap; }

        .login-google {
          width: 100%; padding: 12px;
          background: var(--bg-card); border: 1.5px solid var(--border);
          border-radius: 9px; font-size: 14px;
          font-family: 'DM Sans', sans-serif; font-weight: 500;
          color: var(--text-secondary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 10px; transition: background 0.15s;
        }
        .login-google:hover { background: var(--bg-muted); }

        .login-signup { text-align: center; font-size: 13px; color: var(--text-muted); margin: 1.25rem 0 0; }
        .login-signup-link {
          background: none; border: none; color: var(--brand);
          font-weight: 600; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 0;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .login-left { display: none !important; }
          .login-right {
            width: 100%; min-height: 100vh;
            padding: 2.5rem 1.25rem;
            align-items: flex-start;
            padding-top: 3rem;
          }
          .login-card {
            box-shadow: none; border: none;
            padding: 0; max-width: 100%;
          }
        }
        @media (max-width: 480px) {
          .login-right { padding: 2rem 1rem; }
        }
      `}</style>

      <div className="login-page">
        {/* Left */}
        <div className="login-left">
          <div className="login-grid" aria-hidden="true" />
          <div className="login-logo">
            <div className="login-logo-icon">
              <Scale size={32} color="white" strokeWidth={1.8} />
            </div>
            <span className="login-logo-text">SULAH</span>
          </div>
          <div className="login-hero">
            <h1 className="login-hero-title">Intelligent Dispute<br />Resolution Platform</h1>
            <p className="login-hero-sub">
              Powered by advanced AI to facilitate fair, efficient, and transparent mediation processes for all parties involved.
            </p>
            <div className="login-features">
              {[
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title: "Secure & Confidential", desc: "Enterprise-grade security for sensitive mediation data" },
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>, title: "AI-Powered Analytics", desc: "Data-driven insights to reach optimal resolutions" },
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, title: "Collaborative Platform", desc: "Seamless communication between all parties" },
              ].map(f => (
                <div key={f.title} className="login-feature">
                  <div className="login-feature-icon">{f.icon}</div>
                  <div>
                    <div className="login-feature-title">{f.title}</div>
                    <div className="login-feature-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="login-right">
          <div className="login-card">
            <h2 className="login-card-title">Welcome back</h2>
            <p className="login-card-sub">Sign in to access your mediation dashboard</p>

            <div className="login-toggle" role="group">
              <button className={`login-toggle-btn ${role === "party" ? "active" : "inactive"}`} onClick={() => setRole("party")}>Party User</button>
              <button className={`login-toggle-btn ${role === "mediator" ? "active" : "inactive"}`} onClick={() => setRole("mediator")}>Mediator</button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="login-field">
                <label className="login-label">Email</label>
                <input className="login-input" type="email" autoComplete="email" placeholder="sarah.johnson@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div className="login-field">
                <div className="login-label-row">
                  <label className="login-label" style={{margin:0}}>Password</label>
                  <button type="button" className="login-forgot" onClick={() => navigate('/auth/forgot-password')}>Forgot password?</button>
                </div>
                <div className="login-pw-wrap">
                  <input className="login-input" style={{paddingRight:'44px'}} type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" className="login-eye" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {error && <div className="login-error" role="alert">{error}</div>}

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="login-divider">
              <div className="login-divider-line" />
              <span className="login-divider-text">or continue with</span>
              <div className="login-divider-line" />
            </div>

            <button type="button" className="login-google">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <p className="login-signup">
              Don't have an account?{" "}
              <button type="button" className="login-signup-link" onClick={() => navigate('/auth/register')}>Sign up</button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}