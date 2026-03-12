import { useState, useEffect, useRef } from "react";
import {
  Search, Clock, CheckCircle, AlertCircle, Calendar,
  Bell, Settings, LogOut, Menu, X, Send,
  Star, TrendingUp, Activity, Award, Target,
  ChevronRight, RefreshCw, Shield, Zap, AlertTriangle,
} from "lucide-react";
import { apiFetch } from "./api";
import supabase from "./supabaseClient";
import { useNavigate } from "react-router-dom";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 1)    return "Just now";
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function fmtMins(mins) {
  if (!mins && mins !== 0) return "—";
  if (mins < 60) return `${Math.round(mins)}m`;
  return `${(mins / 60).toFixed(1)}h`;
}

function SlaBadge({ status }) {
  const map = {
    healthy:  { color: "#4ade80", bg: "rgba(74,222,128,0.1)",   border: "rgba(74,222,128,0.2)",   icon: "✓", label: "Healthy"  },
    at_risk:  { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.2)",   icon: "⚡", label: "At Risk"  },
    breached: { color: "#f87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.2)",  icon: "⚠", label: "Breached" },
  };
  const s = map[status] || map.healthy;
  return (
    <span style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {s.icon} {s.label}
    </span>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

export default function TeamMemberDashboard() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser]       = useState(null);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [activeTab, setActiveTab]           = useState("my-tickets");
  const [searchQuery, setSearchQuery]       = useState("");
  const [filterStatus, setFilterStatus]     = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNotif, setShowNotif]           = useState(false);

  const [tickets, setTickets]             = useState([]);
  const [closedTickets, setClosedTickets] = useState([]);
  const [reassignedTickets, setReassignedTickets] = useState([]); // ✅ new
  const [perfData, setPerfData]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const [resolveModal, setResolveModal]     = useState(null);
  const [resolutionText, setResolutionText] = useState("");
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError]     = useState("");

  const [startLoading, setStartLoading] = useState(null);
  const [actionError, setActionError]   = useState("");
  const [notifications, setNotifications] = useState([]);

  // ── load identity ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadIdentity() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/"); return; }
      const email    = session.user.email;
      const name     = session.user.user_metadata?.name || email.split("@")[0];
      const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

      let member_id = null;
      try {
        const res = await apiFetch("/members");
        const match = (res.members || []).find(m =>
          m.email === email || m.name?.toLowerCase() === name.toLowerCase()
        );
        if (match) member_id = match.member_id;
      } catch (e) {
        console.error("Could not resolve member_id:", e.message);
      }
      setCurrentUser({ email, name, initials, member_id });
    }
    loadIdentity();
  }, []);

  // ✅ Only load tickets once currentUser (and member_id) is resolved
  useEffect(() => {
    if (currentUser) loadTickets();
  }, [currentUser]);

  // ── fetch tickets ──────────────────────────────────────────────────────────
  async function loadTickets(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const memberId = currentUser?.member_id;
      const [assignedRes, closedRes, perfRes] = await Promise.all([
        apiFetch(`/tickets?member_id=${memberId}&limit=100`),
        apiFetch(`/tickets?member_id=${memberId}&status=Closed&limit=50`),
        apiFetch("/analytics/members?range=7days"),
      ]);

      const all = assignedRes.tickets || [];
      const active = all.filter(t =>
        ["Assigned", "In Progress", "Resolved"].includes(t.status)
      );
      // ✅ Reassigned = Assigned tickets that have been reopened (reopen_count > 0)
      const reassigned = all.filter(t => t.status === "Assigned" && t.reopen_count > 0);
      setTickets(active);
      setReassignedTickets(reassigned);
      setClosedTickets(closedRes.tickets || []);

      // ✅ Match perf data to the logged-in member by member_id
      const members = perfRes.members || [];
      const myPerf = members.find(m => m.member_id === currentUser?.member_id) || null;
      setPerfData(myPerf);
    } catch (e) {
      console.error("Load tickets error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ── start ticket: Assigned → In Progress ──────────────────────────────────
  async function handleStart(ticket) {
    setStartLoading(ticket.ticket_id);
    setActionError("");
    try {
      await apiFetch("/start-ticket", {
        method: "POST",
        body: JSON.stringify({
          ticket_id: ticket.ticket_id,
          member_id: currentUser.member_id,
        }),
      });

      // ✅ Optimistic update: Assigned → In Progress
      setTickets(prev =>
        prev.map(t =>
          t.ticket_id === ticket.ticket_id ? { ...t, status: "In Progress" } : t
        )
      );
      if (selectedTicket?.ticket_id === ticket.ticket_id)
        setSelectedTicket(prev => ({ ...prev, status: "In Progress" }));

      pushNotif({
        title: "Ticket Started",
        desc: `TCK-${ticket.ticket_id} is now In Progress`,
        color: "rgba(96,165,250,0.1)",
        border: "rgba(96,165,250,0.2)",
      });
    } catch (e) {
      setActionError(e.message);
    } finally {
      setStartLoading(null);
    }
  }

  // ── resolve ticket: In Progress → Resolved ────────────────────────────────
  async function handleResolve() {
    if (!resolutionText.trim()) { setResolveError("Resolution notes are required."); return; }
    setResolveLoading(true);
    setResolveError("");
    try {
      await apiFetch("/resolve-ticket", {
        method: "POST",
        body: JSON.stringify({
          ticket_id:       resolveModal.ticket_id,
          member_id:       currentUser.member_id,
          resolution_text: resolutionText,
        }),
      });

      // ✅ Optimistic update: In Progress → Resolved
      setTickets(prev =>
        prev.map(t =>
          t.ticket_id === resolveModal.ticket_id ? { ...t, status: "Resolved" } : t
        )
      );
      if (selectedTicket?.ticket_id === resolveModal.ticket_id)
        setSelectedTicket(prev => ({ ...prev, status: "Resolved" }));

      pushNotif({
        title: "Team Lead Notified ✓",
        desc: `TCK-${resolveModal.ticket_id} resolved — awaiting approval`,
        color: "rgba(167,139,250,0.1)",
        border: "rgba(167,139,250,0.2)",
      });

      setResolveModal(null);
      setResolutionText("");
    } catch (e) {
      setResolveError(e.message);
    } finally {
      setResolveLoading(false);
    }
  }

  function pushNotif({ title, desc, color, border }) {
    setNotifications(prev => [
      { id: Date.now(), title, desc, time: "Just now", color, border },
      ...prev.slice(0, 4),
    ]);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  // ── filters ────────────────────────────────────────────────────────────────
  const filteredTickets = tickets.filter(t => {
    const q = searchQuery.toLowerCase();
    const matchSearch   = t.subject?.toLowerCase().includes(q) || String(t.ticket_id).includes(q);
    const matchStatus   = filterStatus   === "all" || t.status === filterStatus;
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  // ── stats ──────────────────────────────────────────────────────────────────
  // ✅ Counts match backend status strings exactly
  const stats = {
    assigned:   tickets.filter(t => t.status === "Assigned").length,
    inProgress: tickets.filter(t => t.status === "In Progress").length,
    resolved:   tickets.filter(t => t.status === "Resolved").length,
    closed:     closedTickets.length,
  };

  // ── style helpers ──────────────────────────────────────────────────────────
  const getPriorityStyle = p => ({
    high:   { background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" },
    medium: { background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)" },
    low:    { background: "rgba(226,232,240,0.08)", color: "#e2e8f0", border: "1px solid rgba(226,232,240,0.15)" },
  }[p?.toLowerCase()] || {});

  // ✅ All 5 statuses covered including "Assigned"
  const getStatusStyle = s => ({
    Assigned:      { background: "rgba(251,191,36,0.1)",  color: "#fbbf24" },
    "In Progress": { background: "rgba(96,165,250,0.1)",  color: "#60a5fa" },
    Resolved:      { background: "rgba(167,139,250,0.1)", color: "#a78bfa" },
    Closed:        { background: "rgba(74,222,128,0.1)",  color: "#4ade80" },
    Pending:       { background: "rgba(148,163,184,0.1)", color: "#94a3b8" },
  }[s] || { background: "rgba(148,163,184,0.1)", color: "#94a3b8" });

  const worstSla = t => {
    if ([t.response_sla_status, t.resolution_sla_status].includes("breached")) return "breached";
    if ([t.response_sla_status, t.resolution_sla_status].includes("at_risk"))  return "at_risk";
    return "healthy";
  };

  const navItems = [
    { id: "my-tickets",  label: "My Tickets",  icon: Activity,    badge: tickets.length },
    { id: "reassigned",  label: "Reassigned",  icon: AlertTriangle, badge: reassignedTickets.length },
    { id: "closed",      label: "Closed",       icon: CheckCircle, badge: closedTickets.length },
    { id: "performance", label: "Performance",  icon: Target,      badge: null },
  ];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#080808", fontFamily: "'Nunito Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&family=Nunito+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-d { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes modalIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        @keyframes spin    { to { transform:rotate(360deg); } }
        .nav-btn {
          width:100%; display:flex; align-items:center; gap:11px;
          padding:10px 14px; border-radius:12px; border:none;
          background:transparent; cursor:pointer; text-align:left;
          font-family:'Nunito Sans',sans-serif; font-size:14px;
          color:rgba(255,255,255,0.4); transition:all .2s;
        }
        .nav-btn:hover  { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.8); }
        .nav-btn.active { background:rgba(255,255,255,0.08); color:#fff; font-weight:600; }
        .card {
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
          border-radius:18px; transition:border-color .2s, background .2s;
        }
        .card:hover { border-color:rgba(255,255,255,0.12); }
        .ticket-card {
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
          border-radius:16px; padding:22px; cursor:pointer;
          transition:all .2s; animation:fadeUp .4s ease both;
        }
        .ticket-card:hover {
          background:rgba(255,255,255,0.05); border-color:rgba(255,255,255,0.14);
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
        .start-btn:disabled { opacity:.5; cursor:not-allowed; }
        .resolve-btn {
          padding:7px 16px; border-radius:9px; cursor:pointer;
          background:rgba(167,139,250,0.15); color:#a78bfa;
          border:1px solid rgba(167,139,250,0.3);
          font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:12px;
          transition:all .2s; white-space:nowrap;
        }
        .resolve-btn:hover { background:rgba(167,139,250,0.25); }
        .modal-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.78);
          display:flex; align-items:center; justify-content:center; z-index:200;
          backdrop-filter:blur(6px); padding:20px;
        }
        .modal-box {
          background:#0e0e0e; border:1px solid rgba(255,255,255,0.1);
          border-radius:20px; width:100%; max-width:680px;
          max-height:88vh; overflow:hidden; display:flex; flex-direction:column;
          animation:modalIn .25s ease both;
        }
        .modal-body { flex:1; overflow-y:auto; padding:24px; }
        .resolve-textarea {
          width:100%; padding:14px; border-radius:12px; resize:vertical; min-height:120px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12);
          color:#fff; font-family:'Nunito Sans',sans-serif; font-size:14px; line-height:1.6;
          outline:none; transition:border-color .2s;
        }
        .resolve-textarea:focus { border-color:rgba(167,139,250,0.5); }
        .resolve-textarea::placeholder { color:rgba(255,255,255,0.2); }
        .confirm-resolve-btn {
          width:100%; padding:13px; border-radius:12px; border:none; cursor:pointer;
          background:linear-gradient(135deg, #a78bfa, #8b5cf6);
          color:#fff; font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:14px;
          transition:opacity .2s; position:relative; overflow:hidden;
        }
        .confirm-resolve-btn:hover { opacity:.9; }
        .confirm-resolve-btn:disabled { opacity:.5; cursor:not-allowed; }
        .cancel-btn {
          width:100%; padding:11px; border-radius:12px; margin-top:8px;
          border:1px solid rgba(255,255,255,0.1); background:transparent;
          color:rgba(255,255,255,0.4); font-family:'Nunito Sans',sans-serif; font-size:13px;
          cursor:pointer; transition:color .2s;
        }
        .cancel-btn:hover { color:#fff; }
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
        .sla-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
        .sla-box {
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06);
          border-radius:12px; padding:12px 14px;
        }
      `}</style>

      {/* ══ RESOLVE MODAL ══════════════════════════════════════════════════════ */}
      {resolveModal && (
        <div className="modal-overlay" onClick={() => { setResolveModal(null); setResolutionText(""); setResolveError(""); }}>
          <div className="modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontFamily: "monospace", fontSize: 12, color: "#94a3b8", margin: 0 }}>TCK-{resolveModal.ticket_id}</p>
                <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", margin: "4px 0 0" }}>Resolve Ticket</h3>
              </div>
              <button onClick={() => { setResolveModal(null); setResolutionText(""); setResolveError(""); }}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Subject</p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0 }}>{resolveModal.subject}</p>
              </div>
              <label style={{ display: "block", color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Resolution Notes <span style={{ color: "#f87171" }}>*</span>
              </label>
              <textarea
                className="resolve-textarea"
                placeholder="Describe how you resolved this ticket — your notes will be submitted to the team lead for approval and may be added to the knowledge base..."
                value={resolutionText}
                onChange={e => { setResolutionText(e.target.value); setResolveError(""); }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)", borderRadius: 10, padding: "10px 14px", margin: "14px 0" }}>
                <Bell size={14} style={{ color: "#a78bfa", flexShrink: 0 }} />
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: 0 }}>
                  Your team lead will be notified and the ticket will move to <strong style={{ color: "#a78bfa" }}>Awaiting Approval</strong>.
                </p>
              </div>
              {resolveError && (
                <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "#f87171", fontSize: 13 }}>
                  ⚠ {resolveError}
                </div>
              )}
              <button className="confirm-resolve-btn" disabled={resolveLoading || !resolutionText.trim()} onClick={handleResolve}>
                {resolveLoading
                  ? <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 8, verticalAlign: "middle" }} />Submitting...</>
                  : "✓ Submit Resolution & Notify Team Lead"
                }
              </button>
              <button className="cancel-btn" onClick={() => { setResolveModal(null); setResolutionText(""); setResolveError(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ TICKET DETAIL MODAL ════════════════════════════════════════════════ */}
      {selectedTicket && !resolveModal && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>TCK-{selectedTicket.ticket_id}</span>
                <span style={{ ...getPriorityStyle(selectedTicket.priority), padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{selectedTicket.priority}</span>
                <span style={{ ...getStatusStyle(selectedTicket.status), padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{selectedTicket.status}</span>
              </div>
              <button onClick={() => setSelectedTicket(null)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex", color: "rgba(255,255,255,0.5)" }}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <h2 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", margin: "0 0 20px", lineHeight: 1.3 }}>
                {selectedTicket.subject}
              </h2>

              {/* ✅ Action buttons — Assigned shows Start, In Progress shows Resolve */}
              <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
                {selectedTicket.status === "Assigned" && (
                  <button className="start-btn" disabled={startLoading === selectedTicket.ticket_id} onClick={() => handleStart(selectedTicket)}>
                    {startLoading === selectedTicket.ticket_id ? "Starting..." : "▶ Start Work"}
                  </button>
                )}
                {selectedTicket.status === "In Progress" && (
                  <button className="resolve-btn" onClick={() => { setResolveModal(selectedTicket); setSelectedTicket(null); }}>
                    ✓ Resolve Ticket
                  </button>
                )}
              </div>

              {/* SLA */}
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>SLA Status</p>
              <div className="sla-row">
                {[
                  { label: "Response",   status: selectedTicket.response_sla_status,   elapsed: selectedTicket.response_elapsed_minutes,   remaining: selectedTicket.response_remaining_minutes   },
                  { label: "Resolution", status: selectedTicket.resolution_sla_status, elapsed: selectedTicket.resolution_elapsed_minutes, remaining: selectedTicket.resolution_remaining_minutes },
                ].map(({ label, status, elapsed, remaining }) => (
                  <div key={label} className="sla-box">
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "0 0 8px", textTransform: "uppercase" }}>{label}</p>
                    <SlaBadge status={status} />
                    <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                      <span>Elapsed: {fmtMins(elapsed)}</span>
                      <span style={{ color: remaining < 0 ? "#f87171" : "rgba(255,255,255,0.3)" }}>
                        {remaining >= 0 ? `${fmtMins(remaining)} left` : "Overdue"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Timeline</p>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                {[
                  { label: "Created",  val: selectedTicket.created_at  },
                  { label: "Assigned", val: selectedTicket.assigned_at },
                  { label: "Started",  val: selectedTicket.started_at  },
                  { label: "Resolved", val: selectedTicket.resolved_at },
                  { label: "Closed",   val: selectedTicket.closed_at   },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>{label}</span>
                    <span style={{ color: val ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.18)", fontSize: 13, fontWeight: val ? 500 : 400 }}>
                      {val ? new Date(val).toLocaleString() : "—"}
                    </span>
                  </div>
                ))}
              </div>

              {selectedTicket.reopen_count > 0 && (
                <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#fbbf24", fontSize: 13 }}>⚠ This ticket was reopened</span>
                  <span style={{ color: "#fbbf24", fontWeight: 700 }}>{selectedTicket.reopen_count}×</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ SIDEBAR ════════════════════════════════════════════════════════════ */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99 }} />}
      <aside style={{ width: 240, background: "#0d0d0d", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "24px 16px", height: "100vh", position: "sticky", top: 0, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, padding: "0 6px" }}>
          <div style={{ width: 8, height: 8, background: "#fff", borderRadius: "50%", boxShadow: "0 0 10px 3px rgba(255,255,255,0.3)", animation: "pulse-d 2.5s infinite" }} />
          <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "0.05em" }}>AI Ticket</span>
        </div>

        {/* Mini perf card */}
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Award size={18} style={{ color: "rgba(255,255,255,0.7)" }} />
            </div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: 0, letterSpacing: "0.06em", textTransform: "uppercase" }}>Performance</p>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 18, fontFamily: "'Nunito', sans-serif", marginTop: 2 }}>
                {perfData ? `Grade ${perfData.performance_grade}` : "—"}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[{ label: "Active", val: tickets.length }, { label: "Closed", val: closedTickets.length }].map(({ label, val }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 22, margin: 0, fontFamily: "'Nunito', sans-serif" }}>{val}</p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} className={`nav-btn ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>
              <Icon size={16} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge !== null && badge > 0 && (
                <span style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>{badge}</span>
              )}
            </button>
          ))}
          <button className="nav-btn" style={{ marginTop: 8 }} onClick={() => navigate("/member-settings")}><Settings size={16} /> Settings</button>
        </nav>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "0 6px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
              {currentUser?.initials || "??"}
            </div>
            <div>
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>{currentUser?.name || "Loading..."}</p>
              <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 11, margin: 0 }}>Support Agent</p>
            </div>
          </div>
          <button className="nav-btn" onClick={handleLogout}><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      {/* ══ MAIN ═══════════════════════════════════════════════════════════════ */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <header style={{ background: "rgba(8,8,8,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex" }}>
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", margin: 0 }}>
                {activeTab === "my-tickets"  && "My Assigned Tickets"}
                {activeTab === "reassigned"  && "Reassigned Tickets"}
                {activeTab === "closed"      && "Closed Tickets"}
                {activeTab === "performance" && "My Performance"}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "2px 0 0" }}>
                {activeTab === "my-tickets"  && `${tickets.length} active tickets assigned to you`}
                {activeTab === "reassigned"  && `${reassignedTickets.length} tickets reassigned back to you`}
                {activeTab === "closed"      && `${closedTickets.length} tickets closed`}
                {activeTab === "performance" && "Your individual metrics this week"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => loadTickets(true)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 8, cursor: "pointer", display: "flex", color: "rgba(255,255,255,0.5)" }}>
              <RefreshCw size={16} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowNotif(!showNotif)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 8, cursor: "pointer", display: "flex", color: "rgba(255,255,255,0.5)", position: "relative" }}>
                <Bell size={16} />
                {notifications.length > 0 && (
                  <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, background: "#a78bfa", borderRadius: "50%", border: "1px solid #080808" }} />
                )}
              </button>
              {showNotif && (
                <div className="notif-panel">
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Notifications</p>
                  {notifications.length === 0
                    ? <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>No notifications yet</p>
                    : notifications.map(n => (
                      <div key={n.id} style={{ background: n.color, border: `1px solid ${n.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                        <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>{n.title}</p>
                        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: "4px 0 0" }}>{n.desc}</p>
                        <p style={{ color: "rgba(255,255,255,0.22)", fontSize: 11, margin: "4px 0 0" }}>{n.time}</p>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </header>

        <div style={{ padding: "28px", flex: 1 }}>
          {actionError && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#f87171", fontSize: 13, display: "flex", justifyContent: "space-between" }}>
              ⚠ {actionError}
              <button onClick={() => setActionError("")} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>✕</button>
            </div>
          )}

          {/* ══ MY TICKETS TAB ══════════════════════════════════════════════════ */}
          {activeTab === "my-tickets" && (
            <>
              {/* ✅ Stat pills — labels and counts match backend statuses */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
                {[
                  { label: "Assigned",    val: stats.assigned,   icon: AlertCircle,   color: "#fbbf24", bg: "rgba(251,191,36,0.1)"  },
                  { label: "In Progress", val: stats.inProgress, icon: Clock,         color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
                  { label: "Resolved",    val: stats.resolved,   icon: CheckCircle,   color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
                  { label: "Closed",      val: stats.closed,     icon: Star,          color: "#4ade80", bg: "rgba(74,222,128,0.1)"  },
                ].map(({ label, val, icon: Icon, color, bg }, i) => (
                  <div key={label} className="stat-pill" style={{ animationDelay: `${i * 0.07}s` }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>{label}</p>
                      <p style={{ color: "#fff", fontWeight: 700, fontSize: 22, margin: 0, fontFamily: "'Nunito', sans-serif" }}>{val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <div className="search-wrap">
                  <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
                  <input type="text" placeholder="Search by subject or ticket ID..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)} className="search-input" />
                </div>
                {/* ✅ Dropdown options match backend status strings */}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-select">
                  <option value="all">All Status</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="filter-select">
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Ticket list */}
              {loading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
                  <RefreshCw size={28} style={{ margin: "0 auto 12px", display: "block", animation: "spin 1s linear infinite" }} />
                  <p style={{ fontSize: 14 }}>Loading your tickets...</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredTickets.map((ticket, i) => {
                    const sla = worstSla(ticket);
                    return (
                      <div key={ticket.ticket_id} className="ticket-card" style={{ animationDelay: `${i * 0.05}s` }} onClick={() => setSelectedTicket(ticket)}>
                        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>TCK-{ticket.ticket_id}</span>
                              <span style={{ ...getPriorityStyle(ticket.priority), padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{ticket.priority}</span>
                              <span style={{ ...getStatusStyle(ticket.status), padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{ticket.status}</span>
                              <SlaBadge status={sla} />
                              <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.25)", fontSize: 11 }}>{fmtAgo(ticket.created_at)}</span>
                            </div>
                            <h3 style={{ color: "#fff", fontWeight: 600, fontSize: 15, margin: "0 0 10px", fontFamily: "'Nunito', sans-serif", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                              {ticket.subject}
                            </h3>
                            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <Clock size={11} /> Response: {fmtMins(ticket.response_elapsed_minutes)}
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <Shield size={11} /> SLA: {fmtMins(ticket.response_remaining_minutes)} left
                              </span>
                              {ticket.reopen_count > 0 && (
                                <span style={{ color: "#fbbf24", display: "flex", alignItems: "center", gap: 5 }}>
                                  <AlertTriangle size={11} /> Reopened {ticket.reopen_count}×
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ✅ Action buttons — correct status checks */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            {ticket.status === "Assigned" && (
                              <button className="start-btn" disabled={startLoading === ticket.ticket_id} onClick={() => handleStart(ticket)}>
                                {startLoading === ticket.ticket_id ? "..." : "▶ Start"}
                              </button>
                            )}
                            {ticket.status === "In Progress" && (
                              <button className="resolve-btn" onClick={() => setResolveModal(ticket)}>
                                ✓ Resolve
                              </button>
                            )}
                            <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 6 }}
                              onClick={() => setSelectedTicket(ticket)}>
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredTickets.length === 0 && !loading && (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
                      <AlertCircle size={40} style={{ margin: "0 auto 12px", opacity: .4 }} />
                      <p style={{ fontSize: 15 }}>No tickets found</p>
                      <p style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your filters</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ══ REASSIGNED TAB ══════════════════════════════════════════════════ */}
          {activeTab === "reassigned" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Info banner */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 12, padding: "12px 16px", marginBottom: 4 }}>
                <AlertTriangle size={15} style={{ color: "#fbbf24", flexShrink: 0 }} />
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0 }}>
                  These tickets were <strong style={{ color: "#fbbf24" }}>reassigned back to you</strong> by your team lead. Please review and restart work.
                </p>
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
                  <RefreshCw size={28} style={{ margin: "0 auto 12px", display: "block", animation: "spin 1s linear infinite" }} />
                </div>
              ) : reassignedTickets.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
                  <CheckCircle size={40} style={{ margin: "0 auto 12px", opacity: .3 }} />
                  <p style={{ fontSize: 15 }}>No reassigned tickets</p>
                </div>
              ) : reassignedTickets.map((ticket, i) => {
                const sla = worstSla(ticket);
                return (
                  <div key={ticket.ticket_id} className="ticket-card" style={{ animationDelay: `${i * 0.05}s`, borderColor: "rgba(251,191,36,0.18)" }} onClick={() => setSelectedTicket(ticket)}>
                    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>TCK-{ticket.ticket_id}</span>
                          <span style={{ ...getPriorityStyle(ticket.priority), padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{ticket.priority}</span>
                          <span style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                            ↩ Reassigned
                          </span>
                          <SlaBadge status={sla} />
                          <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.25)", fontSize: 11 }}>{fmtAgo(ticket.reopened_at || ticket.assigned_at)}</span>
                        </div>
                        <h3 style={{ color: "#fff", fontWeight: 600, fontSize: 15, margin: "0 0 10px", fontFamily: "'Nunito', sans-serif", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                          {ticket.subject}
                        </h3>
                        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <Clock size={11} /> Response: {fmtMins(ticket.response_elapsed_minutes)}
                          </span>
                          <span style={{ color: "#fbbf24", display: "flex", alignItems: "center", gap: 5 }}>
                            <AlertTriangle size={11} /> Reopened {ticket.reopen_count}×
                          </span>
                        </div>
                      </div>
                      {/* Start button — member needs to start again */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button className="start-btn" disabled={startLoading === ticket.ticket_id} onClick={() => handleStart(ticket)}>
                          {startLoading === ticket.ticket_id ? "..." : "▶ Start"}
                        </button>
                        <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 6 }}
                          onClick={() => setSelectedTicket(ticket)}>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ CLOSED TAB ══════════════════════════════════════════════════════ */}
          {activeTab === "closed" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
                  <RefreshCw size={28} style={{ margin: "0 auto 12px", display: "block", animation: "spin 1s linear infinite" }} />
                </div>
              ) : closedTickets.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
                  <CheckCircle size={40} style={{ margin: "0 auto 12px", opacity: .3 }} />
                  <p style={{ fontSize: 15 }}>No closed tickets yet</p>
                </div>
              ) : closedTickets.map((ticket, i) => (
                <div key={ticket.ticket_id} className="card" style={{ padding: 22, animation: `fadeUp .4s ease ${i * 0.07}s both` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>TCK-{ticket.ticket_id}</span>
                        <span style={{ ...getPriorityStyle(ticket.priority), padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{ticket.priority}</span>
                      </div>
                      <h3 style={{ color: "#fff", fontWeight: 600, fontSize: 15, margin: "0 0 10px", fontFamily: "'Nunito', sans-serif" }}>{ticket.subject}</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#4ade80" }}>
                          <CheckCircle size={12} /> Closed {fmtAgo(ticket.closed_at)}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Clock size={12} /> Total: {fmtMins(ticket.resolution_elapsed_minutes)}
                        </span>
                        {ticket.reopen_count > 0 && (
                          <span style={{ color: "#fbbf24", display: "flex", alignItems: "center", gap: 5 }}>
                            <AlertTriangle size={12} /> Reopened {ticket.reopen_count}×
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ ...getStatusStyle("Closed"), padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>Closed</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ PERFORMANCE TAB ═════════════════════════════════════════════════ */}
          {activeTab === "performance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
                  <RefreshCw size={28} style={{ margin: "0 auto 12px", display: "block", animation: "spin 1s linear infinite" }} />
                </div>
              ) : perfData ? (
                <>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: 28, display: "flex", alignItems: "center", gap: 24, animation: "fadeUp .4s ease both" }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: 20,
                      background: perfData.performance_grade === "A" ? "rgba(74,222,128,0.1)" : perfData.performance_grade === "B" ? "rgba(96,165,250,0.1)" : "rgba(251,191,36,0.1)",
                      border: `1px solid ${perfData.performance_grade === "A" ? "rgba(74,222,128,0.3)" : perfData.performance_grade === "B" ? "rgba(96,165,250,0.3)" : "rgba(251,191,36,0.3)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 36, color: perfData.performance_grade === "A" ? "#4ade80" : perfData.performance_grade === "B" ? "#60a5fa" : "#fbbf24" }}>
                        {perfData.performance_grade}
                      </span>
                    </div>
                    <div>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Performance Grade</p>
                      <p style={{ color: "#fff", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 22, margin: "0 0 6px" }}>{perfData.name}</p>
                      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>
                        {perfData.sla_breach_rate_percent}% SLA breach rate · {perfData.tickets_handled} tickets handled
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
                    {[
                      { label: "Avg Response",   val: fmtMins(perfData.average_response_time_minutes),   icon: Zap,           color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
                      { label: "Avg Resolution", val: fmtMins(perfData.average_resolution_time_minutes), icon: CheckCircle,   color: "#4ade80", bg: "rgba(74,222,128,0.1)"  },
                      { label: "SLA Breaches",   val: perfData.sla_breaches,                             icon: AlertTriangle, color: "#f87171", bg: "rgba(248,113,113,0.1)" },
                      { label: "Reopens",        val: perfData.reopens,                                  icon: TrendingUp,    color: "#fbbf24", bg: "rgba(251,191,36,0.1)"  },
                    ].map(({ label, val, icon: Icon, color, bg }, i) => (
                      <div key={label} className="card" style={{ padding: 22, animation: `fadeUp .4s ease ${i * 0.08}s both` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon size={18} style={{ color }} />
                          </div>
                          <div>
                            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>{label}</p>
                            <p style={{ color: "#fff", fontWeight: 700, fontSize: 24, margin: 0, fontFamily: "'Nunito', sans-serif" }}>{val}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", margin: "0 0 18px" }}>This Week</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12 }}>
                      {[
                        { label: "Handled",  val: perfData.tickets_handled, color: "#94a3b8" },
                        { label: "Active",   val: tickets.length,           color: "#60a5fa" },
                        { label: "Closed",   val: closedTickets.length,     color: "#4ade80" },
                        { label: "Breaches", val: perfData.sla_breaches,    color: "#f87171" },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
                          <p style={{ color, fontWeight: 700, fontSize: 30, margin: 0, fontFamily: "'Nunito', sans-serif" }}>{val}</p>
                          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "6px 0 0" }}>{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
                  <Activity size={40} style={{ margin: "0 auto 12px", opacity: .3 }} />
                  <p style={{ fontSize: 15 }}>No performance data yet</p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}