import { useState } from "react";
import {
  Search, Filter, UserPlus, MoreVertical, ChevronDown,
  Bell, Settings, LayoutDashboard, Ticket, BarChart3,
  LogOut, Users, X, CheckCircle, Clock, AlertCircle,
  RefreshCw, Download, Plus, Tag, Calendar, ArrowUpDown,
  Eye, Edit2, Trash2, ChevronLeft, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const teamMembers = ["John Doe", "Sarah Smith", "Mike Johnson", "Emily Chen"];

const allTickets = [
  { id: "TCK-1045", title: "Email not syncing with mobile",       priority: "high",   category: "Communication", response: "45 mins", assigned: "John Doe",     status: "in-progress", created: "2 hours ago",   requester: "Alice Johnson" },
  { id: "TCK-1044", title: "VPN connection timeout",              priority: "high",   category: "Network",       response: "1 hr",    assigned: "Sarah Smith",  status: "in-progress", created: "4 hours ago",   requester: "Bob Carter"   },
  { id: "TCK-1043", title: "Password reset request",              priority: "low",    category: "Account",       response: "15 mins", assigned: "Mike Johnson", status: "resolved",    created: "5 hours ago",   requester: "Carol Davis"  },
  { id: "TCK-1042", title: "Software installation needed",        priority: "medium", category: "Software",      response: "30 mins", assigned: "Emily Chen",   status: "in-progress", created: "6 hours ago",   requester: "David Lee"    },
  { id: "TCK-1041", title: "Printer not responding",             priority: "medium", category: "Hardware",      response: "1.5 hrs", assigned: "",             status: "open",        created: "8 hours ago",   requester: "Emma Wilson"  },
  { id: "TCK-1040", title: "Network drive access denied",         priority: "high",   category: "Network",       response: "2 hrs",   assigned: "John Doe",     status: "open",        created: "10 hours ago",  requester: "Frank Moore"  },
  { id: "TCK-1039", title: "Zoom audio not working",             priority: "medium", category: "Communication", response: "20 mins", assigned: "Sarah Smith",  status: "resolved",    created: "12 hours ago",  requester: "Grace Hall"   },
  { id: "TCK-1038", title: "Laptop battery draining fast",       priority: "low",    category: "Hardware",      response: "3 hrs",   assigned: "Emily Chen",   status: "open",        created: "1 day ago",     requester: "Henry Clark"  },
  { id: "TCK-1037", title: "Two-factor auth not sending codes",  priority: "high",   category: "Security",      response: "10 mins", assigned: "Mike Johnson", status: "in-progress", created: "1 day ago",     requester: "Isla Turner"  },
  { id: "TCK-1036", title: "Outlook crashing on startup",        priority: "medium", category: "Software",      response: "45 mins", assigned: "",             status: "open",        created: "2 days ago",    requester: "Jack Evans"   },
  { id: "TCK-1035", title: "Monitor flickering issue",           priority: "low",    category: "Hardware",      response: "1 hr",    assigned: "John Doe",     status: "resolved",    created: "2 days ago",    requester: "Karen Young"  },
  { id: "TCK-1034", title: "File server slow performance",       priority: "high",   category: "Network",       response: "30 mins", assigned: "Sarah Smith",  status: "in-progress", created: "3 days ago",    requester: "Liam Scott"   },
];

const ITEMS_PER_PAGE = 8;

export default function TicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState(allTickets);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortField, setSortField] = useState("id");
  const [sortDir, setSortDir] = useState("desc");
  const [assignModal, setAssignModal] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [detailTicket, setDetailTicket] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeNav, setActiveNav] = useState("tickets");
  const [showNotifications, setShowNotifications] = useState(false);

  const navItems = [
    { id: "overview",  label: "Dashboard",       icon: LayoutDashboard, path: "/teamlead" },
    { id: "tickets",   label: "Tickets",          icon: Ticket,          path: "/tickets"  },
    { id: "team",      label: "Team Performance", icon: Users,           path: "/teamlead" },
    { id: "analytics", label: "Analytics",        icon: BarChart3,       path: "/teamlead" },
  ];

  const categories = [...new Set(allTickets.map(t => t.category))];

  const filtered = tickets
    .filter(t => {
      const q = searchQuery.toLowerCase();
      const matchSearch = t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.requester.toLowerCase().includes(q) ||
        (t.assigned && t.assigned.toLowerCase().includes(q));
      const matchStatus   = filterStatus   === "all" || t.status   === filterStatus;
      const matchPriority = filterPriority === "all" || t.priority === filterPriority;
      const matchCategory = filterCategory === "all" || t.category === filterCategory;
      return matchSearch && matchStatus && matchPriority && matchCategory;
    })
    .sort((a, b) => {
      let av = a[sortField] ?? "", bv = b[sortField] ?? "";
      if (sortDir === "asc") return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const handleAssign = (ticketId) => {
    if (!selectedAgent) return;
    setTickets(prev => prev.map(t =>
      t.id === ticketId
        ? { ...t, assigned: selectedAgent, status: t.status === "open" ? "in-progress" : t.status }
        : t
    ));
    setAssignModal(null);
    setSelectedAgent("");
    if (detailTicket?.id === ticketId) setDetailTicket(prev => ({ ...prev, assigned: selectedAgent }));
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

  const stats = {
    total:      tickets.length,
    open:       tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in-progress").length,
    resolved:   tickets.filter(t => t.status === "resolved").length,
    unassigned: tickets.filter(t => !t.assigned).length,
  };

  const SortIcon = ({ field }) => (
    <ArrowUpDown size={11} style={{
      marginLeft: 4,
      opacity: sortField === field ? 1 : 0.3,
      color: sortField === field ? "#fff" : "inherit",
      verticalAlign: "middle",
    }} />
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#080808", fontFamily: "'Nunito Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&family=Nunito+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

        @keyframes fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-d  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes modalIn  { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }

        .nav-btn {
          width:100%; display:flex; align-items:center; gap:12px;
          padding:10px 14px; border-radius:12px; border:none;
          background:transparent; cursor:pointer; text-align:left;
          font-family:'Nunito Sans',sans-serif; font-size:14px;
          color:rgba(255,255,255,0.4); transition:all .2s;
        }
        .nav-btn:hover  { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.8); }
        .nav-btn.active { background:rgba(255,255,255,0.08); color:#fff; font-weight:600; }

        .stat-card {
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.07);
          border-radius:16px; padding:20px 24px;
          animation:fadeUp .4s ease both;
          transition:border-color .2s, background .2s;
        }
        .stat-card:hover { border-color:rgba(255,255,255,0.13); background:rgba(255,255,255,0.05); }

        .table-card {
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.07);
          border-radius:18px; overflow:hidden;
        }

        .ticket-row { transition:background .15s; cursor:pointer; }
        .ticket-row:hover { background:rgba(255,255,255,0.04); }

        .filter-sel {
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
          border-radius:10px; color:rgba(255,255,255,0.7); padding:8px 12px;
          font-family:'Nunito Sans',sans-serif; font-size:13px; outline:none; cursor:pointer;
        }
        .filter-sel option { background:#1a1a1a; }

        .assign-btn {
          display:inline-flex; align-items:center; gap:5px;
          padding:5px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.12);
          background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.6);
          font-size:11px; font-weight:600; cursor:pointer; transition:all .2s;
          font-family:'Nunito Sans',sans-serif;
        }
        .assign-btn:hover { background:rgba(255,255,255,0.1); color:#fff; border-color:rgba(255,255,255,0.25); }

        .modal-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.75);
          display:flex; align-items:center; justify-content:center; z-index:200;
          backdrop-filter:blur(6px);
        }
        .modal-box {
          background:#0e0e0e; border:1px solid rgba(255,255,255,0.1);
          border-radius:20px; width:100%; max-width:520px;
          animation:modalIn .25s ease both;
          overflow:hidden;
        }
        .assign-modal-box {
          background:#111; border:1px solid rgba(255,255,255,0.1);
          border-radius:18px; padding:28px; width:340px;
          animation:modalIn .25s ease both;
        }
        .modal-select {
          width:100%; padding:10px 14px; border-radius:10px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12);
          color:#fff; font-family:'Nunito Sans',sans-serif; font-size:14px;
          outline:none; margin:16px 0; cursor:pointer;
        }
        .modal-select option { background:#1a1a1a; }
        .modal-confirm {
          width:100%; padding:11px; border-radius:10px; border:none;
          background:#fff; color:#080808;
          font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:14px;
          cursor:pointer; transition:opacity .2s;
        }
        .modal-confirm:hover { opacity:.88; }
        .modal-cancel {
          width:100%; padding:11px; border-radius:10px;
          border:1px solid rgba(255,255,255,0.1);
          background:transparent; color:rgba(255,255,255,0.5);
          font-family:'Nunito Sans',sans-serif; font-size:14px;
          cursor:pointer; margin-top:8px; transition:color .2s;
        }
        .modal-cancel:hover { color:#fff; }

        .search-wrap { position:relative; flex:1; max-width:340px; }
        .search-input {
          width:100%; padding:9px 14px 9px 38px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
          border-radius:10px; color:#fff; font-family:'Nunito Sans',sans-serif;
          font-size:13px; outline:none; transition:border-color .2s;
        }
        .search-input:focus  { border-color:rgba(255,255,255,0.3); }
        .search-input::placeholder { color:rgba(255,255,255,0.25); }

        .export-btn {
          display:flex; align-items:center; gap:6px;
          padding:8px 16px; border-radius:10px; border:none;
          background:#fff; color:#080808;
          font-family:'Nunito Sans',sans-serif; font-weight:600; font-size:13px;
          cursor:pointer; transition:opacity .2s; position:relative; overflow:hidden;
        }
        .export-btn::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);
          background-size:200% 100%; animation:shimmer 2.5s infinite;
        }
        .export-btn:hover { opacity:.88; }

        .page-btn {
          width:32px; height:32px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);
          background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.5);
          display:flex; align-items:center; justify-content:center; cursor:pointer;
          transition:all .2s; font-family:'Nunito Sans',sans-serif; font-size:13px;
        }
        .page-btn:hover { background:rgba(255,255,255,0.08); color:#fff; }
        .page-btn.active { background:rgba(255,255,255,0.12); color:#fff; font-weight:700; border-color:rgba(255,255,255,0.25); }
        .page-btn:disabled { opacity:.3; cursor:default; }

        th {
          font-family:'Nunito Sans',sans-serif; font-size:11px; letter-spacing:.08em;
          text-transform:uppercase; color:rgba(255,255,255,0.3); font-weight:600;
          padding:12px 16px; cursor:pointer; user-select:none;
        }
        th:hover { color:rgba(255,255,255,0.6); }

        .notif-panel {
          position:absolute; right:0; top:calc(100% + 8px); width:300px;
          background:#111; border:1px solid rgba(255,255,255,0.1);
          border-radius:14px; padding:16px; z-index:100;
        }

        .detail-label {
          color:rgba(255,255,255,0.25); font-size:11px; text-transform:uppercase;
          letter-spacing:.07em; margin:0 0 4px; font-family:'Nunito Sans',sans-serif;
        }
        .detail-value {
          color:rgba(255,255,255,0.75); font-size:14px; font-weight:500; margin:0;
          font-family:'Nunito Sans',sans-serif;
        }
      `}</style>

      {/* ─── ASSIGN MODAL ─── */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="assign-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ color:"#fff", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:18, marginBottom:4 }}>Assign Ticket</h3>
            <p style={{ color:"rgba(255,255,255,0.35)", fontSize:13, margin:0 }}>{assignModal}</p>
            <select className="modal-select" value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
              <option value="">Select an agent...</option>
              {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button className="modal-confirm" onClick={() => handleAssign(assignModal)}>Confirm Assignment</button>
            <button className="modal-cancel" onClick={() => setAssignModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ─── TICKET DETAIL MODAL ─── */}
      {detailTicket && (
        <div className="modal-overlay" onClick={() => setDetailTicket(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:"#94a3b8" }}>{detailTicket.id}</span>
                <span style={{ ...getPriorityStyle(detailTicket.priority), padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:700, textTransform:"capitalize" }}>{detailTicket.priority}</span>
              </div>
              <button onClick={() => setDetailTicket(null)}
                style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:6, cursor:"pointer", display:"flex", color:"rgba(255,255,255,0.5)" }}>
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding:24 }}>
              <h2 style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:20, color:"#fff", margin:"0 0 6px" }}>{detailTicket.title}</h2>
              <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
                <span style={{ ...getStatusStyle(detailTicket.status), padding:"4px 12px", borderRadius:8, fontSize:12, fontWeight:600, textTransform:"capitalize" }}>
                  {detailTicket.status.replace("-"," ")}
                </span>
                <span style={{ background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.4)", padding:"4px 12px", borderRadius:8, fontSize:12 }}>
                  {detailTicket.category}
                </span>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:24 }}>
                {[
                  { label:"Requester",   val:detailTicket.requester },
                  { label:"Created",     val:detailTicket.created },
                  { label:"Response",    val:detailTicket.response },
                  { label:"Assigned To", val:detailTicket.assigned || "Unassigned" },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <p className="detail-label">{label}</p>
                    <p className="detail-value">{val}</p>
                  </div>
                ))}
              </div>

              <button className="assign-btn" style={{ padding:"9px 18px", fontSize:13 }}
                onClick={() => { setAssignModal(detailTicket.id); setSelectedAgent(detailTicket.assigned || ""); setDetailTicket(null); }}>
                <UserPlus size={13} />
                {detailTicket.assigned ? "Reassign Agent" : "Assign Agent"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SIDEBAR ─── */}
      <aside style={{
        width:240, background:"#0d0d0d", borderRight:"1px solid rgba(255,255,255,0.06)",
        display:"flex", flexDirection:"column", padding:"24px 16px",
        height:"100vh", position:"sticky", top:0, flexShrink:0,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:36, padding:"0 6px" }}>
          <div style={{ width:8, height:8, background:"#fff", borderRadius:"50%", boxShadow:"0 0 10px 3px rgba(255,255,255,0.3)", animation:"pulse-d 2.5s ease infinite" }} />
          <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:15, color:"#fff", letterSpacing:"0.05em" }}>AI Ticket</span>
        </div>

        <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
          {navItems.map(({ id, label, icon: Icon, path }) => (
            <button key={id}
              className={`nav-btn ${activeNav === id ? "active" : ""}`}
              onClick={() => { setActiveNav(id); navigate(path); }}>
              <Icon size={16} /> {label}
            </button>
          ))}
          <button className="nav-btn" style={{ marginTop:8 }}><Settings size={16} /> Settings</button>
        </nav>

        <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:16, marginTop:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, padding:"0 6px" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", color:"#080808", fontWeight:700, fontSize:13, flexShrink:0 }}>TL</div>
            <div>
              <p style={{ color:"#fff", fontSize:13, fontWeight:600, margin:0 }}>Team Lead</p>
              <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, margin:0 }}>admin@company.com</p>
            </div>
          </div>
          <button className="nav-btn"><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>

        {/* HEADER */}
        <header style={{
          background:"rgba(8,8,8,0.9)", backdropFilter:"blur(20px)",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          padding:"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between",
          position:"sticky", top:0, zIndex:50,
        }}>
          <div>
            <h1 style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:20, color:"#fff", margin:0 }}>
              Ticket Management
            </h1>
            <p style={{ color:"rgba(255,255,255,0.3)", fontSize:12, margin:0, marginTop:2 }}>
              {filtered.length} tickets · {stats.unassigned} unassigned
            </p>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"8px", cursor:"pointer", display:"flex", color:"rgba(255,255,255,0.5)" }}>
              <RefreshCw size={16} />
            </button>
            <div style={{ position:"relative" }}>
              <button onClick={() => setShowNotifications(!showNotifications)}
                style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"8px", cursor:"pointer", display:"flex", color:"rgba(255,255,255,0.5)", position:"relative" }}>
                <Bell size={16} />
                <span style={{ position:"absolute", top:8, right:8, width:7, height:7, background:"#f87171", borderRadius:"50%", border:"1px solid #080808" }} />
              </button>
              {showNotifications && (
                <div className="notif-panel">
                  <p style={{ color:"#fff", fontWeight:700, marginBottom:12, fontSize:14 }}>Notifications</p>
                  {[
                    { title:"High Priority Ticket", desc:"TCK-1045 requires immediate attention", time:"2 min ago", color:"rgba(248,113,113,0.1)", border:"rgba(248,113,113,0.2)" },
                    { title:"Ticket Resolved", desc:"Sarah resolved TCK-1040", time:"15 min ago", color:"rgba(74,222,128,0.1)", border:"rgba(74,222,128,0.2)" },
                  ].map((n, i) => (
                    <div key={i} style={{ background:n.color, border:`1px solid ${n.border}`, borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                      <p style={{ color:"#fff", fontSize:13, fontWeight:600, margin:0 }}>{n.title}</p>
                      <p style={{ color:"rgba(255,255,255,0.5)", fontSize:12, margin:"4px 0 0" }}>{n.desc}</p>
                      <p style={{ color:"rgba(255,255,255,0.25)", fontSize:11, margin:"4px 0 0" }}>{n.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="export-btn"><Download size={14} /> Export CSV</button>
          </div>
        </header>

        <div style={{ padding:"28px", flex:1 }}>

          {/* ── STAT PILLS ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:24 }}>
            {[
              { label:"Total",      val:stats.total,      color:"#fff",    icon:Ticket,       bg:"rgba(255,255,255,0.08)" },
              { label:"Open",       val:stats.open,       color:"#94a3b8", icon:AlertCircle,  bg:"rgba(148,163,184,0.1)"  },
              { label:"In Progress",val:stats.inProgress, color:"#fbbf24", icon:Clock,        bg:"rgba(251,191,36,0.1)"   },
              { label:"Resolved",   val:stats.resolved,   color:"#4ade80", icon:CheckCircle,  bg:"rgba(74,222,128,0.1)"   },
              { label:"Unassigned", val:stats.unassigned, color:"#f87171", icon:UserPlus,     bg:"rgba(248,113,113,0.1)"  },
            ].map(({ label, val, color, icon:Icon, bg }, i) => (
              <div key={label} className="stat-card" style={{ animationDelay:`${i*0.07}s`, display:"flex", alignItems:"center", gap:14 }}>
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

          {/* ── FILTERS ── */}
          <div style={{
            display:"flex", alignItems:"center", gap:10, marginBottom:20,
            flexWrap:"wrap", padding:"16px 20px",
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)",
            borderRadius:14,
          }}>
            {/* Search */}
            <div className="search-wrap">
              <Search size={14} style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.3)" }} />
              <input type="text" placeholder="Search tickets, agents, requesters..." value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="search-input" />
            </div>

            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginLeft:"auto" }}>
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="filter-sel">
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setCurrentPage(1); }} className="filter-sel">
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }} className="filter-sel">
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* ── TABLE ── */}
          <div className="table-card" style={{ marginBottom:20 }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                    <th onClick={() => handleSort("id")}         style={{ textAlign:"left" }}>Ticket ID <SortIcon field="id"/></th>
                    <th onClick={() => handleSort("title")}      style={{ textAlign:"left" }}>Title <SortIcon field="title"/></th>
                    <th onClick={() => handleSort("requester")}  style={{ textAlign:"left" }}>Requester <SortIcon field="requester"/></th>
                    <th onClick={() => handleSort("priority")}   style={{ textAlign:"center" }}>Priority <SortIcon field="priority"/></th>
                    <th onClick={() => handleSort("category")}   style={{ textAlign:"center" }}>Category <SortIcon field="category"/></th>
                    <th onClick={() => handleSort("status")}     style={{ textAlign:"center" }}>Status <SortIcon field="status"/></th>
                    <th style={{ textAlign:"center" }}>Response</th>
                    <th onClick={() => handleSort("assigned")}   style={{ textAlign:"center" }}>Assigned To <SortIcon field="assigned"/></th>
                    <th onClick={() => handleSort("created")}    style={{ textAlign:"left" }}>Created <SortIcon field="created"/></th>
                    <th style={{ textAlign:"center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((ticket, i) => (
                    <tr key={ticket.id} className="ticket-row"
                      style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}
                      onClick={() => setDetailTicket(ticket)}>

                      <td style={{ padding:"14px 16px", color:"#94a3b8", fontFamily:"monospace", fontSize:12, fontWeight:700 }}>{ticket.id}</td>

                      <td style={{ padding:"14px 16px", color:"#fff", fontWeight:500, maxWidth:200 }}>
                        <span style={{ display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{ticket.title}</span>
                      </td>

                      <td style={{ padding:"14px 16px", color:"rgba(255,255,255,0.5)", fontSize:12 }}>{ticket.requester}</td>

                      <td style={{ padding:"14px 16px", textAlign:"center" }}>
                        <span style={{ ...getPriorityStyle(ticket.priority), padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:700, textTransform:"capitalize" }}>
                          {ticket.priority}
                        </span>
                      </td>

                      <td style={{ padding:"14px 16px", textAlign:"center" }}>
                        <span style={{ background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.5)", padding:"3px 10px", borderRadius:6, fontSize:11 }}>
                          {ticket.category}
                        </span>
                      </td>

                      <td style={{ padding:"14px 16px", textAlign:"center" }}>
                        <span style={{ ...getStatusStyle(ticket.status), padding:"3px 10px", borderRadius:6, fontSize:11, fontWeight:600, textTransform:"capitalize" }}>
                          {ticket.status.replace("-"," ")}
                        </span>
                      </td>

                      <td style={{ padding:"14px 16px", textAlign:"center", color:"rgba(255,255,255,0.5)", fontSize:12 }}>{ticket.response}</td>

                      <td style={{ padding:"14px 16px", textAlign:"center" }}>
                        {ticket.assigned ? (
                          <div style={{ display:"flex", alignItems:"center", gap:7, justifyContent:"center" }}>
                            <div style={{ width:26, height:26, borderRadius:"50%", background:"#fff", color:"#080808", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, flexShrink:0 }}>
                              {ticket.assigned.split(" ").map(n => n[0]).join("")}
                            </div>
                            <span style={{ color:"rgba(255,255,255,0.65)", fontSize:12 }}>{ticket.assigned}</span>
                          </div>
                        ) : (
                          <span style={{ color:"rgba(255,255,255,0.2)", fontSize:12 }}>Unassigned</span>
                        )}
                      </td>

                      <td style={{ padding:"14px 16px", color:"rgba(255,255,255,0.3)", fontSize:12, whiteSpace:"nowrap" }}>{ticket.created}</td>

                      <td style={{ padding:"14px 16px", textAlign:"center" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"center" }}>
                          <button className="assign-btn"
                            onClick={e => { e.stopPropagation(); setAssignModal(ticket.id); setSelectedAgent(ticket.assigned || ""); }}>
                            <UserPlus size={11} />
                            {ticket.assigned ? "Reassign" : "Assign"}
                          </button>
                          <button style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.2)", display:"flex", padding:4 }}
                            onClick={e => { e.stopPropagation(); setDetailTicket(ticket); }}>
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,0.2)" }}>
                  <AlertCircle size={36} style={{ margin:"0 auto 12px", opacity:.4 }} />
                  <p style={{ fontSize:15, margin:0 }}>No tickets found</p>
                  <p style={{ fontSize:13, marginTop:6, color:"rgba(255,255,255,0.15)" }}>Try adjusting your filters</p>
                </div>
              )}
            </div>
          </div>

          {/* ── PAGINATION ── */}
          {totalPages > 1 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <p style={{ color:"rgba(255,255,255,0.3)", fontSize:13, margin:0 }}>
                Showing {((currentPage-1)*ITEMS_PER_PAGE)+1}–{Math.min(currentPage*ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div style={{ display:"flex", gap:6 }}>
                <button className="page-btn" disabled={currentPage===1} onClick={() => setCurrentPage(p=>p-1)}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_,i) => i+1).map(p => (
                  <button key={p} className={`page-btn ${currentPage===p?"active":""}`} onClick={() => setCurrentPage(p)}>{p}</button>
                ))}
                <button className="page-btn" disabled={currentPage===totalPages} onClick={() => setCurrentPage(p=>p+1)}>
                  <ChevronRightIcon size={14} />
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}