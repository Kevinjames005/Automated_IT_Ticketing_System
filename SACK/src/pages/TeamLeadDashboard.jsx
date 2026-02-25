import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle,
  Users, Download, Calendar, Search, MoreVertical,
  RefreshCw, Bell, Settings, LayoutDashboard, Ticket, BarChart3,
  LogOut, Menu, X, UserPlus,
} from "lucide-react";

const priorityData = [
  { name: "High",   value: 14, color: "#f87171" },
  { name: "Medium", value: 28, color: "#94a3b8" },
  { name: "Low",    value: 10, color: "#e2e8f0" },
];

const responseData = [
  { name: "Mon", tickets: 12, resolved: 8  },
  { name: "Tue", tickets: 18, resolved: 12 },
  { name: "Wed", tickets: 10, resolved: 9  },
  { name: "Thu", tickets: 22, resolved: 15 },
  { name: "Fri", tickets: 15, resolved: 11 },
  { name: "Sat", tickets: 8,  resolved: 6  },
  { name: "Sun", tickets: 5,  resolved: 4  },
];

const categoryData = [
  { name: "Network",       tickets: 24 },
  { name: "Hardware",      tickets: 18 },
  { name: "Software",      tickets: 32 },
  { name: "Account",       tickets: 15 },
  { name: "Communication", tickets: 21 },
  { name: "Security",      tickets: 12 },
];

const teamMembers = ["John Doe", "Sarah Smith", "Mike Johnson", "Emily Chen"];

const teamPerformance = [
  { id: 1, name: "John Doe",     avatar: "JD", assigned: 18, resolved: 15, pending: 3, avgResponse: "1.2h", avgResolution: "4.5h", satisfaction: 4.8, status: "online" },
  { id: 2, name: "Sarah Smith",  avatar: "SS", assigned: 22, resolved: 20, pending: 2, avgResponse: "0.8h", avgResolution: "3.2h", satisfaction: 4.9, status: "online" },
  { id: 3, name: "Mike Johnson", avatar: "MJ", assigned: 15, resolved: 12, pending: 3, avgResponse: "2.1h", avgResolution: "5.8h", satisfaction: 4.6, status: "away"   },
  { id: 4, name: "Emily Chen",   avatar: "EC", assigned: 20, resolved: 18, pending: 2, avgResponse: "1.5h", avgResolution: "4.0h", satisfaction: 4.7, status: "online" },
];

const initialTickets = [
  { id: "TCK-1045", title: "Email not syncing with mobile",  priority: "high",   category: "Communication", response: "45 mins", assigned: "John Doe",     status: "in-progress", created: "2 hours ago" },
  { id: "TCK-1044", title: "VPN connection timeout",         priority: "high",   category: "Network",       response: "1 hr",    assigned: "Sarah Smith",  status: "in-progress", created: "4 hours ago" },
  { id: "TCK-1043", title: "Password reset request",         priority: "low",    category: "Account",       response: "15 mins", assigned: "Mike Johnson", status: "resolved",    created: "5 hours ago" },
  { id: "TCK-1042", title: "Software installation needed",   priority: "medium", category: "Software",      response: "30 mins", assigned: "Emily Chen",   status: "in-progress", created: "6 hours ago" },
  { id: "TCK-1041", title: "Printer not responding",         priority: "medium", category: "Hardware",      response: "1.5 hrs", assigned: "",             status: "open",        created: "8 hours ago" },
];

export default function TeamLeadDashboard() {
  const navigate = useNavigate();

  const [timeRange,          setTimeRange]          = useState("7days");
  const [searchQuery,        setSearchQuery]        = useState("");
  const [showNotifications,  setShowNotifications]  = useState(false);
  const [sidebarOpen,        setSidebarOpen]        = useState(false);
  const [activeTab,          setActiveTab]          = useState("overview");
  const [tickets,            setTickets]            = useState(initialTickets);
  const [assignModal,        setAssignModal]        = useState(null);
  const [selectedAgent,      setSelectedAgent]      = useState("");

  const totalTicketsTrend = { value: "10.9", isPositive: true  };
  const responseTrend     = { value: "21.7"                    };
  const resolutionTrend   = { value: "12.7"                    };
  const pendingTrend      = { value: "27.8", isPositive: true  };

  const filteredTickets = tickets.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.assigned && t.assigned.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAssign = (ticketId) => {
    if (!selectedAgent) return;
    setTickets(prev =>
      prev.map(t =>
        t.id === ticketId
          ? { ...t, assigned: selectedAgent, status: t.status === "open" ? "in-progress" : t.status }
          : t
      )
    );
    setAssignModal(null);
    setSelectedAgent("");
  };

  const getPriorityStyle = (p) => ({
    high:   { background: "rgba(248,113,113,0.12)", color: "#f87171",  border: "1px solid rgba(248,113,113,0.25)" },
    medium: { background: "rgba(148,163,184,0.12)", color: "#94a3b8",  border: "1px solid rgba(148,163,184,0.25)" },
    low:    { background: "rgba(226,232,240,0.1)",  color: "#e2e8f0",  border: "1px solid rgba(226,232,240,0.2)"  },
  }[p] || {});

  const getStatusStyle = (s) => ({
    open:          { background: "rgba(148,163,184,0.1)", color: "#94a3b8" },
    "in-progress": { background: "rgba(251,191,36,0.1)",  color: "#fbbf24" },
    resolved:      { background: "rgba(74,222,128,0.1)",  color: "#4ade80" },
  }[s] || {});

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px" }}>
          <p style={{ color: "#fff", fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{label}</p>
          {payload.map((e, i) => (
            <p key={i} style={{ color: e.color, fontSize: 12, margin: "2px 0" }}>{e.name}: {e.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Nav items — "tickets" navigates to /tickets, others set activeTab
  const navItems = [
  { id: "overview",  label: "Dashboard",       icon: LayoutDashboard, path: null               },
  { id: "tickets",   label: "Tickets",          icon: Ticket,          path: "/tickets"         },
  { id: "team",      label: "Team Performance", icon: Users,           path: "/team-performance" }, 
  { id: "analytics", label: "Analytics",        icon: BarChart3,       path: null               },
];

  const handleNavClick = (item) => {
    if (item.path) {
      navigate(item.path);
    } else {
      setActiveTab(item.id);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#080808", fontFamily: "'Nunito Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&family=Nunito+Sans:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; } 50% { opacity: 0.4; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }

        .nav-btn {
          width: 100%; display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border-radius: 12px; border: none;
          background: transparent; cursor: pointer;
          font-family: 'Nunito Sans', sans-serif; font-size: 14px;
          color: rgba(255,255,255,0.4); transition: all 0.2s;
          text-align: left;
        }
        .nav-btn:hover  { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); }
        .nav-btn.active { background: rgba(255,255,255,0.08); color: #ffffff; font-weight: 600; }

        .kpi-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; padding: 24px;
          transition: border-color 0.2s, background 0.2s;
          animation: fadeSlideIn 0.5s ease both;
        }
        .kpi-card:hover { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.05); }

        .chart-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; padding: 24px;
        }

        .ticket-row { transition: background 0.15s; }
        .ticket-row:hover { background: rgba(255,255,255,0.03); }

        .assign-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
          font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
          cursor: pointer; transition: all 0.2s;
          font-family: 'Nunito Sans', sans-serif;
        }
        .assign-btn:hover { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.25); }

        .export-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 10px; border: none;
          background: #ffffff; color: #080808;
          font-family: 'Nunito Sans', sans-serif; font-weight: 600; font-size: 13px;
          cursor: pointer; transition: opacity 0.2s;
          position: relative; overflow: hidden;
        }
        .export-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          background-size: 200% 100%;
          animation: shimmer 2.5s infinite;
        }
        .export-btn:hover { opacity: 0.88; }

        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.7);
          display: flex; align-items: center; justify-content: center; z-index: 200;
          backdrop-filter: blur(4px);
        }
        .modal-box {
          background: #111; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 18px; padding: 28px; width: 340px;
          animation: modalIn 0.25s ease both;
        }
        .modal-select {
          width: 100%; padding: 10px 14px; border-radius: 10px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
          color: #fff; font-family: 'Nunito Sans', sans-serif; font-size: 14px;
          outline: none; margin: 16px 0; cursor: pointer;
        }
        .modal-select option { background: #1a1a1a; }
        .modal-confirm {
          width: 100%; padding: 11px; border-radius: 10px; border: none;
          background: #fff; color: #080808;
          font-family: 'Nunito Sans', sans-serif; font-weight: 700; font-size: 14px;
          cursor: pointer; transition: opacity 0.2s;
        }
        .modal-confirm:hover { opacity: 0.88; }
        .modal-cancel {
          width: 100%; padding: 11px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent; color: rgba(255,255,255,0.5);
          font-family: 'Nunito Sans', sans-serif; font-size: 14px;
          cursor: pointer; margin-top: 8px; transition: color 0.2s;
        }
        .modal-cancel:hover { color: #fff; }

        .search-input {
          width: 100%; padding: 9px 14px 9px 38px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: #fff; font-family: 'Nunito Sans', sans-serif; font-size: 13px;
          outline: none; transition: border-color 0.2s;
        }
        .search-input:focus { border-color: rgba(255,255,255,0.3); }
        .search-input::placeholder { color: rgba(255,255,255,0.25); }

        .mobile-overlay { display: none; }
        @media(max-width: 768px) {
          .sidebar { position: fixed !important; z-index: 100; }
          .mobile-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 99; }
        }

        th {
          font-family: 'Nunito Sans', sans-serif; font-size: 11px;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: rgba(255,255,255,0.3); font-weight: 600;
        }
      `}</style>

      {/* ── ASSIGN MODAL ── */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: "#fff", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
              Assign Ticket
            </h3>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>{assignModal}</p>
            <select className="modal-select" value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
              <option value="">Select an agent...</option>
              {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button className="modal-confirm" onClick={() => handleAssign(assignModal)}>Confirm Assignment</button>
            <button className="modal-cancel" onClick={() => setAssignModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── SIDEBAR MOBILE OVERLAY ── */}
      {sidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── SIDEBAR ── */}
      <aside className="sidebar" style={{
        width: 240, background: "#0d0d0d",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column", padding: "24px 16px",
        transform: sidebarOpen ? "translateX(0)" : undefined,
        transition: "transform 0.3s",
        height: "100vh", position: "sticky", top: 0, flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36, padding: "0 6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 8, height: 8, background: "#fff", borderRadius: "50%",
              boxShadow: "0 0 10px 3px rgba(255,255,255,0.3)",
              animation: "pulse-dot 2.5s ease infinite",
            }} />
            <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "0.05em" }}>
              AI Ticket
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-btn ${activeTab === item.id ? "active" : ""}`}
                onClick={() => handleNavClick(item)}
              >
                <Icon size={16} /> {item.label}
              </button>
            );
          })}
          <button className="nav-btn" style={{ marginTop: 8 }}>
            <Settings size={16} /> Settings
          </button>
        </nav>

        {/* User */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "0 6px" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#080808", fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>TL</div>
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
          background: "rgba(8,8,8,0.85)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 50,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setSidebarOpen(true)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex" }}>
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", margin: 0 }}>
                Team Lead Dashboard
              </h1>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0, marginTop: 2 }}>
                Monitor ticket flow and team productivity
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Time Range */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, padding: "7px 12px",
            }}>
              <Calendar size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
              <select value={timeRange} onChange={e => setTimeRange(e.target.value)}
                style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 13, outline: "none", cursor: "pointer", fontFamily: "'Nunito Sans', sans-serif" }}>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>

            {/* Refresh */}
            <button style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px", cursor: "pointer", display: "flex", color: "rgba(255,255,255,0.5)" }}>
              <RefreshCw size={16} />
            </button>

            {/* Bell */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowNotifications(!showNotifications)}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px", cursor: "pointer", display: "flex", color: "rgba(255,255,255,0.5)", position: "relative" }}>
                <Bell size={16} />
                <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, background: "#f87171", borderRadius: "50%", border: "1px solid #080808" }} />
              </button>
              {showNotifications && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 300, background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 16, zIndex: 100 }}>
                  <p style={{ color: "#fff", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Notifications</p>
                  {[
                    { title: "High Priority Ticket", desc: "TCK-1045 requires immediate attention", time: "2 min ago",  color: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" },
                    { title: "Ticket Resolved",      desc: "Sarah resolved TCK-1040",              time: "15 min ago", color: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.2)"  },
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

            <button className="export-btn"><Download size={14} /> Export</button>
          </div>
        </header>

        {/* CONTENT */}
        <div style={{ padding: "28px", flex: 1 }}>

          {/* ══════════════════════════════════════════
              SECTION 1 — RECENT TICKETS
          ══════════════════════════════════════════ */}
          <div className="chart-card" style={{ marginBottom: 24, animation: "fadeSlideIn 0.4s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", margin: 0 }}>Recent Tickets</h3>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: "4px 0 0" }}>Latest ticket activity — assign and manage</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
                  <input type="text" placeholder="Search tickets..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)} className="search-input" style={{ width: 220 }} />
                </div>
                <button
                  onClick={() => navigate("/tickets")}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)",
                    fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                >
                  <Ticket size={13} /> View All Tickets
                </button>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Ticket ID", "Title", "Priority", "Category", "Status", "Response", "Assigned To", "Created", "Assign", "Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: ["Title","Ticket ID","Created"].includes(h) ? "left" : "center" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket, i) => (
                    <tr key={ticket.id} className="ticket-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "14px", color: "#94a3b8", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{ticket.id}</td>
                      <td style={{ padding: "14px", color: "#fff", fontWeight: 500, maxWidth: 200 }}>
                        <span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ticket.title}</span>
                      </td>
                      <td style={{ padding: "14px", textAlign: "center" }}>
                        <span style={{ ...getPriorityStyle(ticket.priority), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td style={{ padding: "14px", textAlign: "center" }}>
                        <span style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", padding: "3px 10px", borderRadius: 6, fontSize: 11 }}>
                          {ticket.category}
                        </span>
                      </td>
                      <td style={{ padding: "14px", textAlign: "center" }}>
                        <span style={{ ...getStatusStyle(ticket.status), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>
                          {ticket.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{ticket.response}</td>
                      <td style={{ padding: "14px", textAlign: "center" }}>
                        {ticket.assigned ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "center" }}>
                            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#fff", color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                              {ticket.assigned.split(" ").map(n => n[0]).join("")}
                            </div>
                            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>{ticket.assigned}</span>
                          </div>
                        ) : (
                          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: "14px", color: "rgba(255,255,255,0.3)", fontSize: 12, whiteSpace: "nowrap" }}>{ticket.created}</td>
                      <td style={{ padding: "14px", textAlign: "center" }}>
                        <button className="assign-btn" onClick={() => { setAssignModal(ticket.id); setSelectedAgent(ticket.assigned || ""); }}>
                          <UserPlus size={11} />
                          {ticket.assigned ? "Reassign" : "Assign"}
                        </button>
                      </td>
                      <td style={{ padding: "14px", textAlign: "center" }}>
                        <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", display: "flex", margin: "0 auto" }}>
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTickets.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>No tickets found</div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════
              SECTION 2 — KPI CARDS
          ══════════════════════════════════════════ */}
          

          {/* ══════════════════════════════════════════
              SECTION 3 — CHARTS
          ══════════════════════════════════════════ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

            {/* Area Chart */}
            

            {/* Pie Chart */}
            
          </div>

          {/* Category Bar Chart */}
          

          {/* ══════════════════════════════════════════
              SECTION 4 — TEAM PERFORMANCE
          ══════════════════════════════════════════ */}
          

        </div>
      </main>
    </div>
  );
}