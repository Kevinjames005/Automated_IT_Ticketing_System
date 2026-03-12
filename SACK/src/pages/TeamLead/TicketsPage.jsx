import { useState, useEffect, useRef } from "react";
import {
  Search, UserPlus, AlertCircle, RefreshCw, Download,
  Settings, LayoutDashboard, Ticket, BarChart3,
  LogOut, Users, X, CheckCircle, Clock,
  Eye, ChevronLeft, ChevronRight as ChevronRightIcon,
  ArrowUpDown, BookOpen, Mail,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchTickets, fetchMembers, assignTicket, approveResolution, rejectResolution } from "../api";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import supabase from "../supabaseClient";
import { useUser } from "../../UserContext";

const ITEMS_PER_PAGE = 10;

function formatCreated(dateStr) {
  if (!dateStr) return "—";
  const diff = Math.floor((new Date() - new Date(dateStr)) / 3600000);
  if (diff < 1) return "Just now";
  if (diff < 24) return `${diff}h ago`;
  const days = Math.floor(diff / 24);
  return days < 7 ? `${days}d ago` : new Date(dateStr).toLocaleDateString();
}

function fmtMinutes(mins) {
  if (!mins || mins <= 0) return "—";
  if (mins < 60) return `${Math.round(mins)} mins`;
  return `${(mins / 60).toFixed(1)} hrs`;
}

export default function TicketsPage() {
  const navigate = useNavigate();
  const { currentUser } = useUser();

  const [tickets,        setTickets]        = useState([]);
  const [total,          setTotal]          = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [sortField,      setSortField]      = useState("created_at");
  const [sortDir,        setSortDir]        = useState("desc");
  const [currentPage,    setCurrentPage]    = useState(1);
  const [activeNav,      setActiveNav]      = useState("tickets");
  const [statusCounts,   setStatusCounts]   = useState({});

  // Assign
  const [assignModal,   setAssignModal]   = useState(null);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [membersList,   setMembersList]   = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError,   setAssignError]   = useState("");

  // Approval
  const [approvalLoading, setApprovalLoading] = useState(null);
  const [approvalError,   setApprovalError]   = useState("");

  // Detail modal
  const [detailTicket, setDetailTicket] = useState(null);

  const navItems = [
    { id: "overview",  label: "Dashboard",       icon: LayoutDashboard, path: "/teamlead"         },
    { id: "tickets",   label: "Tickets",          icon: Ticket,          path: "/tickets"          },
    { id: "team",      label: "Team Performance", icon: Users,           path: "/team-performance" },
    { id: "analytics", label: "Analytics",        icon: BarChart3,       path: "/analytics"        },
  ];

  // Debounce search — wait 400 ms after the user stops typing before fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => { loadTickets(); }, [filterStatus, filterPriority, currentPage, debouncedSearch]);

  useEffect(() => {
    fetchMembers()
      .then(d => setMembersList(d.members || []))
      .catch(() => {});
  }, []);

  useEffect(() => { loadCounts(); }, []);

  async function loadTickets() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchTickets({
        status:   filterStatus   !== "all" ? filterStatus   : undefined,
        priority: filterPriority !== "all" ? filterPriority : undefined,
        search:   debouncedSearch || undefined,
        page:     currentPage,
        limit:    ITEMS_PER_PAGE,
      });
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadCounts() {
    try {
      const data = await fetchTickets({ page: 1, limit: 9999 });
      const all = data.tickets || [];
      setStatusCounts({
        total:      data.total,
        pending:    all.filter(t => t.status === "Pending").length,
        inProgress: all.filter(t => t.status === "In Progress").length,
        resolved:   all.filter(t => t.status === "Resolved").length,
        closed:     all.filter(t => t.status === "Closed").length,
        unassigned: all.filter(t => !t.assigned_at).length,
      });
    } catch (e) {
      console.error("Failed to load counts", e);
    }
  }

  // ── Assign ───────────────────────────────────────────────────────────────
  const handleAssign = async (ticketId) => {
    if (!selectedAgent) return;
    const member = membersList.find(m => m.member_id === parseInt(selectedAgent));
    if (!member) return;
    setAssignLoading(true);
    setAssignError("");
    try {
      await assignTicket({ ticket_id: ticketId, member_id: member.member_id, lead_id: member.lead_id });
      const patch = { _assignedName: member.name, assigned_at: new Date().toISOString(), status: "Assigned" };
      setTickets(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, ...patch } : t));
      if (detailTicket?.ticket_id === ticketId) setDetailTicket(prev => ({ ...prev, ...patch }));
      setAssignModal(null);
      setSelectedAgent("");
      loadCounts();
    } catch (e) {
      setAssignError(e.message);
    } finally {
      setAssignLoading(false);
    }
  };

  // ── Approval ─────────────────────────────────────────────────────────────
  const handleApproval = async (ticketId, action, addToKb = false) => {
    setApprovalLoading(ticketId);
    setApprovalError("");
    try {
      if (action === "approve") {
        await approveResolution({ ticket_id: ticketId, add_to_kb: addToKb });
        const patch = { status: "Closed" };
        setTickets(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, ...patch } : t));
        if (detailTicket?.ticket_id === ticketId) setDetailTicket(prev => ({ ...prev, ...patch }));
        loadCounts();
      } else {
        await rejectResolution({ ticket_id: ticketId });
        const patch = { status: "Assigned" };
        setTickets(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, ...patch } : t));
        if (detailTicket?.ticket_id === ticketId) setDetailTicket(prev => ({ ...prev, ...patch }));
        loadCounts();
      }
    } catch (e) {
      setApprovalError(e.message);
    } finally {
      setApprovalLoading(null);
    }
  };

  // ── Style helpers ─────────────────────────────────────────────────────────
  const getPriorityStyle = (p) => ({
    high:   { background: "rgba(248,113,113,0.12)", color: "#f87171",  border: "1px solid rgba(248,113,113,0.25)" },
    medium: { background: "rgba(148,163,184,0.12)", color: "#94a3b8",  border: "1px solid rgba(148,163,184,0.25)" },
    low:    { background: "rgba(226,232,240,0.1)",  color: "#e2e8f0",  border: "1px solid rgba(226,232,240,0.2)"  },
  }[p] || {});

  const getStatusStyle = (s) => ({
    Pending:       { background: "rgba(148,163,184,0.1)", color: "#94a3b8" },
    Assigned:      { background: "rgba(251,191,36,0.1)",  color: "#fbbf24" },
    "In Progress": { background: "rgba(96,165,250,0.1)",  color: "#60a5fa" },
    Resolved:      { background: "rgba(167,139,250,0.1)", color: "#a78bfa" },
    Closed:        { background: "rgba(74,222,128,0.1)",  color: "#4ade80" },
  }[s] || { background: "rgba(148,163,184,0.1)", color: "#94a3b8" });

  const getSlaStyle  = (s) => ({ healthy: { color: "#4ade80" }, at_risk: { color: "#fbbf24" }, breached: { color: "#f87171" } }[s] || { color: "rgba(255,255,255,0.2)" });
  const getSlaLabel  = (s) => s === "breached" ? "⚠ Breached" : s === "at_risk" ? "⚡ At Risk" : s === "healthy" ? "✓ Healthy" : "—";

  // ── Sorting (search & status/priority filtering is handled server-side) ───
  const filtered = tickets
    .sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };
  const SortIcon = ({ field }) => (
    <ArrowUpDown size={10} style={{ marginLeft: 4, opacity: sortField === field ? 1 : 0.3, verticalAlign: "middle" }} />
  );

  const stats = [
    { label: "Total",       val: statusCounts.total      ?? total, color: "#fff",    icon: Ticket,      bg: "rgba(255,255,255,0.08)"  },
    { label: "Pending",     val: statusCounts.pending     ?? 0,    color: "#94a3b8", icon: AlertCircle, bg: "rgba(148,163,184,0.1)"   },
    { label: "In Progress", val: statusCounts.inProgress  ?? 0,    color: "#60a5fa", icon: Clock,       bg: "rgba(96,165,250,0.1)"    },
    { label: "Resolved",    val: statusCounts.resolved    ?? 0,    color: "#a78bfa", icon: CheckCircle, bg: "rgba(167,139,250,0.1)"   },
    { label: "Closed",      val: statusCounts.closed      ?? 0,    color: "#4ade80", icon: CheckCircle, bg: "rgba(74,222,128,0.1)"    },
    { label: "Unassigned",  val: statusCounts.unassigned  ?? 0,    color: "#f87171", icon: UserPlus,    bg: "rgba(248,113,113,0.1)"   },
  ];

  // Reusable assign select inside modals
  const AssignSelect = ({ ticketId }) => (
    <>
      <select className="modal-select" style={{ margin: "0 0 12px" }} value={selectedAgent}
        onChange={e => { setSelectedAgent(e.target.value); setAssignError(""); }}>
        <option value="">Select a team member...</option>
        {membersList.map(m => <option key={m.member_id} value={m.member_id}>{m.name}</option>)}
      </select>
      {assignError && (
        <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#f87171", fontSize: 13 }}>
          ⚠ {assignError}
        </div>
      )}
      <button className="modal-confirm" disabled={!selectedAgent || assignLoading}
        style={{ opacity: (!selectedAgent || assignLoading) ? 0.45 : 1 }}
        onClick={() => handleAssign(ticketId)}>
        {assignLoading ? "Assigning..." : "Confirm Assignment"}
      </button>
    </>
  );

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = [
      "Ticket ID", "Subject", "Priority", "Status",
      "Lead SLA", "Member Response SLA", "Member Resolution SLA",
      "Assigned", "Created At", "Resolved At", "Closed At",
    ];

    const escape = (val) => {
      if (val == null) return "";
      const str = String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const rows = filtered.map(t => [
      `TCK-${t.ticket_id}`,
      t.subject || "",
      t.priority || "",
      t.status || "",
      t.lead_sla_status || t.response_sla_status || "",
      t.member_response_sla_status || "",
      t.member_resolution_sla_status || t.resolution_sla_status || "",
      t.assigned_at ? new Date(t.assigned_at).toLocaleString() : "Unassigned",
      t.created_at  ? new Date(t.created_at).toLocaleString()  : "",
      t.resolved_at ? new Date(t.resolved_at).toLocaleString() : "",
      t.closed_at   ? new Date(t.closed_at).toLocaleString()   : "",
    ].map(escape).join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `tickets_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#080808", fontFamily: "'Nunito Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&family=Nunito+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-d { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes modalIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        @keyframes spin    { to{transform:rotate(360deg)} }

        .nav-btn { width:100%;display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;border:none;background:transparent;cursor:pointer;text-align:left;font-family:'Nunito Sans',sans-serif;font-size:14px;color:rgba(255,255,255,0.4);transition:all .2s; }
        .nav-btn:hover  { background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.8); }
        .nav-btn.active { background:rgba(255,255,255,0.08);color:#fff;font-weight:600; }

        .stat-card { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:18px 22px;animation:fadeUp .4s ease both;display:flex;align-items:center;transition:border-color .2s,background .2s; }
        .stat-card:hover { border-color:rgba(255,255,255,0.13);background:rgba(255,255,255,0.05); }

        .table-card { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:18px;overflow:hidden; }

        .ticket-row { transition:background .15s;cursor:pointer; }
        .ticket-row:hover { background:rgba(255,255,255,0.04); }

        .filter-sel { background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:rgba(255,255,255,0.7);padding:8px 12px;font-family:'Nunito Sans',sans-serif;font-size:13px;outline:none;cursor:pointer; }
        .filter-sel option { background:#1a1a1a; }

        .assign-btn { display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;font-family:'Nunito Sans',sans-serif; }
        .assign-btn:hover { background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.25); }

        .approve-btn { display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;border:1px solid rgba(74,222,128,0.3);background:rgba(74,222,128,0.08);color:#4ade80;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;font-family:'Nunito Sans',sans-serif; }
        .approve-btn:hover    { background:rgba(74,222,128,0.18); }
        .approve-btn:disabled { opacity:.4;cursor:default; }

        .kb-btn { display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;border:1px solid rgba(96,165,250,0.3);background:rgba(96,165,250,0.08);color:#60a5fa;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;font-family:'Nunito Sans',sans-serif; }
        .kb-btn:hover    { background:rgba(96,165,250,0.18); }
        .kb-btn:disabled { opacity:.4;cursor:default; }

        .reject-btn { display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;border:1px solid rgba(248,113,113,0.3);background:rgba(248,113,113,0.08);color:#f87171;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;font-family:'Nunito Sans',sans-serif; }
        .reject-btn:hover    { background:rgba(248,113,113,0.18); }
        .reject-btn:disabled { opacity:.4;cursor:default; }

        .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(6px);padding:24px; }
        .modal-box { background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:22px;width:100%;max-width:620px;max-height:88vh;overflow-y:auto;animation:modalIn .25s ease both;box-shadow:0 40px 100px rgba(0,0,0,0.8); }
        .assign-modal-box { background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:28px;width:360px;animation:modalIn .25s ease both; }

        .modal-select { width:100%;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#fff;font-family:'Nunito Sans',sans-serif;font-size:14px;outline:none;margin:14px 0;cursor:pointer; }
        .modal-select option { background:#1a1a1a; }
        .modal-confirm { width:100%;padding:11px;border-radius:10px;border:none;background:#fff;color:#080808;font-family:'Nunito Sans',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:opacity .2s; }
        .modal-confirm:hover { opacity:.88; }
        .modal-cancel { width:100%;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.5);font-family:'Nunito Sans',sans-serif;font-size:14px;cursor:pointer;margin-top:8px;transition:color .2s; }
        .modal-cancel:hover { color:#fff; }

        .search-input { width:100%;padding:9px 14px 9px 38px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-family:'Nunito Sans',sans-serif;font-size:13px;outline:none;transition:border-color .2s; }
        .search-input:focus { border-color:rgba(255,255,255,0.3); }
        .search-input::placeholder { color:rgba(255,255,255,0.25); }

        .export-btn { display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:none;background:#fff;color:#080808;font-family:'Nunito Sans',sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:opacity .2s;position:relative;overflow:hidden; }
        .export-btn::before { content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);background-size:200% 100%;animation:shimmer 2.5s infinite; }
        .export-btn:hover { opacity:.88; }

        .page-btn { width:32px;height:32px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;font-family:'Nunito Sans',sans-serif;font-size:13px; }
        .page-btn:hover { background:rgba(255,255,255,0.08);color:#fff; }
        .page-btn.active { background:rgba(255,255,255,0.12);color:#fff;font-weight:700;border-color:rgba(255,255,255,0.25); }
        .page-btn:disabled { opacity:.3;cursor:default; }

        th { font-family:'Nunito Sans',sans-serif;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,0.3);font-weight:600;padding:12px 16px;cursor:pointer;user-select:none;white-space:nowrap; }
        th:hover { color:rgba(255,255,255,0.6); }

        .email-body-content { color:rgba(255,255,255,0.65);font-size:13px;line-height:1.8;margin:0;white-space:pre-wrap;word-break:break-word;font-family:'Nunito Sans',sans-serif; }
        .email-meta-row { display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05); }
        .email-meta-row:last-child { border-bottom:none; }
        .email-meta-label { color:rgba(255,255,255,0.25);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;width:46px;flex-shrink:0;padding-top:1px; }
        .email-meta-value { color:rgba(255,255,255,0.6);font-size:13px;word-break:break-all; }
      `}</style>

      {/* ── ASSIGN MODAL (for unassigned tickets from table) ─────────────── */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => { setAssignModal(null); setAssignError(""); }}>
          <div className="assign-modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Assign Ticket</h3>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>TCK-{assignModal}</p>
            <AssignSelect ticketId={assignModal} />
            <button className="modal-cancel" onClick={() => { setAssignModal(null); setAssignError(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── TICKET DETAIL MODAL ──────────────────────────────────────────── */}
      {detailTicket && (
        <div className="modal-overlay" onClick={() => setDetailTicket(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: "22px 28px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div>
                <p style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#94a3b8", margin: "0 0 6px" }}>TCK-{detailTicket.ticket_id}</p>
                <h2 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 19, color: "#fff", margin: 0, lineHeight: 1.3 }}>{detailTicket.subject}</h2>
              </div>
              <button onClick={() => setDetailTicket(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 7, cursor: "pointer", display: "flex", color: "rgba(255,255,255,0.5)", flexShrink: 0 }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ padding: 28 }}>

              {/* Badges */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
                <span style={{ ...getPriorityStyle(detailTicket.priority), padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>{detailTicket.priority}</span>
                <span style={{ ...getStatusStyle(detailTicket.status), padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{detailTicket.status}</span>
                {detailTicket.reopen_count > 0 && (
                  <span style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)", padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    ⚠ Reopened {detailTicket.reopen_count}×
                  </span>
                )}
              </div>

              {/* ── EMAIL SECTION ──────────────────────────────────────────── */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
                {/* Email header bar */}
                <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "11px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Mail size={12} style={{ color: "#60a5fa" }} />
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Original Email</span>
                </div>

                {/* From / To / Subject / Date meta */}
                <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {(detailTicket.from_email || detailTicket.sender_email || detailTicket.customer_email) && (
                    <div className="email-meta-row">
                      <span className="email-meta-label">From</span>
                      <span className="email-meta-value">{detailTicket.from_email || detailTicket.sender_email || detailTicket.customer_email}</span>
                    </div>
                  )}
                  {(detailTicket.to_email || detailTicket.recipient_email) && (
                    <div className="email-meta-row">
                      <span className="email-meta-label">To</span>
                      <span className="email-meta-value">{detailTicket.to_email || detailTicket.recipient_email}</span>
                    </div>
                  )}
                  <div className="email-meta-row">
                    <span className="email-meta-label">Subj</span>
                    <span className="email-meta-value" style={{ color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{detailTicket.subject}</span>
                  </div>
                  {detailTicket.created_at && (
                    <div className="email-meta-row">
                      <span className="email-meta-label">Date</span>
                      <span className="email-meta-value">{new Date(detailTicket.created_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Email body */}
                <div style={{ padding: "16px 18px" }}>
                  {(() => {
                    const body =
                      detailTicket.body         ||
                      detailTicket.email_body   ||
                      detailTicket.description  ||
                      detailTicket.message      ||
                      detailTicket.content      ||
                      null;
                    if (!body) {
                      return <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, margin: 0, fontStyle: "italic" }}>No email body available.</p>;
                    }
                    const isHtml = /<[a-z][\s\S]*>/i.test(body);
                    if (isHtml) {
                      return (
                        <div
                          style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.8, fontFamily: "'Nunito Sans',sans-serif" }}
                          dangerouslySetInnerHTML={{ __html: body }}
                        />
                      );
                    }
                    return <p className="email-body-content">{body}</p>;
                  })()}
                </div>
              </div>

              {/* ── APPROVAL PANEL (only for Resolved tickets) ─────────── */}
              {detailTicket.status === "Resolved" && (
                <div style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 14, padding: 18, marginBottom: 22 }}>
                  <p style={{ color: "#a78bfa", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px" }}>Awaiting Your Approval</p>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 14px" }}>Review and approve or reject this resolution. You can also add it to the Knowledge Base.</p>
                  {approvalError && (
                    <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#f87171", fontSize: 13 }}>
                      ⚠ {approvalError}
                      <button onClick={() => setApprovalError("")} style={{ float: "right", background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>✕</button>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="approve-btn" disabled={approvalLoading === detailTicket.ticket_id}
                      onClick={() => handleApproval(detailTicket.ticket_id, "approve", false)}>
                      <ThumbsUp size={12} /> {approvalLoading === detailTicket.ticket_id ? "Processing…" : "Approve"}
                    </button>
                    <button className="kb-btn" disabled={approvalLoading === detailTicket.ticket_id}
                      onClick={() => handleApproval(detailTicket.ticket_id, "approve", true)}>
                      <BookOpen size={12} /> {approvalLoading === detailTicket.ticket_id ? "Processing…" : "Approve + Add to KB"}
                    </button>
                    <button className="reject-btn" disabled={approvalLoading === detailTicket.ticket_id}
                      onClick={() => handleApproval(detailTicket.ticket_id, "reject")}>
                      <ThumbsDown size={12} /> {approvalLoading === detailTicket.ticket_id ? "Processing…" : "Reject & Reassign"}
                    </button>
                  </div>
                </div>
              )}

              {/* SLA */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, marginBottom: 20 }}>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>SLA Status</p>

                {/* Team Lead SLA */}
                <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Team Lead — Assignment</p>
                <div style={{ marginBottom: 16 }}>
                  {(() => {
                    const status  = detailTicket.lead_sla_status || detailTicket.response_sla_status;
                    const elapsed = detailTicket.lead_response_elapsed_minutes ?? detailTicket.response_elapsed_minutes;
                    return (
                      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px" }}>
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "0 0 6px", textTransform: "uppercase" }}>Assign Response</p>
                        <p style={{ ...getSlaStyle(status), fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>{getSlaLabel(status)}</p>
                        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, margin: 0 }}>{fmtMinutes(elapsed)} elapsed</p>
                      </div>
                    );
                  })()}
                </div>

                {/* Team Member SLA */}
                <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Team Member — Resolution</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Response",   status: detailTicket.member_response_sla_status,   elapsed: detailTicket.member_elapsed_minutes },
                    { label: "Resolution", status: detailTicket.member_resolution_sla_status || detailTicket.resolution_sla_status, elapsed: detailTicket.member_elapsed_minutes ?? detailTicket.resolution_elapsed_minutes },
                  ].map(({ label, status, elapsed }) => (
                    <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px" }}>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "0 0 6px", textTransform: "uppercase" }}>{label}</p>
                      <p style={{ ...getSlaStyle(status), fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>
                        {status === "pending" ? "— Pending" : getSlaLabel(status)}
                      </p>
                      <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, margin: 0 }}>
                        {elapsed != null ? `${fmtMinutes(elapsed)} elapsed` : "Awaiting assignment"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, marginBottom: 20 }}>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>Timeline</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Created",  val: detailTicket.created_at  },
                    { label: "Assigned", val: detailTicket.assigned_at },
                    { label: "Started",  val: detailTicket.started_at  },
                    { label: "Resolved", val: detailTicket.resolved_at },
                    { label: "Closed",   val: detailTicket.closed_at   },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>{label}</span>
                      <span style={{ color: val ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", fontSize: 13 }}>
                        {val ? new Date(val).toLocaleString() : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── ASSIGN / REASSIGN SECTION ─────────────────────────────
                  - Unassigned ticket  → simple "Assign Ticket" panel
                  - Assigned ticket    → "Reassign Ticket" with yellow warning
                    so the team lead knows this is a deliberate override
              ─────────────────────────────────────────────────────────── */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>

                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
                  {(detailTicket._assignedName || detailTicket.assigned_at) ? "Reassign Ticket" : "Assign Ticket"}
                </p>

                {/* Current assignee chip */}
                {(detailTicket._assignedName || detailTicket.assigned_at) && (
                  <>
                    {/* ── Warning banner ── */}
                    <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10, padding: "11px 14px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>⚠️</span>
                      <div>
                        <p style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700, margin: "0 0 3px" }}>You are about to reassign this ticket</p>
                        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                          The current agent will lose this ticket and the new agent's workload will increase.
                          Only reassign if the current agent is genuinely unable to handle it.
                        </p>
                      </div>
                    </div>

                    {/* Current agent chip */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 10, marginBottom: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fff", color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>
                        {(detailTicket._assignedName || "?").split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0, fontWeight: 600 }}>
                          {detailTicket._assignedName || "Previously assigned"}
                        </p>
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>Current assignee</p>
                      </div>
                    </div>
                  </>
                )}

                <AssignSelect ticketId={detailTicket.ticket_id} />
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside style={{ width: 240, background: "#0d0d0d", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "24px 16px", height: "100vh", position: "sticky", top: 0, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36, padding: "0 6px" }}>
          <div style={{ width: 8, height: 8, background: "#fff", borderRadius: "50%", boxShadow: "0 0 10px 3px rgba(255,255,255,0.3)", animation: "pulse-d 2.5s ease infinite" }} />
          <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "0.05em" }}>AI Ticket</span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map(({ id, label, icon: Icon, path }) => (
            <button key={id} className={`nav-btn ${activeNav === id ? "active" : ""}`}
              onClick={() => { setActiveNav(id); navigate(path); }}>
              <Icon size={16} /> {label}
            </button>
          ))}
          <button onClick={() => navigate("/settings")}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 4, fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, fontWeight: 600, background: "transparent", color: "rgba(255,255,255,0.35)", marginTop: 8 }}>
            <Settings size={16} /> Settings
          </button>
        </nav>

        {/* ── USER PROFILE CARD ─────────────────────────────────────────── */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16, marginTop: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 12px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14, flexShrink: 0, boxShadow: "0 0 0 2px rgba(99,102,241,0.3)" }}>
                {currentUser?.initials || "TL"}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: "#fff", fontSize: 13, fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUser?.name || "Team Lead"}
                </p>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUser?.email || "—"}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 999, fontSize: 10, fontWeight: 700, padding: "2px 10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Team Lead
              </span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", display: "inline-block" }} />
              <span style={{ color: "#4ade80", fontSize: 10, fontWeight: 600 }}>Online</span>
            </div>
          </div>
          <button className="nav-btn" onClick={() => supabase.auth.signOut().then(() => navigate("/"))}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        <header style={{ background: "rgba(8,8,8,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
          <div>
            <h1 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", margin: 0 }}>Ticket Management</h1>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "2px 0 0" }}>
              {statusCounts.total ?? total} total · {statusCounts.unassigned ?? 0} unassigned · {statusCounts.resolved ?? 0} awaiting approval
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => { loadTickets(); loadCounts(); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 8, cursor: "pointer", display: "flex", color: "rgba(255,255,255,0.5)" }}>
              <RefreshCw size={16} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            </button>
            <button className="export-btn" onClick={exportCSV}><Download size={14} /> Export CSV</button>
          </div>
        </header>

        <div style={{ padding: 28, flex: 1 }}>

          {/* STAT CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 14, marginBottom: 24 }}>
            {stats.map(({ label, val, color, icon: Icon, bg }, i) => (
              <div key={label} className="stat-card" style={{ animationDelay: `${i * 0.07}s`, gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>{label}</p>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: 22, margin: 0, fontFamily: "'Nunito',sans-serif" }}>{val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* APPROVAL ERROR BANNER */}
          {approvalError && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#f87171", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>⚠ {approvalError}</span>
              <button onClick={() => setApprovalError("")} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>✕</button>
            </div>
          )}

          {/* FILTERS */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap", padding: "14px 18px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
              <input type="text" placeholder="Search tickets..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)} className="search-input" />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="filter-sel">
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
              <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setCurrentPage(1); }} className="filter-sel">
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* TABLE */}
          <div className="table-card" style={{ marginBottom: 20 }}>
            {loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.3)" }}>
                <RefreshCw size={24} style={{ margin: "0 auto 12px", display: "block", animation: "spin 1s linear infinite" }} />
                <p style={{ fontSize: 14, margin: 0 }}>Loading tickets...</p>
              </div>
            )}
            {error && !loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#f87171" }}>
                <AlertCircle size={36} style={{ margin: "0 auto 12px", display: "block" }} />
                <p style={{ fontSize: 15, margin: 0 }}>Failed to load tickets</p>
                <p style={{ fontSize: 13, marginTop: 6, color: "rgba(255,255,255,0.3)" }}>{error}</p>
                <button onClick={loadTickets} style={{ marginTop: 16, padding: "8px 20px", borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", fontSize: 13 }}>Try Again</button>
              </div>
            )}
            {!loading && !error && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      <th onClick={() => handleSort("ticket_id")}  style={{ textAlign: "left" }}>Ticket ID <SortIcon field="ticket_id" /></th>
                      <th onClick={() => handleSort("subject")}    style={{ textAlign: "left" }}>Subject <SortIcon field="subject" /></th>
                      <th onClick={() => handleSort("priority")}   style={{ textAlign: "center" }}>Priority <SortIcon field="priority" /></th>
                      <th onClick={() => handleSort("status")}     style={{ textAlign: "center" }}>Status <SortIcon field="status" /></th>
                      <th style={{ textAlign: "center" }}>Lead SLA</th>
                      <th style={{ textAlign: "center" }}>Member Response</th>
                      <th style={{ textAlign: "center" }}>Member Resolution</th>
                      <th onClick={() => handleSort("created_at")} style={{ textAlign: "left" }}>Created <SortIcon field="created_at" /></th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(ticket => (
                      <tr key={ticket.ticket_id} className="ticket-row"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                        onClick={() => { setDetailTicket(ticket); setSelectedAgent(""); setAssignError(""); setApprovalError(""); }}>
                        <td style={{ padding: "14px 16px", color: "#94a3b8", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>TCK-{ticket.ticket_id}</td>
                        <td style={{ padding: "14px 16px", color: "#fff", fontWeight: 500, maxWidth: 220 }}>
                          <span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ticket.subject}</span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <span style={{ ...getPriorityStyle(ticket.priority), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{ticket.priority}</span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <span style={{ ...getStatusStyle(ticket.status), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{ticket.status}</span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 12 }}>
                          <span style={getSlaStyle(ticket.lead_sla_status || ticket.response_sla_status)}>{getSlaLabel(ticket.lead_sla_status || ticket.response_sla_status)}</span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 12 }}>
                          <span style={getSlaStyle(ticket.member_response_sla_status)}>
                            {ticket.member_response_sla_status === "pending" ? "— Pending" : getSlaLabel(ticket.member_response_sla_status)}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 12 }}>
                          <span style={getSlaStyle(ticket.member_resolution_sla_status || ticket.resolution_sla_status)}>
                            {ticket.member_resolution_sla_status === "pending" ? "— Pending" : getSlaLabel(ticket.member_resolution_sla_status || ticket.resolution_sla_status)}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "rgba(255,255,255,0.3)", fontSize: 12, whiteSpace: "nowrap" }}>{formatCreated(ticket.created_at)}</td>

                        {/* ── ACTIONS CELL ──────────────────────────────── */}
                        <td style={{ padding: "14px 16px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center", flexWrap: "wrap" }}>

                            {/* Only show Assign button for unassigned tickets.
                                Reassignment is a deliberate team-lead action done
                                from inside the detail modal, not from the table. */}
                            {!ticket.assigned_at && (
                              <button className="assign-btn"
                                onClick={() => { setAssignModal(ticket.ticket_id); setSelectedAgent(""); setAssignError(""); }}>
                                <UserPlus size={11} /> Assign
                              </button>
                            )}

                            {/* Approve / KB / Reject — only for Resolved tickets */}
                            {ticket.status === "Resolved" && (
                              <>
                                <button className="approve-btn" disabled={approvalLoading === ticket.ticket_id}
                                  onClick={() => handleApproval(ticket.ticket_id, "approve", false)}>
                                  <ThumbsUp size={10} /> {approvalLoading === ticket.ticket_id ? "…" : "OK"}
                                </button>
                                <button className="kb-btn" disabled={approvalLoading === ticket.ticket_id}
                                  onClick={() => handleApproval(ticket.ticket_id, "approve", true)}>
                                  <BookOpen size={10} /> KB
                                </button>
                                <button className="reject-btn" disabled={approvalLoading === ticket.ticket_id}
                                  onClick={() => handleApproval(ticket.ticket_id, "reject")}>
                                  <ThumbsDown size={10} /> {approvalLoading === ticket.ticket_id ? "…" : "Reject"}
                                </button>
                              </>
                            )}

                            {/* Detail eye — always visible */}
                            <button style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", display: "flex", padding: 4 }}
                              onClick={() => { setDetailTicket(ticket); setSelectedAgent(""); setAssignError(""); setApprovalError(""); }}>
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filtered.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)" }}>
                    <AlertCircle size={36} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
                    <p style={{ fontSize: 15, margin: 0 }}>No tickets found</p>
                    <p style={{ fontSize: 13, marginTop: 6, color: "rgba(255,255,255,0.15)" }}>Try adjusting your filters</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total}
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`page-btn ${currentPage === p ? "active" : ""}`} onClick={() => setCurrentPage(p)}>{p}</button>
                ))}
                <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
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