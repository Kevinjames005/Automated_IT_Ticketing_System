import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Clock, CheckCircle, AlertCircle, Calendar, User,
  Bell, Settings, LogOut, Menu, X,
  Send, Star, TrendingUp, Activity, Award, Target, ChevronRight,
  RefreshCw, AlertTriangle,
} from "lucide-react";
import supabase from "../supabaseClient";

// ─────────────────────────────────────────────────────────────────────────────
// API HELPER
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = "http://localhost:8000";

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  return session.access_token;
}

async function apiFetch(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALISE backend ticket row → UI shape
// ─────────────────────────────────────────────────────────────────────────────
function normaliseTicket(t) {
  const statusMap = {
    "Open":        "open",
    "Assigned":    "open",
    "In Progress": "in-progress",
    "Resolved":    "pending-approval",
    "Closed":      "resolved",
  };
  return {
    id:            `TCK-${t.ticket_id}`,
    rawId:         t.ticket_id,
    rawStatus:     t.status,
    title:         t.subject || "(no subject)",
    status:        statusMap[t.status] ?? "open",
    priority:      (t.priority || "low").toLowerCase(),
    category:      t.category || "General",
    createdAt:     t.created_at,
    assignedAt:    t.assigned_at,
    closedAt:      t.closed_at,
    reopen_count:  t.reopen_count || 0,
    sla: {
      response_sla_status:        t.response_sla_status        || "healthy",
      resolution_sla_status:      t.resolution_sla_status      || "healthy",
      response_elapsed_minutes:   t.response_elapsed_minutes   ?? null,
      resolution_elapsed_minutes: t.resolution_elapsed_minutes ?? null,
      response_remaining_minutes: t.response_remaining_minutes ?? null,
      resolution_remaining_minutes: t.resolution_remaining_minutes ?? null,
    },
    comments:    [],
    attachments: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function TeamMemberDashboard() {
  const navigate = useNavigate();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sidebarOpen,       setSidebarOpen]       = useState(false);
  const [activeTab,         setActiveTab]         = useState("my-tickets");
  const [searchQuery,       setSearchQuery]       = useState("");
  const [filterStatus,      setFilterStatus]      = useState("all");
  const [filterPriority,    setFilterPriority]    = useState("all");
  const [selectedTicket,    setSelectedTicket]    = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newComment,        setNewComment]        = useState("");
  const [resolveText,       setResolveText]       = useState("");
  const [showResolveInput,  setShowResolveInput]  = useState(false);

  // ── Data state ────────────────────────────────────────────────────────────
  const [tickets,         setTickets]         = useState([]);
  const [resolvedTickets, setResolvedTickets] = useState([]);
  const [analytics,       setAnalytics]       = useState(null);
  const [memberPerf,      setMemberPerf]      = useState([]);
  const [currentUser,     setCurrentUser]     = useState(null);

  // ── Loading / error state ─────────────────────────────────────────────────
  const [loading,       setLoading]       = useState({ tickets: true, resolved: true, analytics: true, perf: true });
  const [errors,        setErrors]        = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError,   setActionError]   = useState("");

  // ── Load current user identity ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: memberRow } = await supabase
          .from("team_members")
          .select("member_id, name")
          .eq("supabase_user_id", user.id)
          .single();
        setCurrentUser({
          id:        user.id,
          email:     user.email,
          name:      memberRow?.name || user.email,
          member_id: memberRow?.member_id || null,
        });
      } catch (e) {
        console.error("Could not load user identity:", e);
      }
    })();
  }, []);

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const loadActiveTickets = useCallback(async () => {
    setLoading(l => ({ ...l, tickets: true }));
    setErrors(e => ({ ...e, tickets: null }));
    try {
      const [assigned, inProgress] = await Promise.all([
        apiFetch("/tickets?status=Assigned&limit=100"),
        apiFetch("/tickets?status=In%20Progress&limit=100"),
      ]);
      setTickets([
        ...(assigned.tickets    || []),
        ...(inProgress.tickets  || []),
      ].map(normaliseTicket));
    } catch (e) {
      setErrors(prev => ({ ...prev, tickets: e.message }));
    } finally {
      setLoading(l => ({ ...l, tickets: false }));
    }
  }, []);

  const loadResolvedTickets = useCallback(async () => {
    setLoading(l => ({ ...l, resolved: true }));
    setErrors(e => ({ ...e, resolved: null }));
    try {
      const [resolved, closed] = await Promise.all([
        apiFetch("/tickets?status=Resolved&limit=100"),
        apiFetch("/tickets?status=Closed&limit=100"),
      ]);
      setResolvedTickets([
        ...(resolved.tickets || []),
        ...(closed.tickets   || []),
      ].map(normaliseTicket));
    } catch (e) {
      setErrors(prev => ({ ...prev, resolved: e.message }));
    } finally {
      setLoading(l => ({ ...l, resolved: false }));
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(l => ({ ...l, analytics: true }));
    try {
      const data = await apiFetch("/analytics?range=7days");
      setAnalytics(data);
    } catch (e) {
      setErrors(prev => ({ ...prev, analytics: e.message }));
    } finally {
      setLoading(l => ({ ...l, analytics: false }));
    }
  }, []);

  const loadPerformance = useCallback(async () => {
    setLoading(l => ({ ...l, perf: true }));
    try {
      const data = await apiFetch("/analytics/members?range=30days");
      setMemberPerf(data.members || []);
    } catch (e) {
      setErrors(prev => ({ ...prev, perf: e.message }));
    } finally {
      setLoading(l => ({ ...l, perf: false }));
    }
  }, []);

  useEffect(() => {
    loadActiveTickets();
    loadResolvedTickets();
    loadAnalytics();
    loadPerformance();
  }, [loadActiveTickets, loadResolvedTickets, loadAnalytics, loadPerformance]);

  const refreshAll = () => {
    loadActiveTickets();
    loadResolvedTickets();
    loadAnalytics();
    loadPerformance();
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const myPerf = currentUser?.member_id && memberPerf.length
    ? memberPerf.find(m => m.member_id === currentUser.member_id) || null
    : memberPerf.length ? memberPerf[0] : null;

  const stats = {
    assigned:          tickets.length,
    inProgress:        tickets.filter(t => t.status === "in-progress").length,
    pending:           tickets.filter(t => t.status === "open").length,
    resolvedThisWeek:  resolvedTickets.length,
    avgResponseTime:   analytics ? `${(analytics.average_response_time_minutes / 60).toFixed(1)}h`   : "—",
    avgResolutionTime: analytics ? `${(analytics.average_resolution_time_minutes / 60).toFixed(1)}h` : "—",
  };

  const filteredTickets = tickets.filter(t => {
    const matchSearch   = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus   = filterStatus   === "all" || t.status   === filterStatus;
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const slaAlerts = tickets.filter(t =>
    t.sla?.response_sla_status !== "healthy" || t.sla?.resolution_sla_status !== "healthy"
  );

  // ── Formatters ────────────────────────────────────────────────────────────
  const formatDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    const diff = Math.floor((new Date() - date) / 3600000);
    if (diff < 1)  return "Just now";
    if (diff < 24) return `${diff}h ago`;
    const days = Math.floor(diff / 24);
    return days < 7 ? `${days}d ago` : date.toLocaleDateString();
  };

  const fmtMins = (mins) => {
    if (mins == null) return "—";
    if (mins < 60)   return `${Math.round(mins)}m`;
    return `${(mins / 60).toFixed(1)}h`;
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleStartTicket = async (ticketId) => {
    if (!currentUser?.member_id) { setActionError("Cannot determine your member ID."); return; }
    setActionLoading(true); setActionError("");
    try {
      await apiFetch("/start-ticket", {
        method: "POST",
        body: JSON.stringify({ ticket_id: ticketId, member_id: currentUser.member_id }),
      });
      const updated = (t) => t.rawId === ticketId ? { ...t, status: "in-progress", rawStatus: "In Progress" } : t;
      setTickets(prev => prev.map(updated));
      setSelectedTicket(prev => prev ? updated(prev) : prev);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveTicket = async (ticketId) => {
    if (!resolveText.trim())      { setActionError("Please enter resolution notes."); return; }
    if (!currentUser?.member_id)  { setActionError("Cannot determine your member ID."); return; }
    setActionLoading(true); setActionError("");
    try {
      await apiFetch("/resolve-ticket", {
        method: "POST",
        body: JSON.stringify({ ticket_id: ticketId, member_id: currentUser.member_id, resolution_text: resolveText }),
      });
      const resolved = tickets.find(t => t.rawId === ticketId);
      if (resolved) setResolvedTickets(prev => [{ ...resolved, status: "pending-approval", rawStatus: "Resolved" }, ...prev]);
      setTickets(prev => prev.filter(t => t.rawId !== ticketId));
      setSelectedTicket(null);
      setResolveText(""); setShowResolveInput(false);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = (ticketId) => {
    if (!newComment.trim()) return;
    const comment = { id: Date.now(), author: "You", text: newComment, timestamp: new Date().toISOString(), isAgent: true };
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, comments: [...t.comments, comment] } : t));
    setSelectedTicket(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : prev);
    setNewComment("");
  };

  const openModal = (t) => { setSelectedTicket(t); setShowResolveInput(false); setActionError(""); setResolveText(""); };
  const closeModal = () => { setSelectedTicket(null); setShowResolveInput(false); setActionError(""); setResolveText(""); };

  // ── Style helpers ─────────────────────────────────────────────────────────
  const getPriorityStyle = (p) => ({
    high:   { background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" },
    medium: { background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.2)" },
    low:    { background: "rgba(226,232,240,0.08)", color: "#e2e8f0", border: "1px solid rgba(226,232,240,0.15)" },
  }[p] || {});

  const getStatusStyle = (s) => ({
    "open":               { background: "rgba(148,163,184,0.1)", color: "#94a3b8" },
    "in-progress":        { background: "rgba(251,191,36,0.1)",  color: "#fbbf24" },
    "resolved":           { background: "rgba(74,222,128,0.1)",  color: "#4ade80" },
    "pending-approval":   { background: "rgba(167,139,250,0.1)", color: "#a78bfa" },
  }[s] || { background: "rgba(148,163,184,0.1)", color: "#94a3b8" });

  const getSlaColor = (status) => ({
    healthy:  "#4ade80",
    at_risk:  "#fbbf24",
    breached: "#f87171",
  }[status] || "#94a3b8");

  const gradeColor = (g) => ({ A: "#4ade80", B: "#fbbf24", C: "#fb923c", D: "#f87171" }[g] || "#94a3b8");

  const navItems = [
    { id: "my-tickets",  label: "My Tickets",  icon: Activity,    badge: stats.assigned,         badgeColor: "rgba(255,255,255,0.9)", badgeBg: "rgba(255,255,255,0.15)" },
    { id: "resolved",    label: "Resolved",     icon: CheckCircle, badge: resolvedTickets.length, badgeColor: "#4ade80",               badgeBg: "rgba(74,222,128,0.15)"  },
    { id: "performance", label: "Performance",  icon: Target,      badge: null },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#080808", fontFamily: "'Nunito Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&family=Nunito+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-d { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes modalIn { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
        @keyframes spin    { to{transform:rotate(360deg)} }

        .nav-btn { width:100%; display:flex; align-items:center; gap:11px; padding:10px 14px; border-radius:12px; border:none; background:transparent; cursor:pointer; text-align:left; font-family:'Nunito Sans',sans-serif; font-size:14px; color:rgba(255,255,255,0.4); transition:all .2s; }
        .nav-btn:hover  { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.8); }
        .nav-btn.active { background:rgba(255,255,255,0.08); color:#fff; font-weight:600; }

        .card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:18px; transition:border-color .2s,background .2s; }
        .card:hover { border-color:rgba(255,255,255,0.12); }

        .ticket-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:22px; cursor:pointer; transition:all .2s; animation:fadeUp .4s ease both; }
        .ticket-card:hover { background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.14); transform:translateY(-1px); }

        .filter-select { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:rgba(255,255,255,0.7); padding:8px 12px; font-family:'Nunito Sans',sans-serif; font-size:13px; outline:none; cursor:pointer; }
        .filter-select option { background:#1a1a1a; }

        .search-wrap { position:relative; flex:1; }
        .search-input { width:100%; padding:9px 14px 9px 38px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; font-family:'Nunito Sans',sans-serif; font-size:13px; outline:none; transition:border-color .2s; }
        .search-input:focus { border-color:rgba(255,255,255,0.3); }
        .search-input::placeholder { color:rgba(255,255,255,0.22); }

        .start-btn { padding:7px 16px; border-radius:9px; border:none; cursor:pointer; background:#ffffff; color:#080808; font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:12px; transition:opacity .2s; white-space:nowrap; position:relative; overflow:hidden; }
        .start-btn::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent); background-size:200% 100%; animation:shimmer 2.5s infinite; }
        .start-btn:hover    { opacity:.85; }
        .start-btn:disabled { opacity:.4; cursor:default; }

        .resolve-btn { padding:7px 16px; border-radius:9px; border:none; cursor:pointer; background:rgba(74,222,128,0.15); color:#4ade80; border:1px solid rgba(74,222,128,0.25); font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:12px; transition:all .2s; white-space:nowrap; }
        .resolve-btn:hover    { background:rgba(74,222,128,0.25); }
        .resolve-btn:disabled { opacity:.4; cursor:default; }

        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; z-index:200; backdrop-filter:blur(6px); padding:20px; }
        .modal-box     { background:#0e0e0e; border:1px solid rgba(255,255,255,0.1); border-radius:20px; width:100%; max-width:760px; max-height:88vh; overflow:hidden; display:flex; flex-direction:column; animation:modalIn .25s ease both; }
        .modal-body    { flex:1; overflow-y:auto; padding:24px; }

        .comment-input  { flex:1; padding:12px 14px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; font-family:'Nunito Sans',sans-serif; font-size:13px; outline:none; resize:none; transition:border-color .2s; }
        .comment-input:focus  { border-color:rgba(255,255,255,0.3); }
        .comment-input::placeholder { color:rgba(255,255,255,0.2); }

        .resolve-textarea { width:100%; padding:12px 14px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(74,222,128,0.2); color:#fff; font-family:'Nunito Sans',sans-serif; font-size:13px; outline:none; resize:none; transition:border-color .2s; margin-top:8px; }
        .resolve-textarea:focus { border-color:rgba(74,222,128,0.5); }
        .resolve-textarea::placeholder { color:rgba(255,255,255,0.2); }

        .send-btn { padding:10px 14px; border-radius:10px; border:none; cursor:pointer; background:#fff; color:#080808; display:flex; align-items:center; justify-content:center; align-self:flex-end; transition:opacity .2s; }
        .send-btn:hover { opacity:.85; }

        .progress-track { width:100%; height:4px; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden; margin-top:4px; }
        .progress-fill  { height:100%; background:#ffffff; border-radius:999px; transition:width .4s; }

        th { font-family:'Nunito Sans',sans-serif; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:rgba(255,255,255,0.28); font-weight:600; padding:10px 14px; text-align:left; }

        .stat-pill { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px 22px; display:flex; align-items:center; gap:14px; animation:fadeUp .4s ease both; }

        .notif-panel { position:absolute; right:0; top:calc(100% + 8px); width:310px; background:#111; border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding:16px; z-index:100; }

        .spin { animation:spin 1s linear infinite; }

        .error-bar { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.2); border-radius:12px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
      `}</style>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:99 }} />
      )}

      {/* ══════════ SIDEBAR ══════════════════════════════════════════════════ */}
      <aside style={{ width:240, background:"#0d0d0d", borderRight:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", padding:"24px 16px", height:"100vh", position:"sticky", top:0, flexShrink:0 }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:32, padding:"0 6px" }}>
          <div style={{ width:8, height:8, background:"#fff", borderRadius:"50%", boxShadow:"0 0 10px 3px rgba(255,255,255,0.3)", animation:"pulse-d 2.5s infinite" }} />
          <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:15, color:"#fff", letterSpacing:"0.05em" }}>AI Ticket</span>
        </div>

        {/* Performance Card */}
        <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:18, marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:"rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Award size={18} style={{ color:"rgba(255,255,255,0.7)" }} />
            </div>
            <div>
              <p style={{ color:"rgba(255,255,255,0.35)", fontSize:11, margin:0, letterSpacing:"0.06em", textTransform:"uppercase" }}>Performance</p>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                <Star size={14} style={{ color:"#fbbf24", fill:"#fbbf24" }} />
                <span style={{ color: myPerf ? gradeColor(myPerf.performance_grade) : "#fff", fontWeight:700, fontSize:20, fontFamily:"'Nunito',sans-serif" }}>
                  {myPerf ? myPerf.performance_grade : loading.perf ? "…" : "—"}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              { label:"Resolved", val: loading.resolved ? "…" : resolvedTickets.length },
              { label:"Active",   val: loading.tickets  ? "…" : tickets.length },
            ].map(({ label, val }) => (
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

        {/* User info */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:16, marginTop:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, padding:"0 6px" }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"#fff", color:"#080808", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, flexShrink:0 }}>
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "?"}
            </div>
            <div>
              <p style={{ color:"#fff", fontSize:13, fontWeight:600, margin:0 }}>{currentUser?.name || "Loading…"}</p>
              <p style={{ color:"rgba(255,255,255,0.28)", fontSize:11, margin:0 }}>Support Agent</p>
            </div>
          </div>
          <button className="nav-btn" onClick={() => supabase.auth.signOut().then(() => navigate("/"))}><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      {/* ══════════ MAIN ═════════════════════════════════════════════════════ */}
      <main style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column" }}>

        {/* HEADER */}
        <header style={{ background:"rgba(8,8,8,0.85)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", display:"flex" }}>
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:20, color:"#fff", margin:0 }}>
                {activeTab === "my-tickets"  && "My Assigned Tickets"}
                {activeTab === "resolved"    && "Resolved Tickets"}
                {activeTab === "performance" && "My Performance"}
              </h1>
              <p style={{ color:"rgba(255,255,255,0.3)", fontSize:12, margin:"2px 0 0" }}>
                {activeTab === "my-tickets"  && `${stats.assigned} active tickets assigned to you`}
                {activeTab === "resolved"    && `${resolvedTickets.length} completed`}
                {activeTab === "performance" && "Track your individual metrics"}
              </p>
            </div>
          </div>

          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {/* Refresh */}
            <button onClick={refreshAll} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:8, cursor:"pointer", display:"flex", color:"rgba(255,255,255,0.5)" }}>
              <RefreshCw size={16} />
            </button>

            {/* Notifications */}
            <div style={{ position:"relative" }}>
              <button onClick={() => setShowNotifications(!showNotifications)}
                style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:8, cursor:"pointer", display:"flex", color:"rgba(255,255,255,0.5)", position:"relative" }}>
                <Bell size={16} />
                {slaAlerts.length > 0 && (
                  <span style={{ position:"absolute", top:6, right:6, width:7, height:7, background:"#f87171", borderRadius:"50%", border:"1px solid #080808" }} />
                )}
              </button>

              {showNotifications && (
                <div className="notif-panel">
                  <p style={{ color:"#fff", fontWeight:700, fontSize:14, marginBottom:12 }}>SLA Alerts</p>
                  {slaAlerts.length === 0 ? (
                    <p style={{ color:"rgba(255,255,255,0.3)", fontSize:13 }}>No SLA alerts — all clear!</p>
                  ) : slaAlerts.slice(0, 5).map(t => (
                    <div key={t.id} style={{ background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                      <p style={{ color:"#fff", fontSize:13, fontWeight:600, margin:0 }}>{t.id}</p>
                      <p style={{ color:"rgba(255,255,255,0.45)", fontSize:12, margin:"3px 0 0" }}>{t.title.slice(0, 45)}{t.title.length > 45 ? "…" : ""}</p>
                      <p style={{ color:"#f87171", fontSize:11, margin:"4px 0 0" }}>
                        {t.sla.resolution_sla_status === "breached" ? "Resolution SLA breached" :
                         t.sla.resolution_sla_status === "at_risk"  ? "Resolution SLA at risk"  :
                         t.sla.response_sla_status   === "breached" ? "Response SLA breached"   : "Response SLA at risk"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <div style={{ padding:"28px", flex:1 }}>

          {/* ══════════ MY TICKETS TAB ═══════════════════════════════════════ */}
          {activeTab === "my-tickets" && (
            <div style={{ animation:"fadeUp .4s ease both" }}>

              {/* Stats pills */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:28 }}>
                {[
                  { label:"Total Assigned",   val: loading.tickets   ? "…" : stats.assigned,          icon: Activity,    color:"rgba(255,255,255,0.7)" },
                  { label:"In Progress",       val: loading.tickets   ? "…" : stats.inProgress,        icon: Clock,       color:"#fbbf24" },
                  { label:"Open / Waiting",    val: loading.tickets   ? "…" : stats.pending,           icon: AlertCircle, color:"#94a3b8" },
                  { label:"Avg Response",      val: loading.analytics ? "…" : stats.avgResponseTime,   icon: TrendingUp,  color:"#4ade80" },
                  { label:"Avg Resolution",    val: loading.analytics ? "…" : stats.avgResolutionTime, icon: CheckCircle, color:"#a78bfa" },
                ].map(({ label, val, icon: Icon, color }, i) => (
                  <div key={label} className="stat-pill" style={{ animationDelay:`${i*0.06}s` }}>
                    <div style={{ width:38, height:38, borderRadius:12, background:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <div>
                      <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, margin:0, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</p>
                      <p style={{ color:"#fff", fontWeight:700, fontSize:20, margin:0, fontFamily:"'Nunito',sans-serif" }}>{val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
                <div className="search-wrap">
                  <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.25)", pointerEvents:"none" }} />
                  <input className="search-input" placeholder="Search tickets…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="pending-approval">Pending Approval</option>
                </select>
                <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Error */}
              {errors.tickets && (
                <div className="error-bar">
                  <AlertTriangle size={14} style={{ color:"#f87171", flexShrink:0 }} />
                  <span style={{ color:"#f87171", fontSize:13 }}>{errors.tickets}</span>
                </div>
              )}

              {/* Ticket list */}
              {loading.tickets ? (
                <div style={{ display:"flex", justifyContent:"center", padding:80 }}>
                  <RefreshCw size={26} className="spin" style={{ color:"rgba(255,255,255,0.15)" }} />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div style={{ textAlign:"center", padding:80 }}>
                  <CheckCircle size={44} style={{ color:"rgba(255,255,255,0.08)", margin:"0 auto 14px", display:"block" }} />
                  <p style={{ color:"rgba(255,255,255,0.22)", fontSize:14 }}>No tickets match your filters</p>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {filteredTickets.map((t, i) => (
                    <div key={t.id} className="ticket-card" style={{ animationDelay:`${i*0.05}s` }} onClick={() => openModal(t)}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          {/* Badges row */}
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
                            <span style={{ fontFamily:"monospace", fontSize:12, color:"rgba(255,255,255,0.3)", fontWeight:700 }}>{t.id}</span>
                            <span style={{ ...getPriorityStyle(t.priority), padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, textTransform:"capitalize" }}>{t.priority}</span>
                            <span style={{ ...getStatusStyle(t.status), padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:600, textTransform:"capitalize" }}>{t.status.replace("-"," ")}</span>
                            {t.sla?.resolution_sla_status !== "healthy" && (
                              <span style={{ background:`rgba(${t.sla.resolution_sla_status==="breached"?"248,113,113":"251,191,36"},0.12)`, color: getSlaColor(t.sla.resolution_sla_status), border:`1px solid rgba(${t.sla.resolution_sla_status==="breached"?"248,113,113":"251,191,36"},0.25)`, padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700 }}>
                                SLA {t.sla.resolution_sla_status.replace("_"," ")}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <p style={{ color:"#fff", fontWeight:600, fontSize:15, margin:"0 0 8px", fontFamily:"'Nunito',sans-serif" }}>{t.title}</p>

                          {/* Meta */}
                          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                            <span style={{ color:"rgba(255,255,255,0.3)", fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
                              <Calendar size={11} /> {formatDate(t.createdAt)}
                            </span>
                            <span style={{ color:"rgba(255,255,255,0.3)", fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
                              <User size={11} /> {t.category}
                            </span>
                            {t.sla?.resolution_elapsed_minutes != null && (
                              <span style={{ fontSize:12, display:"flex", alignItems:"center", gap:4, color: getSlaColor(t.sla.resolution_sla_status) }}>
                                <Clock size={11} /> {fmtMins(t.sla.resolution_elapsed_minutes)} elapsed
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} style={{ color:"rgba(255,255,255,0.15)", flexShrink:0, marginTop:2 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════ RESOLVED TAB ═════════════════════════════════════════ */}
          {activeTab === "resolved" && (
            <div style={{ animation:"fadeUp .4s ease both" }}>
              {errors.resolved && (
                <div className="error-bar">
                  <AlertTriangle size={14} style={{ color:"#f87171", flexShrink:0 }} />
                  <span style={{ color:"#f87171", fontSize:13 }}>{errors.resolved}</span>
                </div>
              )}

              {loading.resolved ? (
                <div style={{ display:"flex", justifyContent:"center", padding:80 }}>
                  <RefreshCw size={26} className="spin" style={{ color:"rgba(255,255,255,0.15)" }} />
                </div>
              ) : (
                <div className="card" style={{ overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                        <th>Ticket</th>
                        <th>Subject</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Category</th>
                        <th>Closed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedTickets.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding:60, textAlign:"center", color:"rgba(255,255,255,0.2)", fontSize:13 }}>
                            No resolved tickets yet
                          </td>
                        </tr>
                      ) : resolvedTickets.map(t => (
                        <tr key={t.id}
                          style={{ borderBottom:"1px solid rgba(255,255,255,0.04)", cursor:"pointer", transition:"background .15s" }}
                          onClick={() => openModal(t)}
                          onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.025)"}
                          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                          <td style={{ padding:"12px 14px", fontFamily:"monospace", fontSize:12, color:"rgba(255,255,255,0.35)", fontWeight:700 }}>{t.id}</td>
                          <td style={{ padding:"12px 14px", color:"rgba(255,255,255,0.7)", fontSize:13 }}>{t.title}</td>
                          <td style={{ padding:"12px 14px" }}>
                            <span style={{ ...getPriorityStyle(t.priority), padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, textTransform:"capitalize" }}>{t.priority}</span>
                          </td>
                          <td style={{ padding:"12px 14px" }}>
                            <span style={{ ...getStatusStyle(t.status), padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:600, textTransform:"capitalize" }}>{t.status.replace("-"," ")}</span>
                          </td>
                          <td style={{ padding:"12px 14px", color:"rgba(255,255,255,0.4)", fontSize:13 }}>{t.category}</td>
                          <td style={{ padding:"12px 14px", color:"rgba(255,255,255,0.3)", fontSize:12 }}>{formatDate(t.closedAt || t.assignedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════ PERFORMANCE TAB ══════════════════════════════════════ */}
          {activeTab === "performance" && (
            <div style={{ animation:"fadeUp .4s ease both" }}>
              {(loading.perf || loading.analytics) ? (
                <div style={{ display:"flex", justifyContent:"center", padding:80 }}>
                  <RefreshCw size={26} className="spin" style={{ color:"rgba(255,255,255,0.15)" }} />
                </div>
              ) : (
                <>
                  {/* My metrics grid */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:14, marginBottom:28 }}>
                    {[
                      { label:"Tickets Handled",    val: myPerf?.tickets_handled                         ?? "—", icon: Activity,    color:"rgba(255,255,255,0.7)" },
                      { label:"Avg Response Time",   val: fmtMins(myPerf?.average_response_time_minutes),       icon: Clock,       color:"#fbbf24" },
                      { label:"Avg Resolution Time", val: fmtMins(myPerf?.average_resolution_time_minutes),     icon: CheckCircle, color:"#4ade80" },
                      { label:"SLA Breaches",        val: myPerf?.sla_breaches                           ?? "—", icon: AlertCircle, color:"#f87171" },
                      { label:"SLA Breach Rate",     val: myPerf ? `${myPerf.sla_breach_rate_percent}%`  : "—", icon: Target,      color:"#a78bfa" },
                      { label:"Reopens",             val: myPerf?.reopens                                ?? "—", icon: RefreshCw,   color:"#94a3b8" },
                      { label:"Performance Grade",   val: myPerf?.performance_grade                      ?? "—", icon: Award,       color:"#fbbf24" },
                    ].map(({ label, val, icon: Icon, color }, i) => (
                      <div key={label} className="stat-pill" style={{ animationDelay:`${i*0.06}s` }}>
                        <div style={{ width:38, height:38, borderRadius:12, background:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Icon size={16} style={{ color }} />
                        </div>
                        <div>
                          <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, margin:0, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</p>
                          <p style={{ color: label === "Performance Grade" && myPerf ? gradeColor(myPerf.performance_grade) : "#fff", fontWeight:700, fontSize:20, margin:0, fontFamily:"'Nunito',sans-serif" }}>{val}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Team comparison */}
                  {memberPerf.length > 0 && (
                    <div className="card" style={{ overflow:"hidden" }}>
                      <div style={{ padding:"18px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                        <p style={{ color:"#fff", fontWeight:700, fontSize:15, margin:0, fontFamily:"'Nunito',sans-serif" }}>Team Performance</p>
                        <p style={{ color:"rgba(255,255,255,0.3)", fontSize:12, margin:"4px 0 0" }}>Last 30 days</p>
                      </div>
                      <table style={{ width:"100%", borderCollapse:"collapse" }}>
                        <thead>
                          <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                            <th>Member</th>
                            <th>Tickets</th>
                            <th>Avg Response</th>
                            <th>Avg Resolution</th>
                            <th>SLA Breach Rate</th>
                            <th>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {memberPerf.map(m => {
                            const isMe = m.member_id === currentUser?.member_id;
                            return (
                              <tr key={m.member_id}
                                style={{ borderBottom:"1px solid rgba(255,255,255,0.04)", background: isMe ? "rgba(255,255,255,0.025)" : "transparent" }}>
                                <td style={{ padding:"12px 14px", color:"rgba(255,255,255,0.75)", fontSize:13, fontWeight: isMe ? 700 : 400 }}>
                                  {m.name}
                                  {isMe && <span style={{ color:"rgba(255,255,255,0.3)", fontWeight:400, fontSize:11, marginLeft:6 }}>(you)</span>}
                                </td>
                                <td style={{ padding:"12px 14px", color:"rgba(255,255,255,0.5)", fontSize:13 }}>{m.tickets_handled}</td>
                                <td style={{ padding:"12px 14px", color:"rgba(255,255,255,0.5)", fontSize:13 }}>{fmtMins(m.average_response_time_minutes)}</td>
                                <td style={{ padding:"12px 14px", color:"rgba(255,255,255,0.5)", fontSize:13 }}>{fmtMins(m.average_resolution_time_minutes)}</td>
                                <td style={{ padding:"12px 14px", fontSize:13 }}>
                                  <span style={{ color: m.sla_breach_rate_percent <= 10 ? "#4ade80" : m.sla_breach_rate_percent <= 30 ? "#fbbf24" : "#f87171" }}>
                                    {m.sla_breach_rate_percent}%
                                  </span>
                                </td>
                                <td style={{ padding:"12px 14px" }}>
                                  <span style={{ fontWeight:700, fontSize:16, fontFamily:"'Nunito',sans-serif", color: gradeColor(m.performance_grade) }}>
                                    {m.performance_grade}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ══════════ TICKET DETAIL MODAL ══════════════════════════════════════ */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:"#94a3b8" }}>{selectedTicket.id}</span>
                <span style={{ ...getPriorityStyle(selectedTicket.priority), padding:"2px 9px", borderRadius:6, fontSize:11, fontWeight:700, textTransform:"capitalize" }}>{selectedTicket.priority}</span>
                <span style={{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.45)", padding:"2px 9px", borderRadius:6, fontSize:11 }}>{selectedTicket.category}</span>
              </div>
              <button onClick={closeModal} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:6, cursor:"pointer", display:"flex", color:"rgba(255,255,255,0.5)" }}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <h2 style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:22, color:"#fff", margin:"0 0 16px" }}>{selectedTicket.title}</h2>

              {/* Status + action buttons */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, flexWrap:"wrap" }}>
                <span style={{ ...getStatusStyle(selectedTicket.status), padding:"5px 14px", borderRadius:9, fontSize:12, fontWeight:600, textTransform:"capitalize" }}>
                  {selectedTicket.status.replace("-"," ")}
                </span>

                {/* Start Work */}
                {(selectedTicket.rawStatus === "Assigned" || selectedTicket.status === "open") && !showResolveInput && (
                  <button className="start-btn" disabled={actionLoading} onClick={() => handleStartTicket(selectedTicket.rawId)}>
                    {actionLoading ? "Starting…" : "Start Work"}
                  </button>
                )}

                {/* Mark as Resolved trigger */}
                {(selectedTicket.rawStatus === "In Progress" || selectedTicket.status === "in-progress") && !showResolveInput && (
                  <button className="resolve-btn" disabled={actionLoading} onClick={() => setShowResolveInput(true)}>
                    Mark as Resolved
                  </button>
                )}
              </div>

              {/* Resolve input panel */}
              {showResolveInput && (
                <div style={{ marginBottom:24, background:"rgba(74,222,128,0.04)", border:"1px solid rgba(74,222,128,0.15)", borderRadius:14, padding:16 }}>
                  <p style={{ color:"#4ade80", fontSize:12, fontWeight:700, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.06em" }}>Resolution Notes</p>
                  <p style={{ color:"rgba(255,255,255,0.3)", fontSize:12, margin:"0 0 0" }}>Describe what was done to resolve this ticket.</p>
                  <textarea
                    className="resolve-textarea"
                    rows={4}
                    placeholder="e.g. Reset VPN credentials and updated the client config file. Issue resolved."
                    value={resolveText}
                    onChange={e => setResolveText(e.target.value)}
                  />
                  <div style={{ display:"flex", gap:10, marginTop:12 }}>
                    <button className="resolve-btn" disabled={actionLoading} onClick={() => handleResolveTicket(selectedTicket.rawId)}>
                      {actionLoading ? "Submitting…" : "Submit Resolution"}
                    </button>
                    <button onClick={() => { setShowResolveInput(false); setResolveText(""); }}
                      style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)", borderRadius:9, padding:"7px 14px", color:"rgba(255,255,255,0.4)", fontSize:12, cursor:"pointer", fontFamily:"'Nunito Sans',sans-serif" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Action error */}
              {actionError && (
                <div className="error-bar" style={{ marginBottom:20 }}>
                  <AlertTriangle size={14} style={{ color:"#f87171", flexShrink:0 }} />
                  <span style={{ color:"#f87171", fontSize:13 }}>{actionError}</span>
                </div>
              )}

              {/* Ticket metadata */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:22, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:14, padding:18 }}>
                {[
                  { label:"Category",           val: selectedTicket.category },
                  { label:"Created",             val: formatDate(selectedTicket.createdAt) },
                  { label:"Assigned At",         val: formatDate(selectedTicket.assignedAt) },
                  { label:"Reopen Count",        val: selectedTicket.reopen_count },
                  { label:"Response SLA",        val: selectedTicket.sla?.response_sla_status?.replace("_"," ")    || "—" },
                  { label:"Resolution SLA",      val: selectedTicket.sla?.resolution_sla_status?.replace("_"," ")  || "—" },
                  { label:"Time Elapsed",        val: fmtMins(selectedTicket.sla?.resolution_elapsed_minutes) },
                  { label:"Time Remaining",      val: fmtMins(selectedTicket.sla?.resolution_remaining_minutes) },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <p style={{ color:"rgba(255,255,255,0.25)", fontSize:11, margin:"0 0 3px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</p>
                    <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, fontWeight:500, margin:0, textTransform:"capitalize" }}>{String(val)}</p>
                  </div>
                ))}
              </div>

              {/* Comments */}
              <div style={{ marginBottom:20 }}>
                <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 12px" }}>
                  Comments ({selectedTicket.comments.length})
                </p>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {selectedTicket.comments.length === 0 && (
                    <p style={{ color:"rgba(255,255,255,0.2)", fontSize:13 }}>No comments yet.</p>
                  )}
                  {selectedTicket.comments.map(c => (
                    <div key={c.id} style={{ padding:"12px 14px", borderRadius:12, background: c.isAgent ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)", border:`1px solid ${c.isAgent ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}` }}>
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

              {/* Add comment */}
              <div>
                <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", margin:"0 0 10px" }}>Add Comment</p>
                <div style={{ display:"flex", gap:10 }}>
                  <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                    placeholder="Type your comment…" rows={3} className="comment-input" />
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