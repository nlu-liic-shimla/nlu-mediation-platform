import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../../components/ui/ThemeToggle'
import client from '../../services/api'
import AnalysisStatusBanner from '../../components/party/AnalysisStatusBanner'
import {
  Scale, LayoutDashboard, FilePlus, 
  FileText, CheckSquare, Bell, ChevronRight,
  ChevronLeft, Calendar, TrendingUp, Clock, AlertCircle,
  LogOut, Menu, X,  DollarSign
} from 'lucide-react'

const PARTY_STATUS_LABELS = {
  BOTH_INVITED: 'Waiting for both parties',
  FIRST_PARTY_SUBMITTED: 'Waiting for other party',
  BOTH_SUBMITTED: 'Processing',
  BURST_1_PROCESSING: 'Analyzing your case',
  BURST_1_COMPLETE: 'Analysis complete',
  PROCESSING_FAILED: 'Analysis delayed',
  QUESTIONNAIRE_ACTIVE: 'Questionnaire pending',
  QUESTIONNAIRE_COMPLETE: 'Reviewing responses',
  BURST_2_PROCESSING: 'Preparing your case summary',
  BURST_2_COMPLETE: 'Case summary ready',
  PROPOSAL_DRAFT: 'Mediator preparing proposal',
  PROPOSAL_PUBLISHED: 'Proposal ready for review',
  MEDIATION_IN_PROGRESS: 'Negotiation ongoing',
  MEDIATION_COMPLETE: 'Settlement reached',
  MEDIATION_FAILED: 'Mediation unsuccessful',
}
const friendlyStatus = (status) => PARTY_STATUS_LABELS[status] || 'In progress'

const NAV_ITEMS = [
  { id: 'dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'new-case',      icon: FilePlus,        label: 'New Case' },
]

const Sidebar = ({ active, onNavigate, collapsed, onToggle, onSignOut, isMobile, mobileOpen, onMobileClose, visibleIds }) => (
  <>
    {/* Mobile overlay */}
    {isMobile && mobileOpen && (
      <div className="pd-overlay" onClick={onMobileClose} />
    )}

    <aside className={`pd-sidebar ${collapsed && !isMobile ? 'collapsed' : ''} ${isMobile ? (mobileOpen ? 'mobile-open' : 'mobile-closed') : ''}`}>
      <div className="pd-sidebar-logo">
        <div className="pd-logo-icon">
          <Scale size={20} color="var(--brand)" strokeWidth={1.8} />
        </div>
        {(!collapsed || isMobile) && <span className="pd-logo-text">SULAH</span>}
        {isMobile && (
          <button className="pd-mobile-close" onClick={onMobileClose}>
            <X size={18} />
          </button>
        )}
      </div>

       <nav className="pd-sidebar-nav">
        {NAV_ITEMS.filter(item => !visibleIds || visibleIds.has(item.id)).map(({ id, icon: Icon, label }) => {
          const isActive = active === id
          
          return (
            <button
              key={id}
              title={collapsed && !isMobile ? label : ''}
              onClick={() => { onNavigate(id); if (isMobile) onMobileClose() }}
              className={`pd-nav-btn ${isActive ? 'active' : ''} ${collapsed && !isMobile ? 'centered' : ''}`}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.6} style={{ flexShrink: 0 }} />
              {(!collapsed || isMobile) && <span className="pd-nav-label">{label}</span>}
            </button>
          )
        })}
      </nav>

      {!isMobile && (
        <button className="pd-collapse-btn" onClick={onToggle}>
          {collapsed
            ? <ChevronRight size={16} />
            : <><ChevronLeft size={16} /><span>Collapse</span></>
          }
        </button>
      )}

      {isMobile && (
        <button className="pd-signout-sidebar" onClick={onSignOut}>
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      )}
    </aside>
  </>
)

const StatCard = ({ label, value, sub, subColor, icon, iconBg }) => (
  <div className="pd-stat-card">
    <div className="pd-stat-info">
      <p className="pd-stat-label">{label}</p>
      <p className="pd-stat-value">{value}</p>
      <p className="pd-stat-sub" style={{ color: subColor || 'var(--text-muted)' }}>{sub}</p>
    </div>
    <div className="pd-stat-icon" style={{ background: iconBg }}>{icon}</div>
  </div>
)

const CaseCard = ({ title, status, rawStatus, caseId, displayId, vs, progress, nextDate, statusColor, statusBg, onView, docCount  }) => (
  <div className="pd-case-card">
    <div className="pd-case-top">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pd-case-title-row">
          <h3 className="pd-case-title">{title}</h3>
          <span className="pd-case-badge" style={{ color: statusColor, background: statusBg }}>{status}</span>
        </div>
        <p className="pd-case-meta">Case ID: {displayId || caseId} • vs. {vs}</p>
      </div>
      
    </div>
    

    {/* ← ADD HERE */}
     {['BOTH_SUBMITTED', 'BURST_1_PROCESSING', 'BURST_1_COMPLETE', 'PROCESSING_FAILED'].includes(rawStatus) && (
    <AnalysisStatusBanner caseId={caseId} />
     )}

    <div className="pd-progress-section">
      <div className="pd-progress-row">
        <span className="pd-progress-label">Case Progress</span>
        <span className="pd-progress-pct">{progress}%</span>
      </div>
      <div className="pd-progress-bg">
        <div className="pd-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
    <div className="pd-case-bottom">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Calendar size={13} color="var(--text-muted)" />
        <span className="pd-next-date">Next: {nextDate}</span>
      </div>
      <button className="pd-view-btn" onClick={onView}>View Details</button>
    </div>
  </div>
)

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [mobileOpen, setMobileOpen] = useState(false)

  const [docCounts, setDocCounts] = useState({})

  const user = JSON.parse(localStorage.getItem('nlu_user') || '{}')
const userEmail = user.email || 'User'
const userName = user.full_name || userEmail.split('@')[0]
const userInitials = userName.substring(0, 2).toUpperCase()
 

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const handleSignOut = () => {
    localStorage.removeItem('nlu_token')
    localStorage.removeItem('nlu_role')
    localStorage.removeItem('nlu_user')
    navigate('/auth/login')
  }

  const sidebarWidth = isMobile ? 0 : (collapsed ? 60 : 240)

  
const [cases, setCases] = useState([])
const [applications, setApplications] = useState([])

useEffect(() => {
  client.get('/cases').then(res => {
    const data = res.data
    const arr = Array.isArray(data) ? data : data.cases || data.data || []
    setCases(arr)
  }).catch(() => setCases([]))

  client.get('/cases/applications/my').then(res => {
    setApplications(res.data?.applications || [])
  }).catch(() => setApplications([]))
}, [])
const activeCase = cases[0]

const activeCasesList = cases.filter(
  c => !['MEDIATION_COMPLETE', 'MEDIATION_FAILED'].includes(c.status)
)
const closedCasesList = cases.filter(
  c => ['MEDIATION_COMPLETE', 'MEDIATION_FAILED'].includes(c.status)
)

const totalMonetaryValue = cases
  .filter(c => !['MEDIATION_COMPLETE', 'MEDIATION_FAILED'].includes(c.status))
  .reduce((sum, c) => sum + (Number(c.monetary_value) || 0), 0)



  useEffect(() => {
  activeCasesList.forEach(c => {
    client.get(`/cases/${c.id}/documents`).then(res => {
      const docs = Array.isArray(res.data) ? res.data : res.data?.documents ?? []
      setDocCounts(prev => ({ ...prev, [c.id]: docs.length }))
    }).catch(() => {})
  })
}, [cases])


  const quickActions = [
    { icon: <FilePlus size={17} />, label: 'Apply for Mediation', path: '/party/apply' },
  ]


 

 
 

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: var(--text-placeholder); }

        .pd-page { display: flex; min-height: 100vh; background: var(--bg-page); font-family: 'DM Sans', sans-serif; }

        /* ── Overlay ── */
        .pd-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 49; }

        /* ── Sidebar ── */
        .pd-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: 240px; background: var(--bg-card);
          border-right: 1px solid var(--border-card);
          display: flex; flex-direction: column;
          z-index: 50; overflow: hidden;
          transition: width 0.25s ease, transform 0.25s ease;
        }
        .pd-sidebar.collapsed { width: 60px; }
        .pd-sidebar.mobile-closed { transform: translateX(-100%); width: 240px; }
        .pd-sidebar.mobile-open { transform: translateX(0); width: 240px; }

        .pd-sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 14px; min-height: 60px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .pd-logo-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--brand-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pd-logo-text { font-family: 'Sora', sans-serif; font-size: 16px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.08em; white-space: nowrap; flex: 1; }
        .pd-mobile-close { background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; align-items: center; padding: 4px; }

        .pd-sidebar-nav { display: flex; flex-direction: column; gap: 2px; padding: 10px 8px; flex: 1; overflow-y: auto; }
        .pd-nav-btn { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; border: none; background: none; color: var(--text-muted); cursor: pointer; transition: all 0.15s; width: 100%; white-space: nowrap; font-family: 'DM Sans', sans-serif; }
        .pd-nav-btn.centered { justify-content: center; }
        .pd-nav-btn:hover { background: var(--bg-muted); color: var(--text-primary); }
        .pd-nav-btn.active { background: var(--brand-light); color: var(--brand); }
        .pd-nav-label { font-size: 14px; font-weight: 500; }

       

        .pd-collapse-btn { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border: none; border-top: 1px solid var(--border); background: none; color: var(--text-muted); cursor: pointer; font-size: 13px; font-family: 'DM Sans', sans-serif; flex-shrink: 0; white-space: nowrap; }
        .pd-collapse-btn:hover { color: var(--text-primary); }

        .pd-signout-sidebar { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border: none; border-top: 1px solid var(--border); background: none; color: var(--text-muted); cursor: pointer; font-size: 13px; font-family: 'DM Sans', sans-serif; flex-shrink: 0; width: 100%; }
        .pd-signout-sidebar:hover { color: #ef4444; }

        /* ── Main ── */
        .pd-main { flex: 1; display: flex; flex-direction: column; min-height: 100vh; transition: margin-left 0.25s ease; }

        /* ── Topbar ── */
        .pd-topbar { height: 60px; background: var(--bg-card); border-bottom: 1px solid var(--border-card); display: flex; align-items: center; justify-content: space-between; padding: 0 1.25rem; position: sticky; top: 0; z-index: 40; gap: 1rem; }
        .pd-hamburger { background: none; border: none; cursor: pointer; color: var(--text-secondary); display: none; align-items: center; padding: 4px; }
        .pd-topbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

        .pd-notif-wrap { position: relative; }
        .pd-notif-btn { position: relative; background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 4px; }
        .pd-notif-badge { position: absolute; top: -2px; right: -2px; width: 16px; height: 16px; background: #ef4444; color: #fff; border-radius: 50%; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: 600; }
        .pd-notif-dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: 300px; background: var(--bg-card); border: 1px solid var(--border-card); border-radius: 12px; box-shadow: var(--shadow); z-index: 100; overflow: hidden; }
        .pd-notif-title { font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600; color: var(--text-primary); padding: 14px 16px 10px; border-bottom: 1px solid var(--border); }
        .pd-notif-item-drop { display: flex; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--border); }
        .pd-notif-drop-icon { width: 28px; height: 28px; border-radius: 6px; background: var(--brand-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pd-notif-drop-text { font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 3px; }
        .pd-notif-drop-time { font-size: 11px; color: var(--text-muted); }
        .pd-notif-view-all { width: 100%; background: none; border: none; padding: 12px; font-size: 13px; color: var(--brand); cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 500; }

        .pd-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0; }
        .pd-avatar-name { font-size: 13px; font-weight: 500; color: var(--text-primary); white-space: nowrap; }
        .pd-signout-btn { display: flex; align-items: center; gap: 6px; background: none; border: 1px solid var(--border); border-radius: 8px; padding: 7px 12px; font-size: 13px; font-family: 'DM Sans', sans-serif; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; white-space: nowrap; }
        .pd-signout-btn:hover { border-color: #ef4444; color: #ef4444; }

        /* ── Content ── */
        .pd-content { flex: 1; overflow-y: auto; }
        .pd-inner { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
        .pd-page-header { margin-bottom: 1.5rem; }
        .pd-page-title { font-family: 'Sora', sans-serif; font-size: clamp(20px, 3vw, 26px); font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .pd-page-sub { font-size: 14px; color: var(--text-muted); }

        .pd-layout { display: flex; gap: 1.25rem; align-items: flex-start; }
        .pd-left-col { flex: 1; min-width: 0; }
        .pd-right-col { width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 1rem; }

        /* Stats */
        .pd-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.25rem; }
        .pd-stat-card { background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-card); padding: 1.1rem; display: flex; justify-content: space-between; align-items: flex-start; min-width: 0; }
        .pd-stat-info { flex: 1; min-width: 0; }
        .pd-stat-label { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pd-stat-value { font-family: 'Sora', sans-serif; font-size: clamp(16px, 2vw, 22px); font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .pd-stat-sub { font-size: 11px; }
        .pd-stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 8px; }

        /* Section */
        .pd-section { background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-card); padding: 1.25rem; }
        .pd-section-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; gap: 1rem; }
        .pd-section-title { font-family: 'Sora', sans-serif; font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
        .pd-section-sub { font-size: 13px; color: var(--text-muted); }
        .pd-new-case-btn { padding: 8px 16px; background: var(--brand); color: #fff; border: none; border-radius: 8px; font-size: 13px; font-family: 'Sora', sans-serif; font-weight: 600; cursor: pointer; transition: background 0.15s; flex-shrink: 0; }
        .pd-new-case-btn:hover { background: var(--brand-hover); }

        /* Case card */
        .pd-case-card { border: 1px solid var(--border); border-radius: 10px; padding: 1rem 1.1rem; margin-bottom: 1rem; }
        .pd-case-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; gap: 1rem; }
        .pd-case-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
        .pd-case-title { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .pd-case-badge { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 99px; white-space: nowrap; }
        .pd-case-meta { font-size: 12px; color: var(--text-muted); }
        .pd-ai-score { text-align: right; flex-shrink: 0; }
        .pd-ai-score-label { font-size: 11px; color: var(--text-muted); margin-bottom: 2px; }
        .pd-ai-score-value { font-family: 'Sora', sans-serif; font-size: clamp(18px, 2vw, 22px); font-weight: 700; color: var(--brand); }
        .pd-progress-section { margin-bottom: 1rem; }
        .pd-progress-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .pd-progress-label { font-size: 12px; color: var(--text-muted); }
        .pd-progress-pct { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
        .pd-progress-bg { height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; }
        .pd-progress-fill { height: 100%; background: var(--brand); border-radius: 99px; transition: width 0.3s; }
        .pd-case-bottom { display: flex; justify-content: space-between; align-items: center; }
        .pd-next-date { font-size: 12px; color: var(--text-muted); }
        .pd-view-btn { padding: 7px 14px; background: none; border: 1px solid var(--border); border-radius: 7px; font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: border-color 0.15s; }
        .pd-view-btn:hover { border-color: var(--brand); color: var(--brand); }

        /* Side cards */
        .pd-side-card { background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-card); padding: 1.1rem; }
        .pd-side-title { font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem; }
        .pd-notif-item { display: flex; gap: 10px; padding: 10px 0; }
        .pd-notif-icon { width: 28px; height: 28px; border-radius: 6px; background: var(--brand-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pd-notif-text { font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 3px; }
        .pd-notif-time { font-size: 11px; color: var(--text-muted); }
        .pd-view-all { width: 100%; background: none; border: none; padding: 10px 0 0; font-size: 13px; color: var(--text-muted); cursor: pointer; text-align: center; font-family: 'DM Sans', sans-serif; }
        .pd-view-all:hover { color: var(--brand); }
        .pd-qa-btn { width: 100%; display: flex; align-items: center; gap: 10px; padding: 11px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 9px; cursor: pointer; transition: background 0.15s; font-family: 'DM Sans', sans-serif; }
        .pd-qa-btn:hover { background: var(--bg-hover); }
        .pd-qa-label { font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .pd-activity-item { display: flex; gap: 12px; padding: 12px 0; }
        .pd-activity-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--brand); flex-shrink: 0; margin-top: 4px; }
        .pd-activity-title { font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 2px; }
        .pd-activity-desc { font-size: 12px; color: var(--text-muted); margin-bottom: 3px; line-height: 1.4; }
        .pd-activity-date { font-size: 11px; color: var(--text-placeholder); }

        .pd-chat-btn { position: fixed; bottom: 1.5rem; right: 1.5rem; width: 50px; height: 50px; border-radius: 50%; background: var(--brand); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 16px rgba(42,63,143,0.35); z-index: 100; }
        .pd-chat-btn:hover { background: var(--brand-hover); }

        /* ── Responsive ── */
        @media (max-width: 1200px) {
          .pd-stats-grid { grid-template-columns: repeat(2, 1fr); }
          .pd-right-col { width: 260px; }
        }
        @media (max-width: 900px) {
          .pd-layout { flex-direction: column; }
          .pd-right-col { width: 100%; }
        }
        @media (max-width: 768px) {
          .pd-sidebar { transform: translateX(-100%); }
          .pd-main { margin-left: 0 !important; }
          .pd-hamburger { display: flex !important; }
          .pd-avatar-name { display: none; }
          .pd-signout-btn span { display: none; }
          .pd-signout-btn { padding: 7px; }
          
          .pd-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
          .pd-notif-dropdown { right: -60px; width: 270px; }
        }
        @media (max-width: 480px) {
          .pd-inner { padding: 1rem 0.75rem; }
          .pd-topbar { padding: 0 0.75rem; gap: 0.5rem; }
          .pd-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
          .pd-stat-card { padding: 0.85rem; }
          .pd-stat-value { font-size: 16px; }
          .pd-stat-icon { width: 34px; height: 34px; }
        }
        @media (max-width: 360px) {
          .pd-stats-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="pd-page">
        <Sidebar
  active={activeNav}
 onNavigate={(id) => {
    setActiveNav(id)
    if (id === 'new-case') { navigate('/party/apply'); return }
  }}
  collapsed={collapsed}
  onToggle={() => setCollapsed(p => !p)}
  onSignOut={handleSignOut}
  isMobile={isMobile}
  mobileOpen={mobileOpen}
  onMobileClose={() => setMobileOpen(false)}
/>

        <div className="pd-main" style={{ marginLeft: isMobile ? 0 : (collapsed ? 60 : 240), transition: 'margin-left 0.25s ease' }}>
          {/* Topbar */}
          <header className="pd-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <button className="pd-hamburger" onClick={() => setMobileOpen(true)}>
                <Menu size={22} color="var(--text-secondary)" />
              </button>
              
            </div>
            <div className="pd-topbar-right">
              <ThemeToggle />
             
              <div className="pd-avatar">{userInitials}</div>
              <span className="pd-avatar-name">{userName}</span>
              <button className="pd-signout-btn" onClick={handleSignOut}>
                <LogOut size={15} />
                <span>Sign out</span>
              </button>
            </div>
          </header>

          {/* Content */}
          <div className="pd-content">
            <div className="pd-inner">
              <div className="pd-page-header">
                <h1 className="pd-page-title">Dashboard</h1>
                <p className="pd-page-sub">Welcome back, {userName}. Here's your case overview.</p>
              </div>
              {activeCase && (
  ['QUESTIONNAIRE_ACTIVE', 'PROPOSAL_PUBLISHED'].includes(activeCase.status) ||
  (activeCase.status === 'MEDIATION_COMPLETE' && activeCase.finalised_at)
) && ( <div style={{
    padding: '14px 18px',
    borderRadius: 10,
    background: 'var(--brand-light)',
    border: '1.5px solid var(--brand)',
    marginBottom: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  }}>
    <span style={{ fontSize: 14, color: 'var(--brand)', fontWeight: 500 }}>
      {activeCase.status === 'QUESTIONNAIRE_ACTIVE' && 'Action needed: Answer your questionnaire'}
      {activeCase.status === 'PROPOSAL_PUBLISHED' && 'Action needed: Review the mediator\'s proposal'}
      {activeCase.status === 'MEDIATION_COMPLETE' && 'Action needed: Confirm your settlement'}
    </span>
    <button
      onClick={() => {
        if (activeCase.status === 'QUESTIONNAIRE_ACTIVE') navigate(`/party/cases/${activeCase.id}/questionnaire`)
        if (activeCase.status === 'PROPOSAL_PUBLISHED') navigate(`/party/cases/${activeCase.id}/proposal`)
        if (activeCase.status === 'MEDIATION_COMPLETE') navigate(`/party/cases/${activeCase.id}/settlement`)
      }}
      style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
    >
      Take Action →
    </button>
  </div>
)}

              <div className="pd-layout">
                <div className="pd-left-col">
                  <div className="pd-stats-grid">
                    <StatCard label="Active Cases" value={cases.filter(c => !['MEDIATION_COMPLETE','MEDIATION_FAILED'].includes(c.status)).length} sub={cases.length > 0 ? 'Your ongoing cases' : 'No cases yet'} subColor="#16a34a" iconBg="#eef1fb" icon={<FileText size={22} color="#2a3f8f" />} />
<StatCard label="Pending Proposals" value={cases.filter(c => c.status === 'PROPOSAL_PUBLISHED').length} sub="Awaiting your response" iconBg="#fff7ed" icon={<Clock size={22} color="#ea8c0d" />} />
<StatCard label="Completed" value={cases.filter(c => c.status === 'MEDIATION_COMPLETE').length} sub="Successfully resolved" subColor="#16a34a" iconBg="#f0fdf4" icon={<CheckSquare size={22} color="#16a34a" />} />
<StatCard label="Total Cases" value={cases.length} sub="All time" subColor="var(--text-muted)" iconBg="#fdf4ff" icon={<TrendingUp size={22} color="#9333ea" />} />
<StatCard label="Amount at Stake" value={`₹${totalMonetaryValue.toLocaleString('en-IN')}`} sub="Across active cases" subColor="#8b5cf6" iconBg="#f5f3ff" icon={<TrendingUp size={22} color="#8b5cf6" />} />
<StatCard
  label="Unsuccessful"
  value={cases.filter(c => c.status === 'MEDIATION_FAILED').length}
  sub="Mediation not reached"
  subColor="#dc2626"
  iconBg="#fef2f2"
  icon={<AlertCircle size={22} color="#dc2626" />}
/>
 </div>

                  <div className="pd-section">
                    <div className="pd-section-head">
                      <div>
                        <h2 className="pd-section-title">Active Cases</h2>
                        <p className="pd-section-sub">Track your ongoing mediation cases</p>
                      </div>
                      
                     <button
  className="pd-new-case-btn"
  onClick={() => navigate('/party/apply')}
  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
>
  <FilePlus size={15} />
  New Case
</button>
                    </div>{applications
    .filter(a => a.status === 'APPLICATION_PENDING')
    .map(a => (
      <div key={a.id} className="pd-case-card">
        <div className="pd-case-top">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pd-case-title-row">
              <h3 className="pd-case-title">
                {a.dispute_type ? a.dispute_type.replace(/_/g, ' ') : 'Mediation Application'}
              </h3>
              <span
                className="pd-case-badge"
                style={{ color: '#ca8a04', background: '#fef9c3' }}
              >
                Waiting for mediator review
              </span>
            </div>
            <p className="pd-case-meta">
              Submitted {new Date(a.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
  ))}

                    {activeCasesList.length === 0 && (
  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', border: '1.5px dashed var(--border)', borderRadius: '12px' }}>
    <FileText size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
    <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>No active cases yet</p>
    <p>Once you accept an invitation or apply for mediation, your cases will appear here.</p>
  </div>
)}
                    {activeCasesList.map(c => (
  <CaseCard
    key={c.id}
    title={c.dispute_type || c.brief_description || c.title || 'Mediation Case'}
    status={friendlyStatus(c.status)}
    rawStatus={c.status}
    statusColor="#1a56b0"
    statusBg="#dbeafe"
    caseId={c.id}
    displayId={c.id.slice(0, 8).toUpperCase()}
    vs={c.against_party_email || c.requesting_party_email || '—'}
    progress={(() => {
      const statusMap = {
        'DRAFT': 'BOTH_INVITED',
        'PARTY_A_SUBMITTED': 'FIRST_PARTY_SUBMITTED',
        'AI_RUNNING': 'BURST_1_PROCESSING',
        'ANALYSIS_READY': 'BURST_1_COMPLETE',
        'QUESTIONNAIRE_SENT': 'QUESTIONNAIRE_ACTIVE',
        'PROPOSAL_SENT': 'PROPOSAL_PUBLISHED',
        'PROPOSAL_ACCEPTED': 'MEDIATION_COMPLETE',
        'SETTLED': 'MEDIATION_COMPLETE',
        'CLOSED': 'MEDIATION_COMPLETE'
      }
      const mappedStatus = statusMap[c.status] || c.status
      const steps = [
        'BOTH_INVITED',
        'FIRST_PARTY_SUBMITTED',
        'BOTH_SUBMITTED',
        'BURST_1_PROCESSING',
        'BURST_1_COMPLETE',
        'QUESTIONNAIRE_ACTIVE',
        'QUESTIONNAIRE_COMPLETE',
        'BURST_2_PROCESSING',
        'BURST_2_COMPLETE',
        'PROPOSAL_DRAFT',
        'PROPOSAL_PUBLISHED',
        'MEDIATION_IN_PROGRESS',
        'MEDIATION_COMPLETE'
      ]
      const idx = steps.indexOf(mappedStatus)
      return idx >= 0 ? Math.round((idx / (steps.length - 1)) * 100) : 0
    })()}
    nextDate={'—'}
         docCount={docCounts[c.id]}
    onView={() => navigate(`/party/cases/${c.id}`)}
   
  />
))}
                  </div>

                  {closedCasesList.length > 0 && (
                    <div className="pd-section" style={{ marginTop: '1.25rem' }}>
                      <div className="pd-section-head">
                        <div>
                          <h2 className="pd-section-title">Closed Cases</h2>
                          <p className="pd-section-sub">Completed or ended mediations</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {closedCasesList.map((c, i) => (
                          <div
                            key={c.id}
                            onClick={() => navigate(`/party/cases/${c.id}`)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              padding: '12px 4px',
                              borderBottom: i < closedCasesList.length - 1 ? '1px solid var(--border)' : 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {c.dispute_type || c.brief_description || c.title || 'Mediation Case'}
                                </h3>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 500,
                                    padding: '2px 8px',
                                    borderRadius: 99,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    ...(c.status === 'MEDIATION_COMPLETE'
                                      ? { color: '#16a34a', background: '#f0fdf4' }
                                      : { color: '#dc2626', background: '#fef2f2' }),
                                  }}
                                >
                                  {friendlyStatus(c.status)}
                                </span>
                              </div>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {c.id.slice(0, 8).toUpperCase()} • vs. {c.against_party_email || c.requesting_party_email || '—'}
                              </p>
                            </div>
                            <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                
                    <div className="pd-right-col">
                  <div className="pd-side-card">
  <h2 className="pd-side-title">Quick Actions</h2>
  {quickActions.map((a, i) => (
    <button
      key={i}
      className="pd-qa-btn"
      style={{ marginBottom: i < quickActions.length - 1 ? '8px' : 0 }}
      onClick={() => { if (a.onClick) a.onClick(); else if (a.path) navigate(a.path) }}
    >
      <span style={{ color: 'var(--brand)', display: 'flex' }}>{a.icon}</span>
      <span className="pd-qa-label">{a.label}</span>
      <ChevronRight size={15} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
    </button>
  ))}
</div>

            

                 
                </div>
              </div>
            </div>
          </div>
        </div>

       
      </div>
    </>
  )
}