import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import ThemeToggle from '../../components/ui/ThemeToggle'
import { Scale, LayoutDashboard, FilePlus, MessageSquare, FileText, CheckSquare, Bell, Search, ChevronRight, ChevronLeft, Calendar, TrendingUp, Clock, AlertCircle, Bot } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'new-case',     icon: FilePlus,        label: 'New Case' },
  { id: 'questionnaire',icon: MessageSquare,   label: 'Questionnaire' },
  { id: 'proposals',    icon: FileText,        label: 'Proposals' },
  { id: 'settlement',   icon: CheckSquare,     label: 'Settlement' },
]

// ── Sidebar ──
const Sidebar = ({ active, onNavigate, collapsed, onToggle }) => (
  <aside style={{ ...s.sidebar, width: collapsed ? '60px' : '240px' }}>
    {/* Logo */}
    <div style={s.sidebarLogoRow}>
      <div style={s.sidebarLogoIcon}>
        <Scale size={20} color="var(--brand)" strokeWidth={1.8} />
      </div>
      {!collapsed && <span style={s.sidebarLogoText}>SULAH</span>}
    </div>

    {/* Nav */}
    <nav style={s.sidebarNav}>
      {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            title={collapsed ? label : ''}
            onClick={() => onNavigate(id)}
            style={{
              ...s.navBtn,
              justifyContent: collapsed ? 'center' : 'flex-start',
              ...(isActive ? s.navBtnActive : {}),
            }}
          >
            <Icon size={18} strokeWidth={isActive ? 2 : 1.6} style={{ flexShrink: 0 }} />
            {!collapsed && <span style={s.navLabel}>{label}</span>}
          </button>
        )
      })}
    </nav>

    {/* AI Assistant */}
    {!collapsed && (
      <div style={s.aiAssistant}>
        <div style={s.aiIcon}><Bot size={18} color="var(--brand)" /></div>
        <div>
          <p style={s.aiTitle}>AI Assistant</p>
          <p style={s.aiSubtitle}>Always here to help</p>
        </div>
      </div>
    )}

    {/* Collapse toggle */}
    <button
      onClick={onToggle}
      style={s.collapseBtn}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed
        ? <ChevronRight size={16} />
        : <><ChevronLeft size={16} /><span style={s.collapseLabel}>Collapse</span></>
      }
    </button>
  </aside>
)

// ── Stat card ──
const StatCard = ({ label, value, sub, subColor, icon, iconBg }) => (
  <div style={s.statCard}>
    <div>
      <p style={s.statLabel}>{label}</p>
      <p style={s.statValue}>{value}</p>
      <p style={{ ...s.statSub, color: subColor || 'var(--text-muted)' }}>{sub}</p>
    </div>
    <div style={{ ...s.statIconWrap, background: iconBg }}>{icon}</div>
  </div>
)

// ── Case card ──
const CaseCard = ({ title, status, caseId, vs, progress, aiScore, nextDate, statusColor, statusBg, onView }) => (
  <div style={s.caseCard}>
    <div style={s.caseTop}>
      <div style={{ flex: 1 }}>
        <div style={s.caseTitleRow}>
          <h3 style={s.caseTitle}>{title}</h3>
          <span style={{ ...s.badge, color: statusColor, background: statusBg }}>{status}</span>
        </div>
        <p style={s.caseMeta}>Case ID: {caseId} • vs. {vs}</p>
      </div>
      <div style={s.aiScore}>
        <p style={s.aiScoreLabel}>AI Score</p>
        <p style={s.aiScoreValue}>{aiScore}%</p>
      </div>
    </div>
    <div style={s.progressSection}>
      <div style={s.progressRow}>
        <span style={s.progressLabel}>Case Progress</span>
        <span style={s.progressPct}>{progress}%</span>
      </div>
      <div style={s.progressBg}>
        <div style={{ ...s.progressFill, width: `${progress}%` }} />
      </div>
    </div>
    <div style={s.caseBottom}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Calendar size={13} color="var(--text-muted)" />
        <span style={s.nextDate}>Next: {nextDate}</span>
      </div>
      <button style={s.viewBtn} onClick={onView}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
        View Details
      </button>
    </div>
  </div>
)

// ── Main ──
export default function Dashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')

  const sidebarWidth = collapsed ? 60 : 240

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
    <div style={s.page}>
      <Sidebar
        active={activeNav}
        onNavigate={setActiveNav}
        collapsed={collapsed}
        onToggle={() => setCollapsed(p => !p)}
      />

      {/* Main area shifts with sidebar */}
      <div style={{ ...s.main, marginLeft: `${sidebarWidth}px`, transition: 'margin-left 0.25s ease' }}>

        {/* Topbar */}
        <header style={s.topbar}>
          <div style={s.searchWrap}>
            <Search size={15} color="var(--text-muted)" />
            <input
              placeholder="Search cases, documents, or proposals..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={s.searchInput}
            />
          </div>
          <div style={s.topRight}>
            <ThemeToggle />
            <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Bell size={20} color="var(--text-secondary)" />
              <span style={s.badge2}>2</span>
            </div>
            <div style={s.avatar}>SJ</div>
            <span style={s.avatarName}>Sarah Johnson</span>
          </div>
        </header>

        {/* Page content */}
        <div style={s.content}>
          <div style={s.inner}>

            <div style={s.pageHeader}>
              <h1 style={s.pageTitle}>Dashboard</h1>
              <p style={s.pageSub}>Welcome back, Sarah. Here's your case overview.</p>
            </div>

            <div style={s.layout}>
              {/* Left */}
              <div style={s.leftCol}>
                {/* Stats */}
                <div style={s.statsGrid}>
                  <StatCard label="Active Cases" value="2" sub="+1 this month" subColor="#16a34a" iconBg="#eef1fb" icon={<FileText size={22} color="#2a3f8f" />} />
                  <StatCard label="Pending Proposals" value="3" sub="2 require action" iconBg="#fff7ed" icon={<Clock size={22} color="#ea8c0d" />} />
                  <StatCard label="Completed" value="5" sub="100% success rate" subColor="#16a34a" iconBg="#f0fdf4" icon={<CheckSquare size={22} color="#16a34a" />} />
                  <StatCard label="Avg. Resolution Time" value="45 days" sub="-12 days vs avg" subColor="#dc2626" iconBg="#fdf4ff" icon={<TrendingUp size={22} color="#9333ea" />} />
                </div>

                {/* Cases section */}
                <div style={s.section}>
                  <div style={s.sectionHead}>
                    <div>
                      <h2 style={s.sectionTitle}>Active Cases</h2>
                      <p style={s.sectionSub}>Track your ongoing mediation cases</p>
                    </div>
                    <button style={s.newCaseBtn}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}>
                      New Case
                    </button>
                  </div>
                  {cases.map(c => (
                    <CaseCard key={c.caseId} {...c} onView={() => navigate(`/party/cases/${c.caseId}`)} />
                  ))}
                </div>
              </div>

              {/* Right */}
              <div style={s.rightCol}>
                {/* Notifications */}
                <div style={s.sideCard}>
                  <h2 style={s.sideTitle}>Recent Notifications</h2>
                  {notifications.map((n, i) => (
                    <div key={i} style={{ ...s.notifItem, borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={s.notifIcon}><AlertCircle size={15} color="var(--brand)" /></div>
                      <div>
                        <p style={s.notifText}>{n.text}</p>
                        <p style={s.notifTime}>{n.time}</p>
                      </div>
                    </div>
                  ))}
                  <button style={s.viewAllBtn}>View all notifications</button>
                </div>

                {/* Quick actions */}
                <div style={s.sideCard}>
                  <h2 style={s.sideTitle}>Quick Actions</h2>
                  {quickActions.map((a, i) => (
                    <button key={i} style={{ ...s.qaBtn, marginBottom: i < quickActions.length - 1 ? '8px' : 0 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}>
                      <span style={{ color: 'var(--brand)', display: 'flex' }}>{a.icon}</span>
                      <span style={s.qaLabel}>{a.label}</span>
                      <ChevronRight size={15} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                    </button>
                  ))}
                </div>

                {/* Activity */}
                <div style={s.sideCard}>
                  <h2 style={s.sideTitle}>Recent Activity</h2>
                  {activities.map((a, i) => (
                    <div key={i} style={{ ...s.activityItem, borderBottom: i < activities.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={s.activityDot} />
                      <div>
                        <p style={s.activityTitle}>{a.title}</p>
                        <p style={s.activityDesc}>{a.desc}</p>
                        <p style={s.activityDate}>{a.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating chat */}
      <button style={s.chatBtn}>
        <MessageSquare size={21} color="white" />
      </button>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: var(--text-placeholder); }
        @media (max-width: 1024px) {
          .dash-stats { grid-template-columns: repeat(2,1fr) !important; }
          .dash-right { width: 280px !important; }
        }
        @media (max-width: 768px) {
          .dash-layout { flex-direction: column !important; }
          .dash-right { width: 100% !important; }
          .dash-stats { grid-template-columns: repeat(2,1fr) !important; }
          .avatar-name { display: none !important; }
        }
      `}</style>
    </div>
  )
}

const s = {
  page: { display: 'flex', minHeight: '100vh', background: 'var(--bg-page)', fontFamily: "'DM Sans', sans-serif" },

  // Sidebar
  sidebar: {
    position: 'fixed', top: 0, left: 0, bottom: 0,
    background: 'var(--bg-card)',
    borderRight: '1px solid var(--border-card)',
    display: 'flex', flexDirection: 'column',
    zIndex: 50, overflow: 'hidden',
    transition: 'width 0.25s ease',
  },
  sidebarLogoRow: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '16px 14px', borderBottom: '1px solid var(--border)',
    flexShrink: 0, minHeight: '60px',
  },
  sidebarLogoIcon: {
    width: '32px', height: '32px', borderRadius: '8px',
    background: 'var(--brand-light)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  sidebarLogoText: {
    fontFamily: "'Sora', sans-serif", fontSize: '16px',
    fontWeight: '700', color: 'var(--text-primary)',
    letterSpacing: '0.08em', whiteSpace: 'nowrap',
  },
  sidebarNav: { display: 'flex', flexDirection: 'column', gap: '2px', padding: '12px 8px', flex: 1, overflowY: 'auto' },
  navBtn: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 10px', borderRadius: '8px',
    border: 'none', background: 'none',
    color: 'var(--text-muted)', cursor: 'pointer',
    transition: 'all 0.15s', width: '100%', whiteSpace: 'nowrap',
  },
  navBtnActive: { background: 'var(--brand-light)', color: 'var(--brand)' },
  navLabel: { fontSize: '14px', fontWeight: '500' },

  aiAssistant: {
    display: 'flex', alignItems: 'center', gap: '10px',
    margin: '8px', padding: '12px',
    background: 'var(--bg-muted)', borderRadius: '10px',
    flexShrink: 0,
  },
  aiIcon: {
    width: '32px', height: '32px', borderRadius: '8px',
    background: 'var(--brand-light)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  aiTitle: { fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' },
  aiSubtitle: { fontSize: '11px', color: 'var(--text-muted)' },

  collapseBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '12px 14px', border: 'none',
    borderTop: '1px solid var(--border)',
    background: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', fontSize: '13px',
    fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  collapseLabel: { fontSize: '13px' },

  // Main
  main: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' },

  topbar: {
    height: '60px', background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border-card)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem', position: 'sticky', top: 0, zIndex: 40, gap: '1rem',
  },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'var(--bg-muted)', border: '1px solid var(--border)',
    borderRadius: '8px', padding: '0 12px',
    flex: '0 1 380px',
  },
  searchInput: {
    border: 'none', background: 'none', outline: 'none',
    fontSize: '13px', color: 'var(--text-primary)',
    fontFamily: "'DM Sans', sans-serif",
    width: '100%', padding: '9px 0',
  },
  topRight: { display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 },
  badge2: {
    position: 'absolute', top: '-6px', right: '-6px',
    width: '16px', height: '16px', background: '#ef4444',
    color: '#fff', borderRadius: '50%', fontSize: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600',
  },
  avatar: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: 'var(--brand)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: '600', flexShrink: 0,
  },
  avatarName: { fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap' },

  content: { flex: 1, overflowY: 'auto' },
  inner: { padding: '1.75rem 1.5rem', maxWidth: '1400px', margin: '0 auto' },

  pageHeader: { marginBottom: '1.5rem' },
  pageTitle: { fontFamily: "'Sora', sans-serif", fontSize: '26px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' },
  pageSub: { fontSize: '14px', color: 'var(--text-muted)' },

  layout: { display: 'flex', gap: '1.5rem', alignItems: 'flex-start' },
  leftCol: { flex: 1, minWidth: 0 },
  rightCol: { width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' },
  statCard: {
    background: 'var(--bg-card)', borderRadius: '12px',
    border: '1px solid var(--border-card)', padding: '1.25rem',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  statLabel: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' },
  statValue: { fontFamily: "'Sora', sans-serif", fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' },
  statSub: { fontSize: '12px' },
  statIconWrap: { width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  section: { background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-card)', padding: '1.25rem' },
  sectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' },
  sectionTitle: { fontFamily: "'Sora', sans-serif", fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' },
  sectionSub: { fontSize: '13px', color: 'var(--text-muted)' },
  newCaseBtn: {
    padding: '8px 18px', background: 'var(--brand)', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px',
    fontFamily: "'Sora', sans-serif", fontWeight: '600',
    cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0,
  },

  caseCard: { border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1rem' },
  caseTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
  caseTitleRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' },
  caseTitle: { fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' },
  badge: { fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '99px' },
  caseMeta: { fontSize: '12px', color: 'var(--text-muted)' },
  aiScore: { textAlign: 'right', flexShrink: 0, marginLeft: '1rem' },
  aiScoreLabel: { fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' },
  aiScoreValue: { fontFamily: "'Sora', sans-serif", fontSize: '22px', fontWeight: '700', color: 'var(--brand)' },
  progressSection: { marginBottom: '1rem' },
  progressRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  progressLabel: { fontSize: '12px', color: 'var(--text-muted)' },
  progressPct: { fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' },
  progressBg: { height: '6px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'var(--brand)', borderRadius: '99px', transition: 'width 0.3s' },
  caseBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  nextDate: { fontSize: '12px', color: 'var(--text-muted)' },
  viewBtn: {
    padding: '7px 14px', background: 'none',
    border: '1px solid var(--border)', borderRadius: '7px',
    fontSize: '12px', fontWeight: '500',
    color: 'var(--text-secondary)', cursor: 'pointer', transition: 'border-color 0.15s',
  },

  sideCard: { background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-card)', padding: '1.25rem' },
  sideTitle: { fontFamily: "'Sora', sans-serif", fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '1rem' },

  notifItem: { display: 'flex', gap: '10px', padding: '10px 0' },
  notifIcon: { width: '30px', height: '30px', borderRadius: '8px', background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifText: { fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '3px' },
  notifTime: { fontSize: '11px', color: 'var(--text-muted)' },
  viewAllBtn: { width: '100%', background: 'none', border: 'none', padding: '10px 0 0', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'center' },

  qaBtn: { width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '9px', cursor: 'pointer', transition: 'background 0.15s' },
  qaLabel: { fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' },

  activityItem: { display: 'flex', gap: '12px', padding: '12px 0' },
  activityDot: { width: '10px', height: '10px', borderRadius: '50%', background: 'var(--brand)', flexShrink: 0, marginTop: '4px' },
  activityTitle: { fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' },
  activityDesc: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px', lineHeight: '1.4' },
  activityDate: { fontSize: '11px', color: 'var(--text-placeholder)' },

  chatBtn: {
    position: 'fixed', bottom: '1.5rem', right: '1.5rem',
    width: '50px', height: '50px', borderRadius: '50%',
    background: 'var(--brand)', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 4px 16px rgba(42,63,143,0.35)', zIndex: 100,
  },
}