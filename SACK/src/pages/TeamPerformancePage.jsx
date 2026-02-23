import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Ticket, Users, BarChart3, Settings, LogOut,
  Bell, Star, TrendingUp, TrendingDown, Award, CheckCircle,
  Clock, AlertCircle, MessageSquare, Target, Zap, Shield,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";

// ─── DATA ───────────────────────────────────────────────────────────────────

const teamMembers = [
  {
    id: 1, name: "John Doe",     avatar: "JD", role: "Senior Agent", status: "online",
    assigned: 18, resolved: 15, pending: 3,
    avgResponse: "1.2h", avgResolution: "4.5h", satisfaction: 4.8,
    resolvedThisWeek: 15, ticketsThisMonth: 62,
    skills: { speed: 85, quality: 92, communication: 78, technical: 88, teamwork: 90 },
    recentActivity: [
      { action: "Resolved TCK-1043", time: "5 hours ago",  type: "resolve" },
      { action: "Commented on TCK-1044", time: "3 hours ago", type: "comment" },
      { action: "Assigned TCK-1045", time: "2 hours ago",  type: "assign"  },
    ],
    trend: "+8%", trendUp: true,
  },
  {
    id: 2, name: "Sarah Smith",  avatar: "SS", role: "Lead Agent",   status: "online",
    assigned: 22, resolved: 20, pending: 2,
    avgResponse: "0.8h", avgResolution: "3.2h", satisfaction: 4.9,
    resolvedThisWeek: 20, ticketsThisMonth: 78,
    skills: { speed: 95, quality: 97, communication: 91, technical: 85, teamwork: 93 },
    recentActivity: [
      { action: "Resolved TCK-1044", time: "4 hours ago",  type: "resolve" },
      { action: "Resolved TCK-1039", time: "12 hours ago", type: "resolve" },
      { action: "Updated TCK-1042",  time: "6 hours ago",  type: "comment" },
    ],
    trend: "+12%", trendUp: true,
  },
  {
    id: 3, name: "Mike Johnson", avatar: "MJ", role: "Support Agent", status: "away",
    assigned: 15, resolved: 12, pending: 3,
    avgResponse: "2.1h", avgResolution: "5.8h", satisfaction: 4.6,
    resolvedThisWeek: 12, ticketsThisMonth: 48,
    skills: { speed: 70, quality: 82, communication: 88, technical: 75, teamwork: 85 },
    recentActivity: [
      { action: "Resolved TCK-1043", time: "5 hours ago",  type: "resolve" },
      { action: "Commented on TCK-1037", time: "1 day ago", type: "comment" },
      { action: "Assigned TCK-1038", time: "1 day ago",    type: "assign"  },
    ],
    trend: "-3%", trendUp: false,
  },
  {
    id: 4, name: "Emily Chen",   avatar: "EC", role: "Support Agent", status: "online",
    assigned: 20, resolved: 18, pending: 2,
    avgResponse: "1.5h", avgResolution: "4.0h", satisfaction: 4.7,
    resolvedThisWeek: 18, ticketsThisMonth: 70,
    skills: { speed: 88, quality: 90, communication: 86, technical: 82, teamwork: 88 },
    recentActivity: [
      { action: "Resolved TCK-1042", time: "6 hours ago",  type: "resolve" },
      { action: "Resolved TCK-1038", time: "8 hours ago",  type: "resolve" },
      { action: "Commented on TCK-1041", time: "4 hours ago", type: "comment" },
    ],
    trend: "+5%", trendUp: true,
  },
];

const weeklyData = [
  { day: "Mon", JD: 3, SS: 4, MJ: 2, EC: 3 },
  { day: "Tue", JD: 4, SS: 5, MJ: 3, EC: 4 },
  { day: "Wed", JD: 2, SS: 3, MJ: 2, EC: 3 },
  { day: "Thu", JD: 3, SS: 4, MJ: 2, EC: 4 },
  { day: "Fri", JD: 2, SS: 3, MJ: 2, EC: 3 },
  { day: "Sat", JD: 1, SS: 1, MJ: 1, EC: 1 },
  { day: "Sun", JD: 0, SS: 0, MJ: 0, EC: 0 },
];

const MEMBER_COLORS = { JD: "#ffffff", SS: "#94a3b8", MJ: "#fbbf24", EC: "#4ade80" };

const navItems = [
  { id: "overview", label: "Dashboard",       icon: LayoutDashboard, path: "/teamlead"        },
  { id: "tickets",  label: "Tickets",          icon: Ticket,          path: "/tickets"         },
  { id: "team",     label: "Team Performance", icon: Users,           path: "/team-performance" },
  { id: "analytics",label: "Analytics",        icon: BarChart3,       path: null               },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function TeamPerformancePage() {
  const navigate = useNavigate();
  const [selectedMember, setSelectedMember] = useState(teamMembers[0]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNav, setActiveNav] = useState("team");

  const handleNavClick = (item) => {
    if (item.path) navigate(item.path);
    else setActiveNav(item.id);
  };

  // Build radar data from selected member's skills
  const radarData = Object.entries(selectedMember.skills).map(([key, val]) => ({
    skill: key.charAt(0).toUpperCase() + key.slice(1),
    value: val,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px" }}>
          <p style={{ color: "#fff", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{label}</p>
          {payload.map((e, i) => (
            <p key={i} style={{ color: e.color || "#fff", fontSize: 12, margin: "2px 0" }}>{e.name}: {e.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  const activityIcon = (type) => {
    if (type === "resolve") return <CheckCircle size={13} style={{ color: "#4ade80" }} />;
    if (type === "comment") return <MessageSquare size={13} style={{ color: "#94a3b8" }} />;
    return <Zap size={13} style={{ color: "#fbbf24" }} />;
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#080808", fontFamily: "'Nunito Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&family=Nunito+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        .nav-btn {
          width: 100%; display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border-radius: 12px; border: none;
          background: transparent; cursor: pointer; text-align: left;
          font-family: 'Nunito Sans', sans-serif; font-size: 14px;
          color: rgba(255,255,255,0.4); transition: all 0.2s;
        }
        .nav-btn:hover  { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); }
        .nav-btn.active { background: rgba(255,255,255,0.08); color: #fff; font-weight: 600; }

        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          transition: border-color 0.2s, background 0.2s;
        }
        .card:hover { border-color: rgba(255,255,255,0.12); }

        .member-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 18px;
          cursor: pointer; transition: all 0.2s;
          animation: fadeUp 0.4s ease both;
        }
        .member-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.15);
          transform: translateY(-2px);
        }
        .member-card.selected {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.25);
        }

        .stat-pill {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 18px 20px;
          display: flex; align-items: center; gap: 14px;
          animation: fadeUp 0.4s ease both;
        }

        .notif-panel {
          position: absolute; right: 0; top: calc(100% + 8px); width: 300px;
          background: #111; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px; padding: 16px; z-index: 100;
        }

        .badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
        }

        .progress-track {
          width: 100%; height: 5px; background: rgba(255,255,255,0.07);
          border-radius: 999px; overflow: hidden;
        }
        .progress-fill {
          height: 100%; border-radius: 999px; transition: width 0.6s cubic-bezier(.4,0,.2,1);
        }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 240, background: "#0d0d0d",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column", padding: "24px 16px",
        height: "100vh", position: "sticky", top: 0, flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36, padding: "0 6px" }}>
          <div style={{ width: 8, height: 8, background: "#fff", borderRadius: "50%", boxShadow: "0 0 10px 3px rgba(255,255,255,0.3)", animation: "pulse-dot 2.5s ease infinite" }} />
          <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "0.05em" }}>AI Ticket</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`nav-btn ${activeNav === item.id ? "active" : ""}`} onClick={() => handleNavClick(item)}>
                <Icon size={16} /> {item.label}
              </button>
            );
          })}
          <button className="nav-btn" style={{ marginTop: 8 }}><Settings size={16} /> Settings</button>
        </nav>

        {/* User */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "0 6px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#080808", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>TL</div>
            <div>
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>Team Lead</p>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>admin@company.com</p>
            </div>
          </div>
          <button className="nav-btn"><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* HEADER */}
        <header style={{
          background: "rgba(8,8,8,0.9)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 50,
        }}>
          <div>
            <h1 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", margin: 0 }}>Team Performance</h1>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0, marginTop: 2 }}>
              {teamMembers.length} agents · {teamMembers.filter(m => m.status === "online").length} online now
            </p>
          </div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowNotifications(!showNotifications)}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px", cursor: "pointer", display: "flex", color: "rgba(255,255,255,0.5)", position: "relative" }}>
              <Bell size={16} />
              <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, background: "#f87171", borderRadius: "50%", border: "1px solid #080808" }} />
            </button>
            {showNotifications && (
              <div className="notif-panel">
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Notifications</p>
                {[
                  { title: "High Priority Ticket", desc: "TCK-1045 requires attention", time: "2 min ago",  color: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" },
                  { title: "Ticket Resolved",      desc: "Sarah resolved TCK-1040",    time: "15 min ago", color: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.2)"  },
                ].map((n, i) => (
                  <div key={i} style={{ background: n.color, border: `1px solid ${n.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                    <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>{n.title}</p>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: "4px 0 0" }}>{n.desc}</p>
                    <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, margin: "4px 0 0" }}>{n.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        <div style={{ padding: "28px", flex: 1 }}>

          {/* ── TEAM OVERVIEW STAT PILLS ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
            {[
              { label: "Total Resolved",   val: teamMembers.reduce((a,m) => a + m.resolved, 0),            icon: CheckCircle, color: "#4ade80", bg: "rgba(74,222,128,0.1)"   },
              { label: "Avg Response",     val: "1.4h",                                                     icon: Clock,       color: "#fbbf24", bg: "rgba(251,191,36,0.1)"   },
              { label: "Avg Satisfaction", val: (teamMembers.reduce((a,m) => a + m.satisfaction, 0) / teamMembers.length).toFixed(1) + "/5", icon: Star, color: "#fff", bg: "rgba(255,255,255,0.08)" },
              { label: "Total Pending",    val: teamMembers.reduce((a,m) => a + m.pending, 0),              icon: AlertCircle, color: "#f87171", bg: "rgba(248,113,113,0.1)"  },
            ].map(({ label, val, icon: Icon, color, bg }, i) => (
              <div key={label} className="stat-pill" style={{ animationDelay: `${i * 0.07}s` }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>{label}</p>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: 22, margin: 0, fontFamily: "'Nunito', sans-serif" }}>{val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── MAIN GRID: member cards LEFT + detail RIGHT ── */}
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, marginBottom: 24 }}>

            {/* LEFT — member list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", margin: "0 0 4px" }}>Agents</h3>
              {teamMembers.map((m, i) => (
                <div key={m.id} className={`member-card ${selectedMember.id === m.id ? "selected" : ""}`}
                  style={{ animationDelay: `${i * 0.08}s` }}
                  onClick={() => setSelectedMember(m)}>

                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    {/* Avatar */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{m.avatar}</div>
                      <div style={{
                        position: "absolute", bottom: 1, right: 1,
                        width: 10, height: 10, borderRadius: "50%",
                        background: m.status === "online" ? "#4ade80" : "#fbbf24",
                        border: "2px solid #0d0d0d",
                      }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0 }}>{m.name}</p>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>{m.role}</p>
                    </div>
                    {/* Trend */}
                    <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 700, color: m.trendUp ? "#4ade80" : "#f87171" }}>
                      {m.trendUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {m.trend}
                    </div>
                  </div>

                  {/* Mini stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Assigned", val: m.assigned, color: "#fff"    },
                      { label: "Resolved", val: m.resolved, color: "#4ade80" },
                      { label: "Pending",  val: m.pending,  color: "#fbbf24" },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "8px", textAlign: "center" }}>
                        <p style={{ color, fontWeight: 700, fontSize: 18, margin: 0, fontFamily: "'Nunito', sans-serif" }}>{val}</p>
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, margin: 0 }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Satisfaction bar */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 5 }}>
                      <span>Satisfaction</span>
                      <span style={{ color: "#fbbf24", fontWeight: 700 }}>★ {m.satisfaction}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${(m.satisfaction / 5) * 100}%`, background: "linear-gradient(90deg, #fbbf24, #f97316)" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT — selected member detail */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Profile header */}
              <div className="card" style={{ padding: 24, animation: "fadeUp 0.3s ease both" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 22 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff", color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20 }}>
                      {selectedMember.avatar}
                    </div>
                    <div style={{
                      position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: "50%",
                      background: selectedMember.status === "online" ? "#4ade80" : "#fbbf24",
                      border: "3px solid #0e0e0e",
                    }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h2 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 22, color: "#fff", margin: 0 }}>{selectedMember.name}</h2>
                      <span className="badge" style={{
                        background: selectedMember.status === "online" ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.1)",
                        color:      selectedMember.status === "online" ? "#4ade80"               : "#fbbf24",
                        border: `1px solid ${selectedMember.status === "online" ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}`,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: selectedMember.status === "online" ? "#4ade80" : "#fbbf24" }} />
                        {selectedMember.status}
                      </span>
                    </div>
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, margin: "0 0 14px" }}>{selectedMember.role}</p>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {[
                        { label: "Avg Response",   val: selectedMember.avgResponse,   color: "#94a3b8" },
                        { label: "Avg Resolution", val: selectedMember.avgResolution, color: "#4ade80" },
                        { label: "This Month",     val: `${selectedMember.ticketsThisMonth} tickets`, color: "#fff" },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 16px" }}>
                          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>{label}</p>
                          <p style={{ color, fontWeight: 700, fontSize: 16, margin: 0, fontFamily: "'Nunito', sans-serif" }}>{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Rating badge */}
                  <div style={{ textAlign: "center", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 14, padding: "14px 20px", flexShrink: 0 }}>
                    <Star size={18} style={{ color: "#fbbf24", fill: "#fbbf24", marginBottom: 4 }} />
                    <p style={{ color: "#fbbf24", fontWeight: 800, fontSize: 24, margin: 0, fontFamily: "'Nunito', sans-serif" }}>{selectedMember.satisfaction}</p>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>Rating</p>
                  </div>
                </div>

                {/* Skill bars */}
                <div>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px" }}>Skill Breakdown</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {Object.entries(selectedMember.skills).map(([skill, val]) => (
                      <div key={skill}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>
                          <span style={{ textTransform: "capitalize" }}>{skill}</span>
                          <span style={{ fontWeight: 700, color: "#fff" }}>{val}%</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${val}%`, background: val >= 90 ? "#4ade80" : val >= 75 ? "#ffffff" : "#fbbf24" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Radar + Recent Activity */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                {/* Radar chart */}
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", margin: "0 0 4px" }}>Performance Radar</h3>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 16px" }}>Skill distribution</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="skill" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                      <Radar name={selectedMember.name} dataKey="value" stroke="#ffffff" fill="#ffffff" fillOpacity={0.08} strokeWidth={1.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Recent Activity */}
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", margin: "0 0 4px" }}>Recent Activity</h3>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 16px" }}>Latest actions</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {selectedMember.recentActivity.map((act, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {activityIcon(act.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0, fontWeight: 500 }}>{act.action}</p>
                          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, margin: 0 }}>{act.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── WEEKLY RESOLVED CHART ── */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", margin: "0 0 4px" }}>Weekly Tickets Resolved</h3>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 20px" }}>Daily comparison across all agents</p>

            {/* Legend */}
            <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
              {teamMembers.map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: MEMBER_COLORS[m.avatar] }} />
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{m.name}</span>
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weeklyData} barCategoryGap="30%">
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                {teamMembers.map(m => (
                  <Bar key={m.avatar} dataKey={m.avatar} name={m.name} fill={MEMBER_COLORS[m.avatar]}
                    radius={[4, 4, 0, 0]} opacity={0.85} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </main>
    </div>
  );
}