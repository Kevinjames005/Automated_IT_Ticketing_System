import { useState } from "react";
import {
  Search, Clock, CheckCircle, AlertCircle, Calendar, User,
  MessageSquare, Paperclip, Bell, Settings, LogOut, Menu, X,
  Send, Star, TrendingUp, Activity, Award, Target, ChevronRight,
} from "lucide-react";

export default function TeamMemberDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("my-tickets");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [tickets, setTickets] = useState([
    {
      id: "TCK-1001", title: "VPN Connection Issues",
      description: "User unable to connect to company VPN from home network. Error code: 0x800704cf appears repeatedly.",
      status: "in-progress", priority: "high", category: "Network",
      requester: "Alice Johnson", requesterEmail: "alice.johnson@company.com",
      createdAt: "2024-02-14T10:30:00", updatedAt: "2024-02-15T09:15:00", dueDate: "2024-02-16T17:00:00",
      comments: [
        { id: 1, author: "You", text: "I've started investigating this issue. Checking VPN logs now.", timestamp: "2024-02-15T09:15:00", isAgent: true },
        { id: 2, author: "Alice Johnson", text: "Thank you! I need this urgently for tomorrow's client meeting.", timestamp: "2024-02-15T09:30:00", isAgent: false },
      ],
      attachments: [{ id: 1, name: "vpn_error_screenshot.png", size: "2.4 MB" }],
      timeSpent: "1.75", estimatedTime: "3",
    },
    {
      id: "TCK-1002", title: "Printer Not Working on 3rd Floor",
      description: "Office printer HP LaserJet Pro on 3rd floor is not responding to print jobs. Display shows 'Ready' but nothing prints.",
      status: "open", priority: "medium", category: "Hardware",
      requester: "Bob Smith", requesterEmail: "bob.smith@company.com",
      createdAt: "2024-02-15T08:00:00", updatedAt: "2024-02-15T08:00:00", dueDate: "2024-02-17T17:00:00",
      comments: [], attachments: [], timeSpent: "0", estimatedTime: "2",
    },
    {
      id: "TCK-1003", title: "Email Sync Problem with Mobile",
      description: "Outlook not syncing emails with iPhone. Last sync was 2 days ago. Using Exchange server.",
      status: "in-progress", priority: "high", category: "Software",
      requester: "Carol Davis", requesterEmail: "carol.davis@company.com",
      createdAt: "2024-02-14T14:20:00", updatedAt: "2024-02-15T11:00:00", dueDate: "2024-02-16T12:00:00",
      comments: [{ id: 1, author: "You", text: "Please try removing and re-adding your email account.", timestamp: "2024-02-15T11:00:00", isAgent: true }],
      attachments: [], timeSpent: "2.25", estimatedTime: "4",
    },
    {
      id: "TCK-1004", title: "Software Installation – Adobe Suite",
      description: "Need Adobe Creative Cloud installed on new workstation for design team member.",
      status: "open", priority: "low", category: "Software",
      requester: "David Wilson", requesterEmail: "david.wilson@company.com",
      createdAt: "2024-02-15T09:45:00", updatedAt: "2024-02-15T09:45:00", dueDate: "2024-02-18T17:00:00",
      comments: [], attachments: [], timeSpent: "0", estimatedTime: "1",
    },
    {
      id: "TCK-1005", title: "Access Request to Finance Folder",
      description: "Request read access to the Finance shared folder on network drive for Q4 reports.",
      status: "pending-approval", priority: "medium", category: "Access",
      requester: "Emma Thompson", requesterEmail: "emma.thompson@company.com",
      createdAt: "2024-02-15T10:30:00", updatedAt: "2024-02-15T10:30:00", dueDate: "2024-02-17T17:00:00",
      comments: [], attachments: [], timeSpent: "0.5", estimatedTime: "1",
    },
  ]);

  const [resolvedTickets] = useState([
    { id: "TCK-0998", title: "Password Reset Completed",   status: "resolved", priority: "low",    category: "Account",  resolvedAt: "2024-02-14T16:30:00", timeSpent: "0h 15m", rating: 5 },
    { id: "TCK-0997", title: "Laptop Screen Replacement",  status: "resolved", priority: "high",   category: "Hardware", resolvedAt: "2024-02-13T11:00:00", timeSpent: "3h 20m", rating: 4 },
    { id: "TCK-0996", title: "WiFi Connection Fixed",      status: "resolved", priority: "medium", category: "Network",  resolvedAt: "2024-02-12T14:45:00", timeSpent: "1h 10m", rating: 5 },
  ]);

  const stats = {
    assigned: tickets.length,
    inProgress: tickets.filter(t => t.status === "in-progress").length,
    pending: tickets.filter(t => t.status === "open").length,
    resolvedToday: 3,
    resolvedThisWeek: resolvedTickets.length,
    avgResponseTime: "1.2h",
    avgResolutionTime: "4.5h",
    satisfactionRating: 4.8,
  };

  const filteredTickets = tickets.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const formatDate = (d) => {
    const date = new Date(d);
    const diff = Math.floor((new Date() - date) / 3600000);
    if (diff < 1) return "Just now";
    if (diff < 24) return `${diff}h ago`;
    const days = Math.floor(diff / 24);
    return days < 7 ? `${days}d ago` : date.toLocaleDateString();
  };

  const handleStatusChange = (id, newStatus) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    if (selectedTicket?.id === id) setSelectedTicket(prev => ({ ...prev, status: newStatus }));
  };

  const handleAddComment = (ticketId) => {
    if (!newComment.trim()) return;
    const comment = { id: Date.now(), author: "You", text: newComment, timestamp: new Date().toISOString(), isAgent: true };
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, comments: [...t.comments, comment] } : t));
    if (selectedTicket?.id === ticketId) setSelectedTicket(prev => ({ ...prev, comments: [...prev.comments, comment] }));
    setNewComment("");
  };

  const getPriorityStyle = (p) => ({
    high:   { background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" },
    medium: { background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.2)" },
    low:    { background: "rgba(226,232,240,0.08)", color: "#e2e8f0", border: "1px solid rgba(226,232,240,0.15)" },
  }[p] || {});

  const getStatusStyle = (s) => ({
    open:             { background: "rgba(148,163,184,0.1)", color: "#94a3b8" },
    "in-progress":    { background: "rgba(251,191,36,0.1)",  color: "#fbbf24" },
    resolved:         { background: "rgba(74,222,128,0.1)",  color: "#4ade80" },
    "pending-approval": { background: "rgba(167,139,250,0.1)", color: "#a78bfa" },
  }[s] || {});

  const navItems = [
    { id: "my-tickets",  label: "My Tickets",   icon: Activity,      badge: stats.assigned,           badgeColor: "rgba(255,255,255,0.9)", badgeBg: "rgba(255,255,255,0.15)" },
    { id: "resolved",    label: "Resolved",      icon: CheckCircle,   badge: resolvedTickets.length,   badgeColor: "#4ade80",               badgeBg: "rgba(74,222,128,0.15)"  },
    { id: "performance", label: "Performance",   icon: Target,        badge: null },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#080808", fontFamily: "'Nunito Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&family=Nunito+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

        @keyframes fadeUp   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-d  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes modalIn  { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }

        .nav-btn {
          width:100%; display:flex; align-items:center; gap:11px;
          padding:10px 14px; border-radius:12px; border:none;
          background:transparent; cursor:pointer; text-align:left;
          font-family:'Nunito Sans',sans-serif; font-size:14px;
          color:rgba(255,255,255,0.4); transition:all .2s;
        }
        .nav-btn:hover { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.8); }
        .nav-btn.active { background:rgba(255,255,255,0.08); color:#fff; font-weight:600; }

        .card {
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.07);
          border-radius:18px;
          transition:border-color .2s, background .2s;
        }
        .card:hover { border-color:rgba(255,255,255,0.12); }

        .ticket-card {
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.07);
          border-radius:16px; padding:22px;
          cursor:pointer; transition:all .2s;
          animation: fadeUp .4s ease both;
        }
        .ticket-card:hover {
          background:rgba(255,255,255,0.05);
          border-color:rgba(255,255,255,0.14);
          transform:translateY(-1px);
        }

        .filter-select {
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
          border-radius:10px; color:rgba(255,255,255,0.7); padding:8px 12px;
          font-family:'Nunito Sans',sans-serif; font-size:13px; outline:none; cursor:pointer;
        }
        .filter-select option { background:#1a1a1a; }

        .search-wrap { position:relative; flex:1; }
        .search-input {
          width:100%; padding:9px 14px 9px 38px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
          border-radius:10px; color:#fff; font-family:'Nunito Sans',sans-serif;
          font-size:13px; outline:none; transition:border-color .2s;
        }
        .search-input:focus { border-color:rgba(255,255,255,0.3); }
        .search-input::placeholder { color:rgba(255,255,255,0.22); }

        .start-btn {
          padding:7px 16px; border-radius:9px; border:none; cursor:pointer;
          background:#ffffff; color:#080808;
          font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:12px;
          transition:opacity .2s; white-space:nowrap; position:relative; overflow:hidden;
        }
        .start-btn::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);
          background-size:200% 100%; animation:shimmer 2.5s infinite;
        }
        .start-btn:hover { opacity:.85; }

        .resolve-btn {
          padding:7px 16px; border-radius:9px; border:none; cursor:pointer;
          background:rgba(74,222,128,0.15); color:#4ade80; border:1px solid rgba(74,222,128,0.25);
          font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:12px;
          transition:all .2s; white-space:nowrap;
        }
        .resolve-btn:hover { background:rgba(74,222,128,0.25); }

        .modal-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.75);
          display:flex; align-items:center; justify-content:center; z-index:200;
          backdrop-filter:blur(6px); padding:20px;
        }
        .modal-box {
          background:#0e0e0e; border:1px solid rgba(255,255,255,0.1);
          border-radius:20px; width:100%; max-width:760px;
          max-height:88vh; overflow:hidden; display:flex; flex-direction:column;
          animation:modalIn .25s ease both;
        }
        .modal-body { flex:1; overflow-y:auto; padding:24px; }

        .comment-input {
          flex:1; padding:12px 14px; border-radius:12px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
          color:#fff; font-family:'Nunito Sans',sans-serif; font-size:13px;
          outline:none; resize:none; transition:border-color .2s;
        }
        .comment-input:focus { border-color:rgba(255,255,255,0.3); }
        .comment-input::placeholder { color:rgba(255,255,255,0.2); }

        .send-btn {
          padding:10px 14px; border-radius:10px; border:none; cursor:pointer;
          background:#fff; color:#080808; display:flex; align-items:center;
          justify-content:center; align-self:flex-end; transition:opacity .2s;
        }
        .send-btn:hover { opacity:.85; }

        .progress-track {
          width:100%; height:4px; background:rgba(255,255,255,0.08);
          border-radius:999px; overflow:hidden; margin-top:4px;
        }
        .progress-fill {
          height:100%; background:#ffffff; border-radius:999px; transition:width .4s;
        }

        th {
          font-family:'Nunito Sans',sans-serif; font-size:11px;
          letter-spacing:.08em; text-transform:uppercase;
          color:rgba(255,255,255,0.28); font-weight:600;
          padding:10px 14px; text-align:left;
        }

        .stat-pill {
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
          border-radius:14px; padding:18px 22px; display:flex; align-items:center; gap:14px;
          animation:fadeUp .4s ease both;
        }

        .notif-panel {
          position:absolute; right:0; top:calc(100% + 8px); width:300px;
          background:#111; border:1px solid rgba(255,255,255,0.1);
          border-radius:14px; padding:16px; z-index:100;
        }
      `}</style>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:99 }} />
      )}

      {/* SIDEBAR */}
      <aside style={{
        width: 240, background: "#0d0d0d", borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column", padding: "24px 16px",
        height: "100vh", position: "sticky", top: 0, flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:32, padding:"0 6px" }}>
          <div style={{ width:8, height:8, background:"#fff", borderRadius:"50%", boxShadow:"0 0 10px 3px rgba(255,255,255,0.3)", animation:"pulse-d 2.5s infinite" }} />
          <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:15, color:"#fff", letterSpacing:"0.05em" }}>AI Ticket</span>
        </div>

        {/* Rating Card */}
        <div style={{
          background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)",
          borderRadius:16, padding:18, marginBottom:24,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Award size={18} style={{ color:"rgba(255,255,255,0.7)" }} />
            </div>
            <div>
              <p style={{ color:"rgba(255,255,255,0.35)", fontSize:11, margin:0, letterSpacing:"0.06em", textTransform:"uppercase" }}>Your Rating</p>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                <Star size={14} style={{ color:"#fbbf24", fill:"#fbbf24" }} />
                <span style={{ color:"#fff", fontWeight:700, fontSize:20, fontFamily:"'Nunito',sans-serif" }}>{stats.satisfactionRating}</span>
              </div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[{label:"Resolved", val:stats.resolvedThisWeek},{label:"Active", val:stats.assigned}].map(({label, val}) => (
              <div key={label} style={{ background:"rgba(255,255,255,0.06)", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                <p style={{ color:"#fff", fontWeight:700, fontSize:22, margin:0, fontFamily:"'Nunito',sans-serif" }}>{val}</p>
                <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, margin:0 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
          {navItems.map(({ id, label, icon: Icon, badge, badgeColor, badgeBg }) => (
            <button key={id} className={`nav-btn ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>
              <Icon size={16} />
              <span style={{ flex:1 }}>{label}</span>
              {badge !== null && (
                <span style={{ background: badgeBg || "rgba(255,255,255,0.1)", color: badgeColor || "rgba(255,255,255,0.6)", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:999 }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
          <button className="nav-btn" style={{ marginTop:8 }}><Settings size={16} /> Settings</button>
        </nav>

        {/* User */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:16, marginTop:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, padding:"0 6px" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"#fff", color:"#080808", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, flexShrink:0 }}>JD</div>
            <div>
              <p style={{ color:"#fff", fontSize:13, fontWeight:600, margin:0 }}>John Doe</p>
              <p style={{ color:"rgba(255,255,255,0.28)", fontSize:11, margin:0 }}>Support Agent</p>
            </div>
          </div>
          <button className="nav-btn"><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>
        {/* HEADER */}
        <header style={{
          background:"rgba(8,8,8,0.85)", backdropFilter:"blur(20px)",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          padding:"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between",
          position:"sticky", top:0, zIndex:50,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", display:"flex" }}>
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:20, color:"#fff", margin:0 }}>
                {activeTab === "my-tickets" && "My Assigned Tickets"}
                {activeTab === "resolved" && "Resolved Tickets"}
                {activeTab === "performance" && "My Performance"}
              </h1>
              <p style={{ color:"rgba(255,255,255,0.3)", fontSize:12, margin:0, marginTop:2 }}>
                {activeTab === "my-tickets" && `${stats.assigned} active tickets assigned to you`}
                {activeTab === "resolved" && `${resolvedTickets.length} completed this week`}
                {activeTab === "performance" && "Track your individual metrics"}
              </p>
            </div>
          </div>

          <div style={{ position:"relative" }}>
            <button onClick={() => setShowNotifications(!showNotifications)}
              style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"8px", cursor:"pointer", display:"flex", color:"rgba(255,255,255,0.5)", position:"relative" }}>
              <Bell size={16} />
              <span style={{ position:"absolute", top:8, right:8, width:7, height:7, background:"#f87171", borderRadius:"50%", border:"1px solid #080808" }} />
            </button>
            {showNotifications && (
              <div className="notif-panel">
                <p style={{ color:"#fff", fontWeight:700, fontSize:14, marginBottom:12 }}>Notifications</p>
                {[
                  { title:"New High Priority Ticket", desc:"TCK-1001 requires urgent attention", time:"10 min ago", color:"rgba(248,113,113,0.1)", border:"rgba(248,113,113,0.2)" },
                  { title:"Comment Added",            desc:"Alice replied to TCK-1001",          time:"30 min ago", color:"rgba(148,163,184,0.08)", border:"rgba(148,163,184,0.15)" },
                ].map((n, i) => (
                  <div key={i} style={{ background:n.color, border:`1px solid ${n.border}`, borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                    <p style={{ color:"#fff", fontSize:13, fontWeight:600, margin:0 }}>{n.title}</p>
                    <p style={{ color:"rgba(255,255,255,0.45)", fontSize:12, margin:"4px 0 0" }}>{n.desc}</p>
                    <p style={{ color:"rgba(255,255,255,0.22)", fontSize:11, margin:"4px 0 0" }}>{n.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        <div style={{ padding:"28px", flex:1 }}>

          {/* ══════════ MY TICKETS TAB ══════════ */}
          {activeTab === "my-tickets" && (
            <>
              {/* Quick Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:14, marginBottom:24 }}>
                {[
                  { label:"Open",           val:stats.pending,         icon:AlertCircle,  color:"#94a3b8", bg:"rgba(148,163,184,0.1)" },
                  { label:"In Progress",    val:stats.inProgress,      icon:Clock,        color:"#fbbf24", bg:"rgba(251,191,36,0.1)"  },
                  { label:"Resolved Today", val:stats.resolvedToday,   icon:CheckCircle,  color:"#4ade80", bg:"rgba(74,222,128,0.1)"  },
                  { label:"Avg Response",   val:stats.avgResponseTime, icon:TrendingUp,   color:"#fff",    bg:"rgba(255,255,255,0.08)" },
                ].map(({ label, val, icon: Icon, color, bg }, i) => (
                  <div key={label} className="stat-pill" style={{ animationDelay:`${i*0.07}s` }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div>
                      <p style={{ color:"rgba(255,255,255,0.3)", fontSize:12, margin:0 }}>{label}</p>
                      <p style={{ color:"#fff", fontWeight:700, fontSize:22, margin:0, fontFamily:"'Nunito',sans-serif" }}>{val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
                <div className="search-wrap">
                  <Search size={14} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.3)" }} />
                  <input type="text" placeholder="Search tickets..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)} className="search-input" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="pending-approval">Pending Approval</option>
                </select>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="filter-select">
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Ticket Cards */}
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {filteredTickets.map((ticket, i) => {
                  const progress = Math.min((parseFloat(ticket.timeSpent) / parseFloat(ticket.estimatedTime)) * 100, 100);
                  return (
                    <div key={ticket.id} className="ticket-card" style={{ animationDelay:`${i*0.06}s` }} onClick={() => setSelectedTicket(ticket)}>
                      <div style={{ display:"flex", gap:20, alignItems:"flex-start" }}>
                        {/* Left */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                            <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:"#94a3b8" }}>{ticket.id}</span>
                            <span style={{ ...getPriorityStyle(ticket.priority), padding:"2px 9px", borderRadius:6, fontSize:11, fontWeight:700, textTransform:"capitalize" }}>{ticket.priority}</span>
                            <span style={{ background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.45)", padding:"2px 9px", borderRadius:6, fontSize:11 }}>{ticket.category}</span>
                            <span style={{ ...getStatusStyle(ticket.status), padding:"2px 9px", borderRadius:6, fontSize:11, fontWeight:600, textTransform:"capitalize", marginLeft:"auto" }}>
                              {ticket.status.replace("-", " ")}
                            </span>
                          </div>
                          <h3 style={{ color:"#fff", fontWeight:600, fontSize:15, margin:"0 0 6px", fontFamily:"'Nunito',sans-serif" }}>{ticket.title}</h3>
                          <p style={{ color:"rgba(255,255,255,0.35)", fontSize:13, margin:"0 0 14px", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                            {ticket.description}
                          </p>

                          {/* Meta row */}
                          <div style={{ display:"flex", flexWrap:"wrap", gap:14, fontSize:12, color:"rgba(255,255,255,0.3)", marginBottom:14 }}>
                            <span style={{ display:"flex", alignItems:"center", gap:5 }}><User size={12}/>{ticket.requester}</span>
                            <span style={{ display:"flex", alignItems:"center", gap:5 }}><Calendar size={12}/>Created {formatDate(ticket.createdAt)}</span>
                            <span style={{ display:"flex", alignItems:"center", gap:5 }}><Clock size={12}/>Due {formatDate(ticket.dueDate)}</span>
                            {ticket.comments.length > 0 && <span style={{ display:"flex", alignItems:"center", gap:5 }}><MessageSquare size={12}/>{ticket.comments.length}</span>}
                            {ticket.attachments.length > 0 && <span style={{ display:"flex", alignItems:"center", gap:5 }}><Paperclip size={12}/>{ticket.attachments.length}</span>}
                          </div>

                          {/* Progress */}
                          <div>
                            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(255,255,255,0.25)", marginBottom:4 }}>
                              <span>Time spent: {ticket.timeSpent}h</span>
                              <span>Est: {ticket.estimatedTime}h</span>
                            </div>
                            <div className="progress-track">
                              <div className="progress-fill" style={{ width:`${progress}%`, background: progress > 80 ? "#f87171" : "#ffffff" }} />
                            </div>
                          </div>
                        </div>

                        {/* Right — Actions */}
                        <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0 }}>
                          {ticket.status === "open" && (
                            <button className="start-btn" onClick={e => { e.stopPropagation(); handleStatusChange(ticket.id, "in-progress"); }}>
                              Start Work
                            </button>
                          )}
                          {ticket.status === "in-progress" && (
                            <button className="resolve-btn" onClick={e => { e.stopPropagation(); handleStatusChange(ticket.id, "resolved"); }}>
                              Resolve
                            </button>
                          )}
                          <button style={{ background:"none", border:"none", color:"rgba(255,255,255,0.2)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:6 }}
                            onClick={e => { e.stopPropagation(); setSelectedTicket(ticket); }}>
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredTickets.length === 0 && (
                  <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,0.2)" }}>
                    <AlertCircle size={40} style={{ margin:"0 auto 12px", opacity:.4 }} />
                    <p style={{ fontSize:15 }}>No tickets found</p>
                    <p style={{ fontSize:13, marginTop:4 }}>Try adjusting your filters</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════════ RESOLVED TAB ══════════ */}
          {activeTab === "resolved" && (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {resolvedTickets.map((ticket, i) => (
                <div key={ticket.id} className="card" style={{ padding:22, animation:`fadeUp .4s ease ${i*0.07}s both` }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
                        <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:"#94a3b8" }}>{ticket.id}</span>
                        <span style={{ ...getPriorityStyle(ticket.priority), padding:"2px 9px", borderRadius:6, fontSize:11, fontWeight:700, textTransform:"capitalize" }}>{ticket.priority}</span>
                        <span style={{ background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.4)", padding:"2px 9px", borderRadius:6, fontSize:11 }}>{ticket.category}</span>
                      </div>
                      <h3 style={{ color:"#fff", fontWeight:600, fontSize:15, margin:"0 0 10px", fontFamily:"'Nunito',sans-serif" }}>{ticket.title}</h3>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:14, fontSize:12, color:"rgba(255,255,255,0.3)" }}>
                        <span style={{ display:"flex", alignItems:"center", gap:5, color:"#4ade80" }}><CheckCircle size={12}/>Resolved {formatDate(ticket.resolvedAt)}</span>
                        <span style={{ display:"flex", alignItems:"center", gap:5 }}><Clock size={12}/>Time: {ticket.timeSpent}</span>
                        <span style={{ display:"flex", alignItems:"center", gap:5, color:"#fbbf24" }}>
                          <Star size={12} style={{ fill:"#fbbf24" }}/>{ticket.rating}/5
                        </span>
                      </div>
                    </div>
                    <span style={{ ...getStatusStyle("resolved"), padding:"4px 12px", borderRadius:8, fontSize:12, fontWeight:600 }}>Resolved</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══════════ PERFORMANCE TAB ══════════ */}
          {activeTab === "performance" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
              {/* Top 3 metrics */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:14 }}>
                {[
                  { label:"Avg Response",    val:stats.avgResponseTime,  icon:Clock,       color:"#94a3b8", bg:"rgba(148,163,184,0.1)", note:"15% better than last week" },
                  { label:"Avg Resolution",  val:stats.avgResolutionTime,icon:CheckCircle, color:"#4ade80", bg:"rgba(74,222,128,0.1)",  note:"10% faster than average"   },
                  { label:"Satisfaction",    val:`${stats.satisfactionRating}/5`, icon:Star, color:"#fbbf24", bg:"rgba(251,191,36,0.1)", note:"Excellent performance"    },
                ].map(({ label, val, icon:Icon, color, bg, note }, i) => (
                  <div key={label} className="card" style={{ padding:22, animation:`fadeUp .4s ease ${i*0.08}s both` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                      <div style={{ width:42, height:42, borderRadius:12, background:bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Icon size={20} style={{ color }} />
                      </div>
                      <div>
                        <p style={{ color:"rgba(255,255,255,0.3)", fontSize:12, margin:0 }}>{label}</p>
                        <p style={{ color:"#fff", fontWeight:700, fontSize:24, margin:0, fontFamily:"'Nunito',sans-serif" }}>{val}</p>
                      </div>
                    </div>
                    <p style={{ color:"#4ade80", fontSize:12, margin:0, display:"flex", alignItems:"center", gap:5 }}>
                      <TrendingUp size={11}/>{note}
                    </p>
                  </div>
                ))}
              </div>

              {/* Weekly Summary */}
              <div className="card" style={{ padding:24 }}>
                <h3 style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:15, color:"#fff", margin:"0 0 18px" }}>This Week's Summary</h3>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:12 }}>
                  {[
                    { label:"Assigned",  val:stats.assigned,        color:"#94a3b8" },
                    { label:"Resolved",  val:stats.resolvedThisWeek,color:"#4ade80" },
                    { label:"In Progress",val:stats.inProgress,     color:"#fbbf24" },
                    { label:"Pending",   val:stats.pending,         color:"#a78bfa" },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"18px 16px", textAlign:"center" }}>
                      <p style={{ color, fontWeight:700, fontSize:32, margin:0, fontFamily:"'Nunito',sans-serif" }}>{val}</p>
                      <p style={{ color:"rgba(255,255,255,0.3)", fontSize:12, margin:"6px 0 0" }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Achievements */}
              <div className="card" style={{ padding:24 }}>
                <h3 style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:15, color:"#fff", margin:"0 0 16px" }}>Recent Achievements</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[
                    { title:"Fast Responder", desc:"Responded to 10 tickets within 1 hour", time:"Today",     icon:Award, color:"#fff",    bg:"rgba(255,255,255,0.07)", border:"rgba(255,255,255,0.1)" },
                    { title:"5-Star Rating",  desc:"Maintained perfect satisfaction rating", time:"This Week", icon:Star,  color:"#fbbf24", bg:"rgba(251,191,36,0.08)", border:"rgba(251,191,36,0.2)"  },
                  ].map(({ title, desc, time, icon:Icon, color, bg, border }) => (
                    <div key={title} style={{ display:"flex", alignItems:"center", gap:14, padding:16, background:bg, border:`1px solid ${border}`, borderRadius:14 }}>
                      <div style={{ width:42, height:42, borderRadius:12, background:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Icon size={18} style={{ color }} />
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ color:"#fff", fontWeight:600, fontSize:14, margin:0 }}>{title}</p>
                        <p style={{ color:"rgba(255,255,255,0.35)", fontSize:12, margin:"3px 0 0" }}>{desc}</p>
                      </div>
                      <span style={{ color:"rgba(255,255,255,0.25)", fontSize:11, flexShrink:0 }}>{time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ══════════ TICKET DETAIL MODAL ══════════ */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:"#94a3b8" }}>{selectedTicket.id}</span>
                <span style={{ ...getPriorityStyle(selectedTicket.priority), padding:"2px 9px", borderRadius:6, fontSize:11, fontWeight:700, textTransform:"capitalize" }}>{selectedTicket.priority}</span>
                <span style={{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.45)", padding:"2px 9px", borderRadius:6, fontSize:11 }}>{selectedTicket.category}</span>
              </div>
              <button onClick={() => setSelectedTicket(null)}
                style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:6, cursor:"pointer", display:"flex", color:"rgba(255,255,255,0.5)" }}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <h2 style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:22, color:"#fff", margin:"0 0 16px" }}>{selectedTicket.title}</h2>

              {/* Status + Actions */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22, flexWrap:"wrap" }}>
                <span style={{ ...getStatusStyle(selectedTicket.status), padding:"5px 14px", borderRadius:9, fontSize:12, fontWeight:600, textTransform:"capitalize" }}>
                  {selectedTicket.status.replace("-"," ")}
                </span>
                {selectedTicket.status === "open" && (
                  <button className="start-btn" onClick={() => handleStatusChange(selectedTicket.id, "in-progress")}>Start Work</button>
                )}
                {selectedTicket.status === "in-progress" && (
                  <button className="resolve-btn" onClick={() => handleStatusChange(selectedTicket.id, "resolved")}>Mark as Resolved</button>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom:20 }}>
                <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 8px" }}>Description</p>
                <p style={{ color:"rgba(255,255,255,0.6)", fontSize:14, lineHeight:1.7, margin:0 }}>{selectedTicket.description}</p>
              </div>

              {/* Metadata */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:18 }}>
                {[
                  { label:"Requester",     val:selectedTicket.requester },
                  { label:"Email",         val:selectedTicket.requesterEmail },
                  { label:"Created",       val:formatDate(selectedTicket.createdAt) },
                  { label:"Due Date",      val:formatDate(selectedTicket.dueDate) },
                  { label:"Time Tracking", val:`${selectedTicket.timeSpent}h / ${selectedTicket.estimatedTime}h` },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <p style={{ color:"rgba(255,255,255,0.25)", fontSize:11, margin:"0 0 3px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</p>
                    <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, fontWeight:500, margin:0 }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Attachments */}
              {selectedTicket.attachments.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 10px" }}>Attachments</p>
                  {selectedTicket.attachments.map(a => (
                    <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, marginBottom:8 }}>
                      <Paperclip size={14} style={{ color:"rgba(255,255,255,0.3)" }} />
                      <div style={{ flex:1 }}>
                        <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, margin:0 }}>{a.name}</p>
                        <p style={{ color:"rgba(255,255,255,0.25)", fontSize:11, margin:0 }}>{a.size}</p>
                      </div>
                      <button style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:12, cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif" }}>Download</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Comments */}
              <div style={{ marginBottom:20 }}>
                <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 12px" }}>
                  Comments ({selectedTicket.comments.length})
                </p>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {selectedTicket.comments.map(c => (
                    <div key={c.id} style={{
                      padding:"12px 14px", borderRadius:12,
                      background: c.isAgent ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${c.isAgent ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <span style={{ color:"#fff", fontSize:13, fontWeight:600 }}>{c.author}</span>
                        {c.isAgent && <span style={{ background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)", fontSize:10, padding:"1px 7px", borderRadius:999 }}>Agent</span>}
                        <span style={{ color:"rgba(255,255,255,0.25)", fontSize:11, marginLeft:"auto" }}>{formatDate(c.timestamp)}</span>
                      </div>
                      <p style={{ color:"rgba(255,255,255,0.55)", fontSize:13, margin:0, lineHeight:1.6 }}>{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Comment */}
              <div>
                <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 10px" }}>Add Comment</p>
                <div style={{ display:"flex", gap:10 }}>
                  <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                    placeholder="Type your comment..." rows={3} className="comment-input" />
                  <button className="send-btn" onClick={() => handleAddComment(selectedTicket.id)}>
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}