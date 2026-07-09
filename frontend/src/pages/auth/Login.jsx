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
      const isPartyRole = ["party_user", "requesting_party", "against_party"].includes(actualRole);
      if (role === "party" && !isPartyRole) {
        localStorage.removeItem("nlu_token");
        localStorage.removeItem("nlu_role");
        localStorage.removeItem("nlu_user");
        setError("These credentials belong to a Mediator account. Please use the Mediator login.");
        setLoading(false); return;
      }
      if (role === "mediator" && isPartyRole) {
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
        html, body, #root { height: 100%; }

        .lp { display: flex; min-height: 100vh; font-family: 'DM Sans', sans-serif; background: var(--bg-page); }

        .lp-left {
          flex: 0 0 48%;
          background: linear-gradient(135deg, #1a2a6c 0%, #2a3f8f 45%, #1e3a5f 100%);
          position: relative; display: flex; flex-direction: column;
          padding: 2.5rem 3rem; overflow: hidden;
        }
        .lp-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .lp-logo { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
        .lp-logo-icon { width: 56px; height: 56px; border-radius: 14px; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
        .lp-logo-text { font-family: 'Sora', sans-serif; font-size: 26px; font-weight: 700; color: #fff; letter-spacing: 0.1em; }
        .lp-hero { margin: auto 0; position: relative; z-index: 1; }
        .lp-hero h1 { font-family: 'Sora', sans-serif; font-size: clamp(26px, 3vw, 38px); font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: 1.25rem; }
        .lp-hero p { font-size: 15px; color: rgba(255,255,255,0.75); line-height: 1.7; margin-bottom: 2.5rem; max-width: 420px; }
        .lp-features { display: flex; flex-direction: column; gap: 20px; }
        .lp-feature { display: flex; align-items: flex-start; gap: 16px; }
        .lp-feature-icon { width: 44px; height: 44px; border-radius: 10px; background: rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: rgba(255,255,255,0.9); }
        .lp-feature-title { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600; color: #fff; margin-bottom: 3px; }
        .lp-feature-desc { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.5; }

        .lp-right { flex: 1; background: var(--bg-page); display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .lp-card { background: var(--bg-card); border-radius: 20px; border: 1px solid var(--border-card); padding: 2.5rem 2.25rem; width: 100%; max-width: 440px; box-shadow: var(--shadow); }
        .lp-title { font-family: 'Sora', sans-serif; font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
        .lp-sub { font-size: 14px; color: var(--text-muted); margin-bottom: 2rem; line-height: 1.5; }

        .lp-toggle { display: flex; background: var(--bg-muted); border-radius: 12px; padding: 4px; margin-bottom: 1.75rem; gap: 4px; }
        .lp-toggle-btn { flex: 1; padding: 11px; border: none; border-radius: 9px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; cursor: pointer; transition: all 0.2s ease; }
        .lp-toggle-btn.active { background: var(--bg-card); color: var(--text-primary); box-shadow: 0 1px 6px rgba(0,0,0,0.12); }
        .lp-toggle-btn.inactive { background: transparent; color: var(--text-muted); }

        .lp-field { margin-bottom: 1.25rem; }
        .lp-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 8px; }
        .lp-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .lp-input { width: 100%; padding: 13px 15px; border: 1.5px solid var(--border); border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif; color: var(--text-primary); background: var(--bg-input); outline: none; transition: border-color 0.15s; }
        .lp-input:focus { border-color: var(--brand); }
        .lp-pw { position: relative; }
        .lp-pw .lp-input { padding-right: 46px; }
        .lp-eye { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; color: var(--text-muted); }
        .lp-forgot { background: none; border: none; font-size: 13px; color: var(--brand); cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 500; padding: 0; }
        .lp-forgot:hover { text-decoration: underline; }

        .lp-error { background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error); border-radius: 10px; padding: 11px 14px; font-size: 13px; margin-bottom: 1rem; line-height: 1.5; }

        .lp-btn { width: 100%; padding: 14px; background: var(--brand); color: #fff; border: none; border-radius: 11px; font-size: 15px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; transition: background 0.15s; margin-top: 0.25rem; letter-spacing: 0.01em; }
        .lp-btn:hover:not(:disabled) { background: var(--brand-hover); }
        .lp-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .lp-divider { display: flex; align-items: center; gap: 12px; margin: 1.5rem 0; }
        .lp-divider-line { flex: 1; height: 1px; background: var(--border); }
        .lp-divider-text { font-size: 13px; color: var(--text-muted); white-space: nowrap; }

        .lp-google { width: 100%; padding: 13px; background: var(--bg-card); border: 1.5px solid var(--border); border-radius: 11px; font-size: 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: background 0.15s; }
        .lp-google:hover { background: var(--bg-muted); }

        .lp-signup { text-align: center; font-size: 14px; color: var(--text-muted); margin-top: 1.5rem; }
        .lp-signup-link { background: none; border: none; color: var(--brand); font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 0; }
        .lp-signup-link:hover { text-decoration: underline; }

        .lp-mobile-logo { display: none; align-items: center; justify-content: center; gap: 10px; margin-bottom: 2rem; }
        .lp-mobile-logo-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--brand-light); display: flex; align-items: center; justify-content: center; }
        .lp-mobile-logo-text { font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.08em; }

        @media (max-width: 768px) {
          .lp-mobile-logo { display: flex; }
          .lp-left { display: none; }
          .lp-right { width: 100%; min-height: 100vh; padding: 0; align-items: stretch; }
          .lp-card { border-radius: 0; border: none; box-shadow: none; padding: 3rem 1.5rem 2rem; max-width: 100%; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
        }
        @media (max-width: 480px) {
          .lp-card { padding: 2.5rem 1.25rem; }
          .lp-title { font-size: 24px; }
        }
      `}</style>

      <div className="lp">
        {/* Left */}
        <div className="lp-left">
          <div className="lp-grid" aria-hidden="true" />
          <div className="lp-logo">
            <div className="lp-logo-icon"><Scale size={32} color="white" strokeWidth={1.8} /></div>
            <span className="lp-logo-text">SULAH</span>
          </div>
          <div className="lp-hero">
            <h1>Intelligent Dispute<br />Resolution Platform</h1>
            <p>Powered by advanced AI to facilitate fair, efficient, and transparent mediation processes for all parties involved.</p>
            <div className="lp-features">
              {[
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title: "Secure & Confidential", desc: "Enterprise-grade security for sensitive mediation data" },
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>, title: "AI-Powered Analytics", desc: "Data-driven insights to reach optimal resolutions" },
                { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, title: "Collaborative Platform", desc: "Seamless communication between all parties" },
              ].map(f => (
                <div key={f.title} className="lp-feature">
                  <div className="lp-feature-icon">{f.icon}</div>
                  <div>
                    <div className="lp-feature-title">{f.title}</div>
                    <div className="lp-feature-desc">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="lp-right">
          <div className="lp-card">
            {/* Mobile only logo */}
            <div className="lp-mobile-logo">
              <div className="lp-mobile-logo-icon">
                <Scale size={26} color="var(--brand)" strokeWidth={1.8} />
              </div>
              <span className="lp-mobile-logo-text">SULAH</span>
            </div>
            <h2 className="lp-title">Welcome back</h2>
            <p className="lp-sub">Sign in to access your mediation dashboard</p>

            <div className="lp-toggle" role="group">
              <button className={`lp-toggle-btn ${role === "party" ? "active" : "inactive"}`} onClick={() => setRole("party")}>Party User</button>
              <button className={`lp-toggle-btn ${role === "mediator" ? "active" : "inactive"}`} onClick={() => setRole("mediator")}>Mediator</button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="lp-field">
                <label className="lp-label">Email</label>
                <input className="lp-input" type="email" autoComplete="email" placeholder="sarah.johnson@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div className="lp-field">
                <div className="lp-label-row">
                  <label className="lp-label" style={{margin:0}}>Password</label>
                  <button type="button" className="lp-forgot" onClick={() => navigate('/auth/forgot-password')}>Forgot password?</button>
                </div>
                <div className="lp-pw">
                  <input className="lp-input" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" className="lp-eye" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {error && <div className="lp-error" role="alert">{error}</div>}

              <button type="submit" className="lp-btn" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div className="lp-divider">
              <div className="lp-divider-line" />
              <span className="lp-divider-text">or continue with</span>
              <div className="lp-divider-line" />
            </div>

            <button type="button" className="lp-google">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <p className="lp-signup">
              Don't have an account?{" "}
              <button type="button" className="lp-signup-link" onClick={() => navigate('/auth/register')}>Sign up</button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}