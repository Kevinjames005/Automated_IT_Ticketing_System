import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle,
  Users, Download, Calendar, Search, MoreVertical,
  RefreshCw, Bell, Settings, LayoutDashboard, Ticket, BarChart3,
  LogOut, Menu, X, UserPlus, BookOpen,
} from "lucide-react";
import {
  fetchTickets, fetchAnalytics, fetchPriorityBreakdown, fetchCategoryBreakdown,
  fetchMemberAnalytics, fetchMembers, assignTicket, approveResolution, rejectResolution,
} from "../api";
import { AlertTriangle, Flame, ShieldAlert, ThumbsUp, ThumbsDown } from "lucide-react";
import supabase from "../supabaseClient";
import { useUser } from "../../UserContext";

// Ensures backend UTC timestamps (which arrive without timezone suffix) are
// correctly parsed as UTC — not as local time.
function toUTC(dateStr) {
  if (!dateStr) return null;
  // If already has timezone info (Z or +xx:xx), use as-is
  if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) return new Date(dateStr);
  return new Date(dateStr + 'Z');
}

function formatCreated(dateStr) {
  if (!dateStr) return "—";
  const diff = Math.floor((new Date() - toUTC(dateStr)) / 3600000);
  if (diff < 1) return "Just now";
  if (diff < 24) return `${diff}h ago`;
  const days = Math.floor(diff / 24);
  return days < 7 ? `${days}d ago` : toUTC(dateStr).toLocaleDateString();
}

function fmtMinutes(mins) {
  if (!mins || mins === 0) return "—";
  if (mins < 60) return `${Math.round(mins)} mins`;
  return `${(mins / 60).toFixed(1)} hrs`;
}

export default function TeamLeadDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useUser();

  const [timeRange,         setTimeRange]         = useState("7days");
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen,       setSidebarOpen]       = useState(false);
  const [activeTab,         setActiveTab]         = useState("overview");
  const [analytics,         setAnalytics]         = useState(null);
  const [priorityData,      setPriorityData]      = useState([]);
  const [categoryData,      setCategoryData]      = useState([]);
  const [loading,           setLoading]           = useState(true);

  // Action Center
  const [pendingTickets,  setPendingTickets]  = useState([]);
  const [resolvedTickets, setResolvedTickets] = useState([]);
  const [slaAtRisk,       setSlaAtRisk]       = useState([]);
  const [highUnassigned,  setHighUnassigned]  = useState([]);
  const [triageLoading,   setTriageLoading]   = useState(true);
  const [activeSection,   setActiveSection]   = useState("unassigned");

  // Assign / approval state
  const [assignModal,     setAssignModal]     = useState(null);
  const [selectedAgent,   setSelectedAgent]   = useState("");
  const [teamMembersList, setTeamMembersList] = useState([]);
  const [detailTicket,    setDetailTicket]    = useState(null);
  const [assignLoading,   setAssignLoading]   = useState(false);
  const [assignError,     setAssignError]     = useState("");
  const [approvalLoading, setApprovalLoading] = useState(null);
  const [approvalError,   setApprovalError]   = useState("");

  // Approval floating window
  const [approvalModal,    setApprovalModal]    = useState(null);
  const [addToKb,          setAddToKb]          = useState(false);
  const [rejectionReason,  setRejectionReason]  = useState("");

  // ── Fetch members ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchMembers()
      .then(data => setTeamMembersList(data.members || []))
      .catch(e => console.error("Failed to load members:", e.message));
  }, []);

  // ── Fetch triage buckets ─────────────────────────────────────────────────
  const loadTriage = async () => {
    setTriageLoading(true);
    try {
      const [pendingRes, resolvedRes, allRes] = await Promise.all([
        fetchTickets({ status: "Pending",  limit: 50 }),
        fetchTickets({ status: "Resolved", limit: 50 }),
        fetchTickets({ limit: 100 }),
      ]);
      const pending  = pendingRes.tickets  || [];
      const resolved = resolvedRes.tickets || [];
      const all      = allRes.tickets      || [];

      setHighUnassigned(pending.filter(t => t.priority === "high" && !t.assigned_at));
      setPendingTickets(pending);
      setResolvedTickets(resolved);
      setSlaAtRisk(all.filter(t =>
        t.status !== "Closed" &&
        (t.lead_sla_status === "at_risk"               || t.lead_sla_status === "breached" ||
         t.member_response_sla_status === "at_risk"    || t.member_response_sla_status === "breached" ||
         t.member_resolution_sla_status === "at_risk"  || t.member_resolution_sla_status === "breached")
      ));
    } catch (e) {
      console.error("Triage load error:", e.message);
    } finally {
      setTriageLoading(false);
    }
  };

  useEffect(() => { loadTriage(); }, []);

  // ── Fetch analytics (time-range dependent) ───────────────────────────────
  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const [analyticsData, priorityRes, categoryRes] = await Promise.all([
          fetchAnalytics(timeRange),
          fetchPriorityBreakdown(),
          fetchCategoryBreakdown(),
        ]);
        setAnalytics(analyticsData);
        setPriorityData(
          (priorityRes.priority_breakdown || []).map(p => ({
            name:  p.priority.charAt(0).toUpperCase() + p.priority.slice(1),
            value: p.total_tickets,
            color: p.priority === "high" ? "#f87171" : p.priority === "medium" ? "#94a3b8" : "#e2e8f0",
          }))
        );
        setCategoryData(
          (categoryRes.category_breakdown || []).map(c => ({
            name:    c.category || "Unknown",
            tickets: c.total_tickets,
          }))
        );
      } catch (e) {
        console.error("Analytics load error:", e.message);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [timeRange]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const slaBadge = (t) =>
    [t.lead_sla_status, t.member_response_sla_status, t.member_resolution_sla_status,
     t.response_sla_status, t.resolution_sla_status].includes("breached") ? "breached"
    : [t.lead_sla_status, t.member_response_sla_status, t.member_resolution_sla_status,
       t.response_sla_status, t.resolution_sla_status].includes("at_risk") ? "at_risk"
    : "healthy";

  const handleAssign = async (ticketId) => {
    if (!selectedAgent) return;
    const member = teamMembersList.find(m => m.member_id === parseInt(selectedAgent));
    if (!member) return;
    setAssignLoading(true);
    setAssignError("");
    try {
      await assignTicket({ ticket_id: ticketId, member_id: member.member_id, lead_id: member.lead_id });
      const removeTicket = (list) => list.filter(t => t.ticket_id !== ticketId);
      setPendingTickets(removeTicket);
      setHighUnassigned(removeTicket);
      if (detailTicket?.ticket_id === ticketId) {
        setDetailTicket(prev => ({ ...prev, _assignedName: member.name, assigned_at: new Date().toISOString(), status: "Assigned" }));
      }
      setAssignModal(null);
      setSelectedAgent("");
    } catch (e) {
      setAssignError(e.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleApproval = async (ticketId, action, addToKb = false, reason = "") => {
    setApprovalLoading(ticketId);
    setApprovalError("");
    try {
      if (action === "approve") {
        await approveResolution({ ticket_id: ticketId, add_to_kb: addToKb });
      } else {
        await rejectResolution({ ticket_id: ticketId, rejection_reason: reason });
      }
      setResolvedTickets(prev => prev.filter(t => t.ticket_id !== ticketId));
      if (detailTicket?.ticket_id === ticketId) setDetailTicket(null);
    } catch (e) {
      setApprovalError(e.message);
    } finally {
      setApprovalLoading(null);
    }
  };

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

  const getSlaStyle = (s) => ({
    healthy:  { color: "#4ade80" },
    at_risk:  { color: "#fbbf24" },
    breached: { color: "#f87171" },
  }[s] || { color: "rgba(255,255,255,0.3)" });

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

  const navItems = [
    { id: "overview",  label: "Dashboard",       icon: LayoutDashboard, path: null               },
    { id: "tickets",   label: "Tickets",          icon: Ticket,          path: "/tickets"         },
    { id: "team",      label: "Team Performance", icon: Users,           path: "/team-performance" },
    { id: "analytics", label: "Analytics",        icon: BarChart3,       path: "/analytics"       },
  ];

  const handleNavClick = (item) => {
    if (item.path) navigate(item.path);
    else setActiveTab(item.id);
  };

  // Time range pill options
  const timeRangeOptions = [
    { value: "today",  label: "Today"    },
    { value: "7days",  label: "7 Days"   },
    { value: "30days", label: "30 Days"  },
  ];

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const escape = (val) => {
      if (val == null) return "";
      const str = String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    // Pick the data set matching the active triage section
    const sectionData = {
      unassigned: highUnassigned,
      pending:    pendingTickets,
      sla:        slaAtRisk,
      approval:   resolvedTickets,
    }[activeSection] || [];

    const sectionLabel = {
      unassigned: "unassigned_high_priority",
      pending:    "pending_tickets",
      sla:        "sla_at_risk",
      approval:   "awaiting_approval",
    }[activeSection];

    const headers = [
      "Ticket ID", "Subject", "Priority", "Status",
      "Lead SLA", "Member Response SLA", "Member Resolution SLA",
      "Assigned", "Created At", "Resolved At",
    ];

    const rows = sectionData.map(t => [
      `TCK-${t.ticket_id}`,
      t.subject || "",
      t.priority || "",
      t.status || "",
      t.lead_sla_status || t.response_sla_status || "",
      t.member_response_sla_status || "",
      t.member_resolution_sla_status || t.resolution_sla_status || "",
      t.assigned_at ? toUTC(t.assigned_at)?.toLocaleString() : "Unassigned",
      t.created_at  ? toUTC(t.created_at)?.toLocaleString()  : "",
      t.resolved_at ? toUTC(t.resolved_at)?.toLocaleString() : "",
    ].map(escape).join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `dashboard_${sectionLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
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
        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn{ from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-dot  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes shimmer    { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes modalIn    { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }

        .nav-btn { width:100%;display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;border:none;background:transparent;cursor:pointer;font-family:'Nunito Sans',sans-serif;font-size:14px;color:rgba(255,255,255,0.4);transition:all .2s;text-align:left; }
        .nav-btn:hover  { background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.8); }
        .nav-btn.active { background:rgba(255,255,255,0.08);color:#fff;font-weight:600; }

        .kpi-card { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:24px;transition:border-color .2s,background .2s;animation:fadeSlideIn .5s ease both; }
        .kpi-card:hover { border-color:rgba(255,255,255,0.14);background:rgba(255,255,255,0.05); }
        .chart-card { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:24px; }

        .ticket-row { transition:background .15s; }
        .ticket-row:hover { background:rgba(255,255,255,0.03); }

        .assign-btn { display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);font-size:11px;font-weight:600;letter-spacing:.04em;cursor:pointer;transition:all .2s;font-family:'Nunito Sans',sans-serif; }
        .assign-btn:hover { background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.25); }

        .export-btn { display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:none;background:#fff;color:#080808;font-family:'Nunito Sans',sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:opacity .2s;position:relative;overflow:hidden; }
        .export-btn::before { content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);background-size:200% 100%;animation:shimmer 2.5s infinite; }
        .export-btn:hover { opacity:.88; }

        .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(4px); }
        .modal-box { background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:28px;width:340px;animation:modalIn .25s ease both; }
        .modal-select { width:100%;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);color:#fff;font-family:'Nunito Sans',sans-serif;font-size:14px;outline:none;margin:16px 0;cursor:pointer; }
        .modal-select option { background:#1a1a1a; }
        .modal-confirm { width:100%;padding:11px;border-radius:10px;border:none;background:#fff;color:#080808;font-family:'Nunito Sans',sans-serif;font-weight:700;font-size:14px;cursor:pointer;transition:opacity .2s; }
        .modal-confirm:hover  { opacity:.88; }
        .modal-cancel { width:100%;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.5);font-family:'Nunito Sans',sans-serif;font-size:14px;cursor:pointer;margin-top:8px;transition:color .2s; }
        .modal-cancel:hover { color:#fff; }

        .approve-btn { display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:8px;border:1px solid rgba(74,222,128,0.3);background:rgba(74,222,128,0.08);color:#4ade80;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;font-family:'Nunito Sans',sans-serif; }
        .approve-btn:hover { background:rgba(74,222,128,0.18); }
        .approve-btn:disabled { opacity:.4;cursor:default; }

        .kb-btn { display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:8px;border:1px solid rgba(96,165,250,0.3);background:rgba(96,165,250,0.08);color:#60a5fa;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;font-family:'Nunito Sans',sans-serif; }
        .kb-btn:hover { background:rgba(96,165,250,0.18); }
        .kb-btn:disabled { opacity:.4;cursor:default; }

        .reject-btn { display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:8px;border:1px solid rgba(248,113,113,0.3);background:rgba(248,113,113,0.08);color:#f87171;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;font-family:'Nunito Sans',sans-serif; }
        .reject-btn:hover { background:rgba(248,113,113,0.18); }
        .reject-btn:disabled { opacity:.4;cursor:default; }

        /* ── Rejection reason textarea ── */
        .rejection-textarea { width:100%;padding:12px 14px;border-radius:12px;background:rgba(248,113,113,0.05);border:1px solid rgba(248,113,113,0.2);color:#fff;font-family:'Nunito Sans',sans-serif;font-size:13px;line-height:1.6;outline:none;resize:vertical;min-height:88px;transition:border-color .2s; }
        .rejection-textarea:focus { border-color:rgba(248,113,113,0.45); }
        .rejection-textarea::placeholder { color:rgba(255,255,255,0.2); }

        /* ── Time range pill tabs ── */
        .time-pill { padding:6px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.35);font-family:'Nunito Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .18s;white-space:nowrap; }
        .time-pill:hover { color:rgba(255,255,255,0.7);border-color:rgba(255,255,255,0.2); }
        .time-pill.active { background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.3); }

        th { font-family:'Nunito Sans',sans-serif;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,0.3);font-weight:600; }
        .mobile-overlay { display:none; }
        @media(max-width:768px) { .sidebar{position:fixed!important;z-index:100;} .mobile-overlay{display:block;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99;} }
      `}</style>

      {/* ── ASSIGN MODAL ─────────────────────────────────────────────────── */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => { setAssignModal(null); setAssignError(""); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Assign Ticket</h3>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>TCK-{assignModal}</p>
            <select className="modal-select" value={selectedAgent} onChange={e => { setSelectedAgent(e.target.value); setAssignError(""); }}>
              <option value="">Select a team member...</option>
              {teamMembersList.length > 0
                ? teamMembersList.map(m => <option key={m.member_id} value={m.member_id}>{m.name}</option>)
                : <option disabled>No members found</option>}
            </select>
            {assignError && (
              <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#f87171", fontSize: 13 }}>⚠ {assignError}</div>
            )}
            <button className="modal-confirm" disabled={!selectedAgent || assignLoading} style={{ opacity: (!selectedAgent || assignLoading) ? 0.5 : 1 }} onClick={() => handleAssign(assignModal)}>
              {assignLoading ? "Assigning..." : "Confirm Assignment"}
            </button>
            <button className="modal-cancel" onClick={() => { setAssignModal(null); setAssignError(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── APPROVAL FLOATING WINDOW ─────────────────────────────────────── */}
      {approvalModal && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", padding: 24 }}
          onClick={() => { setApprovalModal(null); setAddToKb(false); setApprovalError(""); setRejectionReason(""); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 620, maxHeight: "90vh", background: "#111", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 24, overflowY: "auto", animation: "modalIn .28s cubic-bezier(.22,1,.36,1) both", boxShadow: "0 0 0 1px rgba(167,139,250,0.08), 0 48px 120px rgba(0,0,0,0.9)" }}
          >
            {/* Header */}
            <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 999, fontSize: 10, fontWeight: 700, padding: "2px 10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Awaiting Approval
                  </span>
                  <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>TCK-{approvalModal.ticket_id}</span>
                </div>
                <h2 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", margin: 0, lineHeight: 1.35 }}>
                  {approvalModal.subject}
                </h2>
              </div>
              <button
                onClick={() => { setApprovalModal(null); setAddToKb(false); setApprovalError(""); setRejectionReason(""); }}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", flexShrink: 0, transition: "background .2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "22px 28px" }}>

              {/* Meta badges */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
                <span style={{ ...getPriorityStyle(approvalModal.priority), padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>
                  {approvalModal.priority}
                </span>
                <span style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)", padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  Resolved
                </span>
                {(() => {
                  const s = slaBadge(approvalModal);
                  const styles = {
                    breached: { bg: "rgba(248,113,113,0.08)", color: "#f87171", border: "rgba(248,113,113,0.2)" },
                    at_risk:  { bg: "rgba(251,191,36,0.08)",  color: "#fbbf24", border: "rgba(251,191,36,0.2)"  },
                    healthy:  { bg: "rgba(74,222,128,0.08)",  color: "#4ade80", border: "rgba(74,222,128,0.2)"  },
                  }[s] || {};
                  return (
                    <span style={{ background: styles.bg, color: styles.color, border: `1px solid ${styles.border}`, padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                      {s === "breached" ? "⚠ SLA Breached" : s === "at_risk" ? "⚡ SLA At Risk" : "✓ SLA Healthy"}
                    </span>
                  );
                })()}
              </div>

              {/* ── Resolution Document ── */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", marginBottom: 18 }}>
                {/* Section header */}
                <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "11px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <BookOpen size={12} style={{ color: "#a78bfa" }} />
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Resolution Document</span>
                </div>

                {/* Body — checks every possible field name the backend might use */}
                <div style={{ padding: "16px 18px" }}>
                  {(() => {
                    const text =
                      approvalModal.resolution_notes  ||
                      approvalModal.resolution        ||
                      approvalModal.resolution_text   ||
                      approvalModal.resolved_notes    ||
                      approvalModal.agent_notes       ||
                      approvalModal.notes             ||
                      approvalModal.body              ||
                      approvalModal.email_body        ||
                      approvalModal.description       ||
                      approvalModal.message           ||
                      approvalModal.content           ||
                      null;

                    if (!text) {
                      return (
                        <div style={{ textAlign: "center", padding: "24px 0" }}>
                          <BookOpen size={28} style={{ color: "rgba(255,255,255,0.1)", display: "block", margin: "0 auto 10px" }} />
                          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, margin: 0 }}>No resolution document attached to this ticket</p>
                          <p style={{ color: "rgba(255,255,255,0.12)", fontSize: 12, margin: "6px 0 0" }}>
                            The agent may not have added resolution notes yet.
                          </p>
                        </div>
                      );
                    }

                    const isHtml = /<[a-z][\s\S]*>/i.test(text);
                    if (isHtml) {
                      return (
                        <div
                          style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 1.75, fontFamily: "'Nunito Sans',sans-serif" }}
                          dangerouslySetInnerHTML={{ __html: text }}
                        />
                      );
                    }
                    return (
                      <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {text}
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* Timeline snapshot */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                {[
                  { label: "Created",  val: approvalModal.created_at },
                  { label: "Resolved", val: approvalModal.resolved_at || approvalModal.created_at },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" }}>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>{label}</p>
                    <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, margin: 0 }}>
                      {val ? toUTC(val)?.toLocaleString() : "—"}
                    </p>
                  </div>
                ))}
              </div>

              {/* Error */}
              {approvalError && (
                <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  ⚠ {approvalError}
                  <button onClick={() => setApprovalError("")} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
                </div>
              )}

              {/* Add to KB checkbox */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 18px", background: addToKb ? "rgba(96,165,250,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${addToKb ? "rgba(96,165,250,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 14, cursor: "pointer", transition: "all .2s", marginBottom: 20, userSelect: "none" }}>
                <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
                  <input type="checkbox" checked={addToKb} onChange={e => setAddToKb(e.target.checked)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                  <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${addToKb ? "#60a5fa" : "rgba(255,255,255,0.2)"}`, background: addToKb ? "rgba(96,165,250,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>
                    {addToKb && (
                      <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                        <path d="M1 4.5L4 7.5L10 1.5" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <p style={{ color: addToKb ? "#60a5fa" : "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, margin: "0 0 3px", transition: "color .2s", display: "flex", alignItems: "center", gap: 6 }}>
                    <BookOpen size={13} /> Add resolution to Knowledge Base
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>
                    {addToKb ? "This resolution will be saved to the KB when approved." : "Check to save this resolution to the Knowledge Base on approval."}
                  </p>
                </div>
              </label>

              {/* ── Rejection Reason ─────────────────────────────────────────
                  Only shown / required when the lead wants to reject.
                  The comment is saved to ticket_comments on the backend.
              ──────────────────────────────────────────────────────────── */}
              <div style={{ background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 14, padding: "16px 18px", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ThumbsDown size={11} style={{ color: "#f87171" }} />
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Rejection Reason
                    <span style={{ color: "rgba(248,113,113,0.6)", marginLeft: 4 }}>— visible to the agent</span>
                  </span>
                </div>
                <textarea
                  className="rejection-textarea"
                  placeholder="Explain why this resolution was rejected so the agent knows what to fix…"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  maxLength={1000}
                />
                <div style={{ textAlign: "right", marginTop: 4 }}>
                  <span style={{ color: rejectionReason.length > 900 ? "#f87171" : "rgba(255,255,255,0.15)", fontSize: 11 }}>
                    {rejectionReason.length}/1000
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  disabled={approvalLoading === approvalModal.ticket_id}
                  onClick={async () => {
                    await handleApproval(approvalModal.ticket_id, "approve", addToKb);
                    setApprovalModal(null);
                    setAddToKb(false);
                    setRejectionReason("");
                  }}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px", borderRadius: 12, border: "1px solid rgba(74,222,128,0.35)", background: "rgba(74,222,128,0.1)", color: "#4ade80", fontSize: 14, fontWeight: 700, cursor: approvalLoading === approvalModal.ticket_id ? "default" : "pointer", transition: "all .2s", fontFamily: "'Nunito Sans',sans-serif", opacity: approvalLoading === approvalModal.ticket_id ? 0.5 : 1 }}
                  onMouseEnter={e => { if (approvalLoading !== approvalModal.ticket_id) e.currentTarget.style.background = "rgba(74,222,128,0.18)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(74,222,128,0.1)"; }}
                >
                  <ThumbsUp size={15} />
                  {approvalLoading === approvalModal.ticket_id ? "Processing…" : addToKb ? "Approve + Save to KB" : "Approve"}
                </button>
                <button
                  disabled={approvalLoading === approvalModal.ticket_id || !rejectionReason.trim()}
                  onClick={async () => {
                    await handleApproval(approvalModal.ticket_id, "reject", false, rejectionReason);
                    setApprovalModal(null);
                    setAddToKb(false);
                    setRejectionReason("");
                  }}
                  title={!rejectionReason.trim() ? "Please add a rejection reason before rejecting" : ""}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 22px", borderRadius: 12, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: 14, fontWeight: 700, cursor: (approvalLoading === approvalModal.ticket_id || !rejectionReason.trim()) ? "not-allowed" : "pointer", transition: "all .2s", fontFamily: "'Nunito Sans',sans-serif", opacity: (approvalLoading === approvalModal.ticket_id || !rejectionReason.trim()) ? 0.4 : 1 }}
                  onMouseEnter={e => { if (approvalLoading !== approvalModal.ticket_id && rejectionReason.trim()) e.currentTarget.style.background = "rgba(248,113,113,0.16)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(248,113,113,0.08)"; }}
                >
                  <ThumbsDown size={15} />
                  {approvalLoading === approvalModal.ticket_id ? "Processing…" : "Reject & Send Reason"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── TICKET DETAIL MODAL ──────────────────────────────────────────── */}
      {detailTicket && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", padding: 24 }} onClick={() => setDetailTicket(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 580, maxHeight: "88vh", background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, overflowY: "auto", padding: 32, animation: "modalIn .28s cubic-bezier(.22,1,.36,1) both", boxShadow: "0 40px 100px rgba(0,0,0,0.8)" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <p style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#94a3b8", margin: 0 }}>TCK-{detailTicket.ticket_id}</p>
                <h2 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 18, color: "#fff", margin: "6px 0 0", lineHeight: 1.3 }}>{detailTicket.subject}</h2>
              </div>
              <button onClick={() => setDetailTicket(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", flexShrink: 0 }}>
                <X size={16} />
              </button>
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              <span style={{ ...getPriorityStyle(detailTicket.priority), padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>{detailTicket.priority}</span>
              <span style={{ ...getStatusStyle(detailTicket.status), padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>{detailTicket.status}</span>
            </div>

            {/* Email Body */}
            {(() => {
              const body =
                detailTicket.body        ||
                detailTicket.email_body  ||
                detailTicket.description ||
                detailTicket.message     ||
                detailTicket.content     ||
                null;
              if (!body) return null;
              const isHtml = /<[a-z][\s\S]*>/i.test(body);
              return (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1h10M1 1l5 4.5L11 1M1 1v8h10V1" stroke="#60a5fa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Email Body</span>
                  </div>
                  <div style={{ padding: "14px 16px", maxHeight: 220, overflowY: "auto" }}>
                    {isHtml ? (
                      <div
                        style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.7, fontFamily: "'Nunito Sans',sans-serif" }}
                        dangerouslySetInnerHTML={{ __html: body }}
                      />
                    ) : (
                      <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {body}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Approval actions (only when status = Resolved) */}
            {detailTicket.status === "Resolved" && (
              <div style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 14, padding: 18, marginBottom: 20 }}>
                <p style={{ color: "#a78bfa", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 14px" }}>Awaiting Your Approval</p>
                {approvalError && (
                  <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#f87171", fontSize: 13 }}>⚠ {approvalError}</div>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="approve-btn" disabled={approvalLoading === detailTicket.ticket_id}
                    onClick={() => handleApproval(detailTicket.ticket_id, "approve", false)}>
                    <ThumbsUp size={12} /> {approvalLoading === detailTicket.ticket_id ? "…" : "Approve"}
                  </button>
                  <button className="kb-btn" disabled={approvalLoading === detailTicket.ticket_id}
                    onClick={() => handleApproval(detailTicket.ticket_id, "approve", true)}>
                    <BookOpen size={12} /> {approvalLoading === detailTicket.ticket_id ? "…" : "Approve + Add to KB"}
                  </button>
                  <button className="reject-btn" disabled={approvalLoading === detailTicket.ticket_id}
                    onClick={() => handleApproval(detailTicket.ticket_id, "reject")}>
                    <ThumbsDown size={12} /> {approvalLoading === detailTicket.ticket_id ? "…" : "Reject"}
                  </button>
                </div>
              </div>
            )}

            {/* SLA */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>SLA Status</p>

              {/* Lead SLA */}
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Team Lead</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginBottom: 16 }}>
                {(() => {
                  const status  = detailTicket.lead_sla_status || detailTicket.response_sla_status;
                  const elapsed = detailTicket.lead_response_elapsed_minutes ?? detailTicket.response_elapsed_minutes;
                  return (
                    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px" }}>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "0 0 6px", textTransform: "uppercase" }}>Assign Response</p>
                      <p style={{ ...getSlaStyle(status), fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>
                        {status === "breached" ? "⚠ Breached" : status === "at_risk" ? "⚡ At Risk" : "✓ Healthy"}
                      </p>
                      <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, margin: 0 }}>{fmtMinutes(elapsed)} elapsed</p>
                    </div>
                  );
                })()}
              </div>

              {/* Member SLA */}
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Team Member</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  {
                    label:   "Response",
                    status:  detailTicket.member_response_sla_status,
                    elapsed: detailTicket.member_elapsed_minutes,
                  },
                  {
                    label:   "Resolution",
                    status:  detailTicket.member_resolution_sla_status || detailTicket.resolution_sla_status,
                    elapsed: detailTicket.member_elapsed_minutes ?? detailTicket.resolution_elapsed_minutes,
                  },
                ].map(({ label, status, elapsed }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px" }}>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "0 0 6px", textTransform: "uppercase" }}>{label}</p>
                    <p style={{ ...getSlaStyle(status), fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>
                      {status === "breached" ? "⚠ Breached" : status === "at_risk" ? "⚡ At Risk" : status === "pending" ? "— Pending" : "✓ Healthy"}
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, margin: 0 }}>
                      {elapsed != null ? `${fmtMinutes(elapsed)} elapsed` : "Awaiting assignment"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, marginBottom: 20 }}>
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
                    <span style={{ color: val ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: val ? 500 : 400 }}>
                      {val ? toUTC(val)?.toLocaleString() : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reopen count */}
            {detailTicket.reopen_count > 0 && (
              <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fbbf24", fontSize: 13 }}>⚠ Reopened</span>
                <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 14 }}>{detailTicket.reopen_count}×</span>
              </div>
            )}

            {/* Assign panel */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
                {detailTicket._assignedName || detailTicket.assigned_at ? "Reassign Ticket" : "Assign Ticket"}
              </p>
              {(detailTicket._assignedName || detailTicket.assigned_at) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 10, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fff", color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>
                    {(detailTicket._assignedName || "??").split(" ").map(n => n[0]).join("")}
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{detailTicket._assignedName || "Previously assigned"}</span>
                </div>
              )}
              <select className="modal-select" style={{ margin: "0 0 12px" }} value={selectedAgent} onChange={e => { setSelectedAgent(e.target.value); setAssignError(""); }}>
                <option value="">Select a team member...</option>
                {teamMembersList.map(m => <option key={m.member_id} value={m.member_id}>{m.name}</option>)}
              </select>
              {assignError && (
                <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#f87171", fontSize: 13 }}>⚠ {assignError}</div>
              )}
              <button className="modal-confirm" disabled={!selectedAgent || assignLoading} style={{ opacity: (!selectedAgent || assignLoading) ? 0.4 : 1 }} onClick={() => handleAssign(detailTicket.ticket_id)}>
                {assignLoading ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {sidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className="sidebar" style={{ width: 240, background: "#0d0d0d", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "24px 16px", height: "100vh", position: "sticky", top: 0, flexShrink: 0, transition: "transform .3s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36, padding: "0 6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, background: "#fff", borderRadius: "50%", boxShadow: "0 0 10px 3px rgba(255,255,255,0.3)", animation: "pulse-dot 2.5s ease infinite" }} />
            <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "0.05em" }}>AI Ticket</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><X size={16} /></button>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`nav-btn ${activeTab === item.id ? "active" : ""}`} onClick={() => handleNavClick(item)}>
                <Icon size={16} /> {item.label}
              </button>
            );
          })}
          <button className="nav-btn" style={{ marginTop: 8 }} onClick={() => navigate("/settings")}><Settings size={16} /> Settings</button>
        </nav>

        {/* User profile card */}
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
          <button className="nav-btn" onClick={() => supabase.auth.signOut().then(() => navigate("/"))}><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* HEADER */}
        <header style={{ background: "rgba(8,8,8,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex" }}>
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", margin: 0 }}>Team Lead Dashboard</h1>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "2px 0 0" }}>Monitor ticket flow and team productivity</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

            {/* ── Time range pill selector (replaces the native <select>) ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "4px 5px" }}>
              {timeRangeOptions.map(opt => (
                <button
                  key={opt.value}
                  className={`time-pill${timeRange === opt.value ? " active" : ""}`}
                  onClick={() => setTimeRange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button onClick={loadTriage} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 8, cursor: "pointer", display: "flex", color: "rgba(255,255,255,0.5)" }}>
              <RefreshCw size={16} style={{ animation: triageLoading ? "spin 1s linear infinite" : "none" }} />
            </button>

            <div style={{ position: "relative" }}>
              <button onClick={() => setShowNotifications(!showNotifications)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 8, cursor: "pointer", display: "flex", color: "rgba(255,255,255,0.5)", position: "relative" }}>
                <Bell size={16} />
                {(highUnassigned.length > 0 || slaAtRisk.length > 0) && (
                  <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, background: "#f87171", borderRadius: "50%", border: "1px solid #080808" }} />
                )}
              </button>
              {showNotifications && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 300, background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 16, zIndex: 100 }}>
                  <p style={{ color: "#fff", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Alerts</p>
                  {highUnassigned.length > 0 && (
                    <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                      <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>Unassigned High Priority</p>
                      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: "4px 0 0" }}>{highUnassigned.length} ticket{highUnassigned.length > 1 ? "s" : ""} need immediate attention</p>
                    </div>
                  )}
                  {resolvedTickets.length > 0 && (
                    <div style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                      <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>Pending Approvals</p>
                      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: "4px 0 0" }}>{resolvedTickets.length} ticket{resolvedTickets.length > 1 ? "s" : ""} awaiting your approval</p>
                    </div>
                  )}
                  {highUnassigned.length === 0 && resolvedTickets.length === 0 && (
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No urgent alerts right now.</p>
                  )}
                </div>
              )}
            </div>

            <button className="export-btn" onClick={exportCSV}><Download size={14} /> Export</button>
          </div>
        </header>

        {/* CONTENT */}
        <div style={{ padding: "28px", flex: 1 }}>

          {/* ACTION CENTER COUNTER CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { key: "unassigned", label: "Unassigned High Priority", count: highUnassigned.length,  icon: Flame,       color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)"  },
              { key: "pending",    label: "Pending Tickets",          count: pendingTickets.length,  icon: Clock,       color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)"   },
              { key: "sla",        label: "SLA At Risk / Breached",   count: slaAtRisk.length,       icon: ShieldAlert, color: "#60a5fa", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.2)"   },
              { key: "approval",   label: "Awaiting Approval",        count: resolvedTickets.length, icon: CheckCircle, color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)"  },
            ].map(({ key, label, count, icon: Icon, color, bg, border }) => (
              <button key={key} onClick={() => setActiveSection(key)} style={{ background: activeSection === key ? bg : "rgba(255,255,255,0.02)", border: `1px solid ${activeSection === key ? border : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: "18px 20px", cursor: "pointer", textAlign: "left", transition: "all .2s", animation: "fadeSlideIn .4s ease both" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  {triageLoading
                    ? <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)" }} />
                    : <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 26, color: count > 0 ? color : "rgba(255,255,255,0.2)" }}>{count}</span>
                  }
                </div>
                <p style={{ color: activeSection === key ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 600, margin: 0 }}>{label}</p>
              </button>
            ))}
          </div>

          {/* TRIAGE TABLE */}
          <div className="chart-card" style={{ marginBottom: 24, animation: "fadeSlideIn .4s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {activeSection === "unassigned" && <><Flame size={18} style={{ color: "#f87171" }} /><div><h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", margin: 0 }}>Unassigned High Priority</h3><p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "3px 0 0" }}>High priority tickets with no assigned agent</p></div></>}
                {activeSection === "pending"    && <><Clock size={18} style={{ color: "#fbbf24" }} /><div><h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", margin: 0 }}>Pending Tickets</h3><p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "3px 0 0" }}>All tickets waiting to be assigned</p></div></>}
                {activeSection === "sla"        && <><ShieldAlert size={18} style={{ color: "#60a5fa" }} /><div><h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", margin: 0 }}>SLA At Risk / Breached</h3><p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "3px 0 0" }}>Tickets approaching or past SLA deadline</p></div></>}
                {activeSection === "approval"   && <><CheckCircle size={18} style={{ color: "#a78bfa" }} /><div><h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", margin: 0 }}>Awaiting Approval</h3><p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "3px 0 0" }}>Resolved tickets waiting for approval or rejection</p></div></>}
              </div>
              <button onClick={() => navigate("/tickets")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito Sans',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <Ticket size={13} /> View All
              </button>
            </div>

            {approvalError && (
              <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#f87171", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>⚠ {approvalError}</span>
                <button onClick={() => setApprovalError("")} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>✕</button>
              </div>
            )}

            {triageLoading ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
                <RefreshCw size={22} style={{ margin: "0 auto 10px", display: "block", animation: "spin 1s linear infinite" }} />
                Loading action items...
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>

                {/* UNASSIGNED */}
                {activeSection === "unassigned" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Ticket ID","Subject","Priority","SLA Status","Created","Assign To"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: ["Ticket ID","Subject","Created"].includes(h) ? "left" : "center" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {highUnassigned.length === 0
                        ? <tr><td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>🎉 No unassigned high priority tickets</td></tr>
                        : highUnassigned.map(t => (
                          <tr key={t.ticket_id} className="ticket-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }} onClick={() => { setDetailTicket(t); setSelectedAgent(""); }}>
                            <td style={{ padding: "14px", color: "#94a3b8", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>TCK-{t.ticket_id}</td>
                            <td style={{ padding: "14px", color: "#fff", fontWeight: 500, maxWidth: 240 }}><span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.subject}</span></td>
                            <td style={{ padding: "14px", textAlign: "center" }}><span style={{ ...getPriorityStyle(t.priority), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{t.priority}</span></td>
                            <td style={{ padding: "14px", textAlign: "center" }}>{(() => { const s = slaBadge(t); return <span style={{ ...getSlaStyle(s), fontSize: 12, fontWeight: 600 }}>{s === "breached" ? "⚠ Breached" : s === "at_risk" ? "⚡ At Risk" : "✓ Healthy"}</span>; })()}</td>
                            <td style={{ padding: "14px", color: "rgba(255,255,255,0.3)", fontSize: 12, whiteSpace: "nowrap" }}>{formatCreated(t.created_at)}</td>
                            <td style={{ padding: "14px", textAlign: "center" }}><button className="assign-btn" onClick={e => { e.stopPropagation(); setAssignModal(t.ticket_id); setSelectedAgent(""); }}><UserPlus size={11} /> Assign</button></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                )}

                {/* PENDING */}
                {activeSection === "pending" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Ticket ID","Subject","Priority","SLA Status","Created","Assign To"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: ["Ticket ID","Subject","Created"].includes(h) ? "left" : "center" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTickets.length === 0
                        ? <tr><td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>🎉 No pending tickets</td></tr>
                        : pendingTickets.map(t => (
                          <tr key={t.ticket_id} className="ticket-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }} onClick={() => { setDetailTicket(t); setSelectedAgent(""); }}>
                            <td style={{ padding: "14px", color: "#94a3b8", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>TCK-{t.ticket_id}</td>
                            <td style={{ padding: "14px", color: "#fff", fontWeight: 500, maxWidth: 240 }}><span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.subject}</span></td>
                            <td style={{ padding: "14px", textAlign: "center" }}><span style={{ ...getPriorityStyle(t.priority), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{t.priority}</span></td>
                            <td style={{ padding: "14px", textAlign: "center" }}>{(() => { const s = slaBadge(t); return <span style={{ ...getSlaStyle(s), fontSize: 12, fontWeight: 600 }}>{s === "breached" ? "⚠ Breached" : s === "at_risk" ? "⚡ At Risk" : "✓ Healthy"}</span>; })()}</td>
                            <td style={{ padding: "14px", color: "rgba(255,255,255,0.3)", fontSize: 12, whiteSpace: "nowrap" }}>{formatCreated(t.created_at)}</td>
                            <td style={{ padding: "14px", textAlign: "center" }}><button className="assign-btn" onClick={e => { e.stopPropagation(); setAssignModal(t.ticket_id); setSelectedAgent(""); }}><UserPlus size={11} /> Assign</button></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                )}

                {/* SLA */}
                {activeSection === "sla" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Ticket ID","Subject","Priority","Status","Lead SLA","Member Response","Member Resolution","Created"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: ["Ticket ID","Subject","Created"].includes(h) ? "left" : "center" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slaAtRisk.length === 0
                        ? <tr><td colSpan={8} style={{ padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>✅ All tickets within SLA</td></tr>
                        : slaAtRisk.map(t => {
                          const slaCell = (status) => (
                            <span style={{ ...getSlaStyle(status), fontSize: 12, fontWeight: 600 }}>
                              {status === "breached" ? "⚠ Breached" : status === "at_risk" ? "⚡ At Risk" : status === "pending" ? "— Pending" : "✓ OK"}
                            </span>
                          );
                          return (
                          <tr key={t.ticket_id} className="ticket-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }} onClick={() => { setDetailTicket(t); setSelectedAgent(""); }}>
                            <td style={{ padding: "14px", color: "#94a3b8", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>TCK-{t.ticket_id}</td>
                            <td style={{ padding: "14px", color: "#fff", fontWeight: 500, maxWidth: 200 }}><span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.subject}</span></td>
                            <td style={{ padding: "14px", textAlign: "center" }}><span style={{ ...getPriorityStyle(t.priority), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{t.priority}</span></td>
                            <td style={{ padding: "14px", textAlign: "center" }}><span style={{ ...getStatusStyle(t.status), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{t.status}</span></td>
                            <td style={{ padding: "14px", textAlign: "center" }}>{slaCell(t.lead_sla_status || t.response_sla_status)}</td>
                            <td style={{ padding: "14px", textAlign: "center" }}>{slaCell(t.member_response_sla_status)}</td>
                            <td style={{ padding: "14px", textAlign: "center" }}>{slaCell(t.member_resolution_sla_status || t.resolution_sla_status)}</td>
                            <td style={{ padding: "14px", color: "rgba(255,255,255,0.3)", fontSize: 12, whiteSpace: "nowrap" }}>{formatCreated(t.created_at)}</td>
                          </tr>
                        )})
                      }
                    </tbody>
                  </table>
                )}

                {/* APPROVAL */}
                {activeSection === "approval" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Ticket ID","Subject","Priority","SLA Status","Resolved",""].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: ["Ticket ID","Subject","Resolved"].includes(h) ? "left" : "center" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedTickets.length === 0
                        ? <tr><td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>🎉 No tickets awaiting approval</td></tr>
                        : resolvedTickets.map(t => (
                          <tr key={t.ticket_id} className="ticket-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td style={{ padding: "14px", color: "#94a3b8", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>TCK-{t.ticket_id}</td>
                            <td style={{ padding: "14px", color: "#fff", fontWeight: 500, maxWidth: 200 }}><span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.subject}</span></td>
                            <td style={{ padding: "14px", textAlign: "center" }}><span style={{ ...getPriorityStyle(t.priority), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{t.priority}</span></td>
                            <td style={{ padding: "14px", textAlign: "center" }}>{(() => { const s = slaBadge(t); return <span style={{ ...getSlaStyle(s), fontSize: 12, fontWeight: 600 }}>{s === "breached" ? "⚠ Breached" : s === "at_risk" ? "⚡ At Risk" : "✓ Healthy"}</span>; })()}</td>
                            <td style={{ padding: "14px", color: "rgba(255,255,255,0.3)", fontSize: 12, whiteSpace: "nowrap" }}>{formatCreated(t.resolved_at || t.created_at)}</td>
                            <td style={{ padding: "14px", textAlign: "center" }}>
                              <button
                                onClick={() => { setApprovalModal(t); setAddToKb(false); setApprovalError(""); }}
                                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(167,139,250,0.35)", background: "rgba(167,139,250,0.1)", color: "#a78bfa", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .2s", fontFamily: "'Nunito Sans',sans-serif", whiteSpace: "nowrap" }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(167,139,250,0.2)"}
                                onMouseLeave={e => e.currentTarget.style.background = "rgba(167,139,250,0.1)"}
                              >
                                <BookOpen size={12} /> Review
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                )}

              </div>
            )}
          </div>

          {/* KPI CARDS */}
          

          {/* CHARTS */}
          

        </div>
      </main>
    </div>
  );
}