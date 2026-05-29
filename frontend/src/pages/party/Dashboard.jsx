import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import ThemeToggle from '../../components/ui/ThemeToggle'
import {
  Scale, LayoutDashboard, FilePlus, MessageSquare,
  FileText, CheckSquare, Bell, Search, ChevronRight,
  ChevronLeft, Calendar, TrendingUp, Clock, AlertCircle, Bot
} from 'lucide-react'

// Add this at the top of the Dashboard component:
const user = JSON.parse(localStorage.getItem('nlu_user') || '{}')
const userEmail = user.email || 'User'
const userInitials = userEmail.substring(0, 2).toUpperCase()
const userName = userEmail.split('@')[0]  // gets "sakk" from "sakk@gmail.com"

const NAV_ITEMS = [
  { id: 'dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'new-case',      icon: FilePlus,        label: 'New Case' },
  { id: 'questionnaire', icon: MessageSquare,   label: 'Questionnaire' },
  { id: 'proposals',     icon: FileText,        label: 'Proposals' },
  { id: 'settlement',    icon: CheckSquare,     label: 'Settlement' },
]

const Sidebar = ({ active, onNavigate, collapsed, onToggle }) => (
  <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
    <div className="sidebar-logo">
      <div className="sidebar-logo-icon">
        <Scale size={20} color="var(--brand)" strokeWidth={1.8} />
      </div>
      {!collapsed && <span className="sidebar-logo-text">SULAH</span>}
    </div>

    <nav className="sidebar-nav">
      {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            title={collapsed ? label : ''}
            onClick={() => onNavigate(id)}
            className={`nav-btn ${isActive ? 'active' : ''} ${collapsed ? 'centered' : ''}`}
          >
            <Icon size={18} strokeWidth={isActive ? 2 : 1.6} style={{ flexShrink: 0 }} />
            {!collapsed && <span className="nav-label">{label}</span>}
          </button>
        )
      })}
    </nav>

    {!collapsed && (
      <div className="ai-assistant">
        <div className="ai-icon"><Bot size={18} color="var(--brand)" /></div>
        <div>
          <p className="ai-title">AI Assistant</p>
          <p className="ai-sub">Always here to help</p>
        </div>
      </div>
    )}

    <button className="collapse-btn" onClick={onToggle}>
      {collapsed
        ? <ChevronRight size={16} />
        : <><ChevronLeft size={16} /><span>Collapse</span></>
      }
    </button>
  </aside>
)

const StatCard = ({ label, value, sub, subColor, icon, iconBg }) => (
  <div className="stat-card">
    <div className="stat-info">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-sub" style={{ color: subColor || 'var(--text-muted)' }}>{sub}</p>
    </div>
    <div className="stat-icon" style={{ background: iconBg }}>{icon}</div>
  </div>
)

const CaseCard = ({ title, status, caseId, vs, progress, aiScore, nextDate, statusColor, statusBg, onView }) => (
  <div className="case-card">
    <div className="case-top">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="case-title-row">
          <h3 className="case-title">{title}</h3>
          <span className="case-badge" style={{ color: statusColor, background: statusBg }}>{status}</span>
        </div>
        <p className="case-meta">Case ID: {caseId} • vs. {vs}</p>
      </div>
      <div className="ai-score">
        <p className="ai-score-label">AI Score</p>
        <p className="ai-score-value">{aiScore}%</p>
      </div>
    </div>
    <div className="progress-section">
      <div className="progress-row">
        <span className="progress-label">Case Progress</span>
        <span className="progress-pct">{progress}%</span>
      </div>
      <div className="progress-bg">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
    <div className="case-bottom">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Calendar size={13} color="var(--text-muted)" />
        <span className="next-date">Next: {nextDate}</span>
      </div>
      <button className="view-btn" onClick={onView}>View Details</button>
    </div>
  </div>
)

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const [showNotifs, setShowNotifs] = useState(false)

  const cases = [
    { title: 'Contract Dispute Resolution', status: 'in progress', statusColor: '#1a56b0', statusBg: '#dbeafe', caseId: 'CASE-2024-001', vs: 'TechCorp Inc.', progress: 65, aiScore: 78, nextDate: '5/25/2026' },
    { title: 'Property Settlement', status: 'proposal review', statusColor: '#7c3aed', statusBg: '#ede9fe', caseId: 'CASE-2024-002', vs: 'Green Valley LLC', progress: 82, aiScore: 85, nextDate: '5/28/2026' },
  ]

  const notifications = [
    { text: 'New settlement proposal received for CASE-2024-001', time: '2 hours ago' },
    { text: 'Upcoming mediation session on May 25 at 2:00 PM', time: '5 hours ago' },
    { text: 'Document analysis completed', time: '1 day ago' },
  ]

  const activities = [
    { title: 'Settlement Proposal Submitted', desc: 'Mediator submitted revised settlement proposal', date: '5/21/2026' },
    { title: 'Mediation Session #3', desc: 'Virtual session discussing payment terms', date: '5/18/2026' },
    { title: 'Document Analysis Completed', desc: 'AI analysis of all submitted evidence', date: '5/15/2026' },
  ]

  const quickActions = [
    { icon: <FilePlus size={17} />, label: 'Start New Case' },
    { icon: <FileText size={17} />, label: 'Upload Documents' },
    { icon: <Calendar size={17} />, label: 'Schedule Session' },
  ]

  return (
    <div className="dash-page">
      <Sidebar
        active={activeNav}
        onNavigate={setActiveNav}
        collapsed={collapsed}
        onToggle={() => setCollapsed(p => !p)}
      />

      <div className={`dash-main ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
        {/* Topbar */}
        <header className="topbar">
          <div className="search-wrap">
            <Search size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            <input
              className="search-input"
              placeholder="Search cases, documents, or proposals..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <div className="notif-wrap">
              <button className="notif-btn" onClick={() => setShowNotifs(p => !p)}>
                <Bell size={20} color="var(--text-secondary)" />
                <span className="notif-badge">2</span>
              </button>
              {showNotifs && (
                <div className="notif-dropdown">
                  <p className="notif-dropdown-title">Notifications</p>
                  {notifications.map((n, i) => (
                    <div key={i} className="notif-drop-item">
                      <div className="notif-drop-icon"><AlertCircle size={14} color="var(--brand)" /></div>
                      <div>
                        <p className="notif-drop-text">{n.text}</p>
                        <p className="notif-drop-time">{n.time}</p>
                      </div>
                    </div>
                  ))}
                  <button className="notif-view-all">View all notifications</button>
                </div>
              )}
            </div>
            <div className="avatar">{userInitials}</div>
<span className="avatar-name">{userName}</span>
          </div>
        </header>

        {/* Content */}
        <div className="dash-content">
          <div className="dash-inner">
            <div className="page-header">
              <h1 className="page-title">Dashboard</h1>
              <p className="page-sub">Welcome back, {userName}. Here's your case overview.</p>
            </div>

            <div className="dash-layout">
              {/* Left */}
              <div className="left-col">
                <div className="stats-grid">
                  <StatCard label="Active Cases" value="2" sub="+1 this month" subColor="#16a34a" iconBg="#eef1fb" icon={<FileText size={22} color="#2a3f8f" />} />
                  <StatCard label="Pending Proposals" value="3" sub="2 require action" iconBg="#fff7ed" icon={<Clock size={22} color="#ea8c0d" />} />
                  <StatCard label="Completed" value="5" sub="100% success rate" subColor="#16a34a" iconBg="#f0fdf4" icon={<CheckSquare size={22} color="#16a34a" />} />
                  <StatCard label="Avg. Resolution Time" value="45 days" sub="-12 days vs avg" subColor="#dc2626" iconBg="#fdf4ff" icon={<TrendingUp size={22} color="#9333ea" />} />
                </div>

                <div className="section">
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">Active Cases</h2>
                      <p className="section-sub">Track your ongoing mediation cases</p>
                    </div>
                    <button className="new-case-btn">New Case</button>
                  </div>
                  {cases.map(c => (
                    <CaseCard key={c.caseId} {...c} onView={() => navigate(`/party/cases/${c.caseId}`)} />
                  ))}
                </div>
              </div>

              {/* Right */}
              <div className="right-col">
                <div className="side-card">
                  <h2 className="side-title">Recent Notifications</h2>
                  {notifications.map((n, i) => (
                    <div key={i} className="notif-item" style={{ borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div className="notif-icon"><AlertCircle size={14} color="var(--brand)" /></div>
                      <div>
                        <p className="notif-text">{n.text}</p>
                        <p className="notif-time">{n.time}</p>
                      </div>
                    </div>
                  ))}
                  <button className="view-all-btn">View all notifications</button>
                </div>

                <div className="side-card">
                  <h2 className="side-title">Quick Actions</h2>
                  {quickActions.map((a, i) => (
                    <button key={i} className="qa-btn" style={{ marginBottom: i < quickActions.length - 1 ? '8px' : 0 }}>
                      <span style={{ color: 'var(--brand)', display: 'flex' }}>{a.icon}</span>
                      <span className="qa-label">{a.label}</span>
                      <ChevronRight size={15} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                    </button>
                  ))}
                </div>

                <div className="side-card">
                  <h2 className="side-title">Recent Activity</h2>
                  {activities.map((a, i) => (
                    <div key={i} className="activity-item" style={{ borderBottom: i < activities.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div className="activity-dot" />
                      <div>
                        <p className="activity-title">{a.title}</p>
                        <p className="activity-desc">{a.desc}</p>
                        <p className="activity-date">{a.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button className="chat-btn"><MessageSquare size={21} color="white" /></button>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: var(--text-placeholder); }

        /* Page */
        .dash-page { display: flex; min-height: 100vh; background: var(--bg-page); font-family: 'DM Sans', sans-serif; }

        /* Sidebar */
        .sidebar {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: 240px;
          background: var(--bg-card);
          border-right: 1px solid var(--border-card);
          display: flex; flex-direction: column;
          z-index: 50; overflow: hidden;
          transition: width 0.25s ease;
        }
        .sidebar.collapsed { width: 60px; }

        .sidebar-logo {
          display: flex; align-items: center; gap: 10px;
          padding: 14px; min-height: 60px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .sidebar-logo-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: var(--brand-light);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sidebar-logo-text {
          font-family: 'Sora', sans-serif; font-size: 16px;
          font-weight: 700; color: var(--text-primary);
          letter-spacing: 0.08em; white-space: nowrap;
        }

        .sidebar-nav { display: flex; flex-direction: column; gap: 2px; padding: 10px 8px; flex: 1; overflow-y: auto; }
        .nav-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 10px; border-radius: 8px;
          border: none; background: none;
          color: var(--text-muted); cursor: pointer;
          transition: all 0.15s; width: 100%;
          white-space: nowrap; font-family: 'DM Sans', sans-serif;
        }
        .nav-btn.centered { justify-content: center; }
        .nav-btn:hover { background: var(--bg-muted); color: var(--text-primary); }
        .nav-btn.active { background: var(--brand-light); color: var(--brand); }
        .nav-label { font-size: 14px; font-weight: 500; }

        .ai-assistant {
          display: flex; align-items: center; gap: 10px;
          margin: 8px; padding: 12px;
          background: var(--bg-muted); border-radius: 10px; flex-shrink: 0;
        }
        .ai-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--brand-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ai-title { font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .ai-sub { font-size: 11px; color: var(--text-muted); }

        .collapse-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 14px; border: none;
          border-top: 1px solid var(--border);
          background: none; color: var(--text-muted);
          cursor: pointer; font-size: 13px;
          font-family: 'DM Sans', sans-serif; flex-shrink: 0;
          white-space: nowrap;
        }
        .collapse-btn:hover { color: var(--text-primary); }

        /* Main */
        .dash-main {
          flex: 1; display: flex; flex-direction: column;
          min-height: 100vh;
          transition: margin-left 0.25s ease;
        }
        .dash-main.sidebar-expanded { margin-left: 240px; }
        .dash-main.sidebar-collapsed { margin-left: 60px; }

        /* Topbar */
        .topbar {
          height: 60px; background: var(--bg-card);
          border-bottom: 1px solid var(--border-card);
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 0 1.25rem;
          position: sticky; top: 0; z-index: 40;
          gap: 1rem;
        }
        .search-wrap {
          display: flex; align-items: center; gap: 8px;
          background: var(--bg-muted); border: 1px solid var(--border);
          border-radius: 8px; padding: 0 12px;
          flex: 0 1 360px; min-width: 0;
        }
        .search-input {
          border: none; background: none; outline: none;
          font-size: 13px; color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
          width: 100%; padding: 9px 0;
        }
        .topbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

        /* Notification dropdown */
        .notif-wrap { position: relative; }
        .notif-btn {
          position: relative; background: none; border: none;
          cursor: pointer; display: flex; align-items: center;
          padding: 4px;
        }
        .notif-badge {
          position: absolute; top: -2px; right: -2px;
          width: 16px; height: 16px; background: #ef4444;
          color: #fff; border-radius: 50%; font-size: 10px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 600;
        }
        .notif-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          width: 320px; background: var(--bg-card);
          border: 1px solid var(--border-card);
          border-radius: 12px; box-shadow: var(--shadow);
          z-index: 100; overflow: hidden;
        }
        .notif-dropdown-title {
          font-family: 'Sora', sans-serif; font-size: 13px;
          font-weight: 600; color: var(--text-primary);
          padding: 14px 16px 10px; border-bottom: 1px solid var(--border);
        }
        .notif-drop-item {
          display: flex; gap: 10px; padding: 12px 16px;
          border-bottom: 1px solid var(--border);
        }
        .notif-drop-icon {
          width: 28px; height: 28px; border-radius: 6px;
          background: var(--brand-light);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .notif-drop-text { font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 3px; }
        .notif-drop-time { font-size: 11px; color: var(--text-muted); }
        .notif-view-all {
          width: 100%; background: none; border: none;
          padding: 12px; font-size: 13px; color: var(--brand);
          cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 500;
        }

        .avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--brand); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600; flex-shrink: 0;
        }
        .avatar-name { font-size: 13px; font-weight: 500; color: var(--text-primary); white-space: nowrap; }

        /* Content */
        .dash-content { flex: 1; overflow-y: auto; }
        .dash-inner { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }

        .page-header { margin-bottom: 1.5rem; }
        .page-title { font-family: 'Sora', sans-serif; font-size: clamp(20px, 3vw, 26px); font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .page-sub { font-size: 14px; color: var(--text-muted); }

        /* Layout */
        .dash-layout { display: flex; gap: 1.25rem; align-items: flex-start; }
        .left-col { flex: 1; min-width: 0; }
        .right-col { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 1rem; }

        /* Stats grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem; margin-bottom: 1.25rem;
        }
        .stat-card {
          background: var(--bg-card); border-radius: 12px;
          border: 1px solid var(--border-card); padding: 1.1rem;
          display: flex; justify-content: space-between; align-items: flex-start;
          min-width: 0;
        }
        .stat-info { flex: 1; min-width: 0; }
        .stat-label { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .stat-value { font-family: 'Sora', sans-serif; font-size: clamp(16px, 2vw, 22px); font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .stat-sub { font-size: 11px; }
        .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 8px; }

        /* Section */
        .section { background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-card); padding: 1.25rem; }
        .section-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; gap: 1rem; }
        .section-title { font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
        .section-sub { font-size: 13px; color: var(--text-muted); }
        .new-case-btn {
          padding: 8px 16px; background: var(--brand); color: #fff;
          border: none; border-radius: 8px; font-size: 13px;
          font-family: 'Sora', sans-serif; font-weight: 600;
          cursor: pointer; transition: background 0.15s; flex-shrink: 0;
        }
        .new-case-btn:hover { background: var(--brand-hover); }

        /* Case card */
        .case-card { border: 1px solid var(--border); border-radius: 10px; padding: 1rem 1.1rem; margin-bottom: 1rem; }
        .case-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; gap: 1rem; }
        .case-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
        .case-title { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .case-badge { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 99px; white-space: nowrap; }
        .case-meta { font-size: 12px; color: var(--text-muted); }
        .ai-score { text-align: right; flex-shrink: 0; }
        .ai-score-label { font-size: 11px; color: var(--text-muted); margin-bottom: 2px; }
        .ai-score-value { font-family: 'Sora', sans-serif; font-size: clamp(18px, 2vw, 22px); font-weight: 700; color: var(--brand); }
        .progress-section { margin-bottom: 1rem; }
        .progress-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .progress-label { font-size: 12px; color: var(--text-muted); }
        .progress-pct { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
        .progress-bg { height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--brand); border-radius: 99px; transition: width 0.3s; }
        .case-bottom { display: flex; justify-content: space-between; align-items: center; }
        .next-date { font-size: 12px; color: var(--text-muted); }
        .view-btn { padding: 7px 14px; background: none; border: 1px solid var(--border); border-radius: 7px; font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: border-color 0.15s; }
        .view-btn:hover { border-color: var(--brand); color: var(--brand); }

        /* Side cards */
        .side-card { background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-card); padding: 1.1rem; }
        .side-title { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; }

        .notif-item { display: flex; gap: 10px; padding: 10px 0; }
        .notif-icon { width: 28px; height: 28px; border-radius: 6px; background: var(--brand-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .notif-text { font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 3px; }
        .notif-time { font-size: 11px; color: var(--text-muted); }
        .view-all-btn { width: 100%; background: none; border: none; padding: 10px 0 0; font-size: 13px; color: var(--text-muted); cursor: pointer; text-align: center; font-family: 'DM Sans', sans-serif; }
        .view-all-btn:hover { color: var(--brand); }

        .qa-btn { width: 100%; display: flex; align-items: center; gap: 10px; padding: 11px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 9px; cursor: pointer; transition: background 0.15s; font-family: 'DM Sans', sans-serif; }
        .qa-btn:hover { background: var(--bg-hover); }
        .qa-label { font-size: 13px; font-weight: 500; color: var(--text-primary); }

        .activity-item { display: flex; gap: 12px; padding: 12px 0; }
        .activity-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--brand); flex-shrink: 0; margin-top: 4px; }
        .activity-title { font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 2px; }
        .activity-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 3px; line-height: 1.4; }
        .activity-date { font-size: 11px; color: var(--text-placeholder); }

        /* Chat button */
        .chat-btn { position: fixed; bottom: 1.5rem; right: 1.5rem; width: 50px; height: 50px; border-radius: 50%; background: var(--brand); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 16px rgba(42,63,143,0.35); z-index: 100; }
        .chat-btn:hover { background: var(--brand-hover); }

        /* ── Responsive ── */
        /* ── Responsive ── */
@media (max-width: 1200px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .right-col { width: 260px; }
}

@media (max-width: 900px) {
  .dash-layout { flex-direction: column; }
  .right-col { width: 100%; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .sidebar { width: 60px !important; }
  .dash-main { margin-left: 60px !important; }
  .sidebar-logo-text, .nav-label, .ai-assistant, .collapse-btn span { display: none; }
  .nav-btn { justify-content: center; }
  .collapse-btn { justify-content: center; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
  .stat-card { padding: 0.85rem; }
  .stat-value { font-size: 18px; }
  .stat-icon { width: 34px; height: 34px; }
  .stat-icon svg { width: 18px; height: 18px; }
  .avatar-name { display: none; }
  .search-wrap { flex: 1; min-width: 0; }
  .topbar { padding: 0 0.75rem; gap: 0.5rem; }
  .dash-inner { padding: 1rem 0.75rem; }
  .notif-dropdown { right: -80px; width: 260px; }
  .case-title { font-size: 13px; }
  .new-case-btn { padding: 7px 12px; font-size: 12px; }
}

@media (max-width: 480px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .stat-label { font-size: 10px; }
  .stat-value { font-size: 16px; }
}

@media (max-width: 360px) {
  .stats-grid { grid-template-columns: 1fr; }
}
      `}</style>
    </div>
  )
}