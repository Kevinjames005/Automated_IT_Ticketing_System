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
  LogOut, Menu, X, UserPlus,
} from "lucide-react";
import { fetchTickets, fetchAnalytics, fetchPriorityBreakdown, fetchCategoryBreakdown, fetchMemberAnalytics, fetchMembers, assignTicket, approveResolution, rejectResolution } from "./api";
import { AlertTriangle, Flame, ShieldAlert, ThumbsUp, ThumbsDown } from "lucide-react";

function formatCreated(dateStr) {
  if (!dateStr) return "—";
  const diff = Math.floor((new Date() - new Date(dateStr)) / 3600000);
  if (diff < 1) return "Just now";
  if (diff < 24) return `${diff}h ago`;
  const days = Math.floor(diff / 24);
  return days < 7 ? `${days}d ago` : new Date(dateStr).toLocaleDateString();
}

function fmtMinutes(mins) {
  if (!mins || mins === 0) return "—";
  if (mins < 60) return `${Math.round(mins)} mins`;
  return `${(mins / 60).toFixed(1)} hrs`;
}

export default function TeamLeadDashboard() {
  const navigate = useNavigate();

  const [timeRange,         setTimeRange]         = useState("7days");
  const [showNotifications, setShowNotifications]  = useState(false);
  const [sidebarOpen,       setSidebarOpen]        = useState(false);
  const [activeTab,         setActiveTab]          = useState("overview");
  const [analytics,         setAnalytics]          = useState(null);
  const [priorityData,      setPriorityData]       = useState([]);
  const [categoryData,      setCategoryData]       = useState([]);
  const [loading,           setLoading]            = useState(true);

  // Action Center — triage buckets
  const [pendingTickets,    setPendingTickets]     = useState([]);
  const [resolvedTickets,   setResolvedTickets]    = useState([]);
  const [slaAtRisk,         setSlaAtRisk]          = useState([]);
  const [highUnassigned,    setHighUnassigned]     = useState([]);
  const [triageLoading,     setTriageLoading]      = useState(true);
  const [activeSection,     setActiveSection]      = useState("unassigned"); // which triage tab is open

  // Assign / approval state
  const [assignModal,       setAssignModal]        = useState(null);
  const [selectedAgent,     setSelectedAgent]      = useState("");
  const [teamMembersList,   setTeamMembersList]    = useState([]);
  const [detailTicket,      setDetailTicket]       = useState(null);
  const [assignLoading,     setAssignLoading]      = useState(false);
  const [assignError,       setAssignError]        = useState("");
  const [approvalLoading,   setApprovalLoading]    = useState(null); // ticket_id being approved/rejected
  const [approvalError,     setApprovalError]      = useState("");

  // Fetch members once on mount
  useEffect(() => {
    fetchMembers()
      .then(data => setTeamMembersList(data.members || []))
      .catch(e => console.error("Failed to load members:", e.message));
  }, []);

  // Fetch triage buckets — always fresh, no time range filter
  useEffect(() => {
    async function loadTriage() {
      setTriageLoading(true);
      try {
        const [pendingRes, resolvedRes, allRes] = await Promise.all([
          fetchTickets({ status: "Pending", limit: 50 }),
          fetchTickets({ status: "Resolved", limit: 50 }),
          fetchTickets({ limit: 100 }),
        ]);

        const pending  = pendingRes.tickets  || [];
        const resolved = resolvedRes.tickets || [];
        const all      = allRes.tickets      || [];

        // High priority + unassigned
        const urgentUnassigned = pending.filter(t =>
          t.priority === "high" && !t.assigned_at
        );

        // SLA at risk or breached (exclude already closed)
        const atRisk = all.filter(t =>
          t.status !== "Closed" &&
          (t.response_sla_status === "at_risk"   || t.response_sla_status === "breached" ||
           t.resolution_sla_status === "at_risk" || t.resolution_sla_status === "breached")
        );

        setHighUnassigned(urgentUnassigned);
        setPendingTickets(pending);
        setSlaAtRisk(atRisk);
        setResolvedTickets(resolved);
      } catch (e) {
        console.error("Triage load error:", e.message);
      } finally {
        setTriageLoading(false);
      }
    }
    loadTriage();
  }, []);

  // Fetch analytics + charts (time-range dependent)
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
            name: p.priority.charAt(0).toUpperCase() + p.priority.slice(1),
            value: p.total_tickets,
            color: p.priority === "high" ? "#f87171" : p.priority === "medium" ? "#94a3b8" : "#e2e8f0",
          }))
        );
        setCategoryData(
          (categoryRes.category_breakdown || []).map(c => ({
            name: c.category || "Unknown",
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

  // Helper — which SLA badge to show
  const slaBadge = (t) => {
    const worst = [t.response_sla_status, t.resolution_sla_status].includes("breached")
      ? "breached"
      : [t.response_sla_status, t.resolution_sla_status].includes("at_risk")
      ? "at_risk"
      : "healthy";
    return worst;
  };

  const handleAssign = async (ticketId) => {
    if (!selectedAgent) return;
    const member = teamMembersList.find(m => m.member_id === parseInt(selectedAgent));
    if (!member) return;

    setAssignLoading(true);
    setAssignError("");

    try {
      await assignTicket({
        ticket_id: ticketId,
        member_id: member.member_id,
        lead_id:   member.lead_id,
      });

      // Remove from pending / highUnassigned buckets after assign
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

  const handleApproval = async (ticketId, action) => {
    setApprovalLoading(ticketId);
    setApprovalError("");
    try {
      if (action === "approve") {
        await approveResolution({ ticket_id: ticketId, add_to_kb: false });
      } else {
        await rejectResolution({ ticket_id: ticketId });
      }
      // Remove from approval queue
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

  const getSlaStyle = (status) => ({
    healthy:  { color: "#4ade80" },
    at_risk:  { color: "#fbbf24" },
    breached: { color: "#f87171" },
  }[status] || { color: "rgba(255,255,255,0.3)" });

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
  { id: "analytics", label: "Analytics",        icon: BarChart3,       path: "/analytics"       },
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

        @keyframes spin { to { transform: rotate(360deg); } }
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
        <div className="modal-overlay" onClick={() => { setAssignModal(null); setAssignError(""); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: "#fff", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
              Assign Ticket
            </h3>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>TCK-{assignModal}</p>
            <select
              className="modal-select"
              value={selectedAgent}
              onChange={e => { setSelectedAgent(e.target.value); setAssignError(""); }}
            >
              <option value="">Select a team member...</option>
              {teamMembersList.length > 0
                ? teamMembersList.map(m => (
                    <option key={m.member_id} value={m.member_id}>
                      {m.name}
                    </option>
                  ))
                : <option disabled>No members found</option>
              }
            </select>

            {/* Error message */}
            {assignError && (
              <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#f87171", fontSize: 13 }}>
                ⚠ {assignError}
              </div>
            )}

            <button
              className="modal-confirm"
              disabled={!selectedAgent || assignLoading}
              style={{ opacity: (!selectedAgent || assignLoading) ? 0.5 : 1 }}
              onClick={() => handleAssign(assignModal)}
            >
              {assignLoading ? "Assigning..." : "Confirm Assignment"}
            </button>
            <button className="modal-cancel" onClick={() => { setAssignModal(null); setAssignError(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── TICKET DETAIL MODAL (CENTERED) ── */}
      {detailTicket && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", padding: 24 }} onClick={() => setDetailTicket(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 580, maxHeight: "88vh",
              background: "#111", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 22, overflowY: "auto", padding: 32,
              animation: "modalIn 0.28s cubic-bezier(0.22,1,0.36,1) both",
              boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
            }}
          >

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <p style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#94a3b8", margin: 0 }}>TCK-{detailTicket.ticket_id}</p>
                <h2 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 18, color: "#fff", margin: "6px 0 0", lineHeight: 1.3 }}>{detailTicket.subject}</h2>
              </div>
              <button onClick={() => setDetailTicket(null)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", flexShrink: 0 }}>
                <X size={16} />
              </button>
            </div>

            {/* Badges */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              <span style={{ ...getPriorityStyle(detailTicket.priority), padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>
                {detailTicket.priority}
              </span>
              <span style={{ ...getStatusStyle(detailTicket.status), padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                {detailTicket.status}
              </span>
            </div>

            {/* SLA */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>SLA Status</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Response",         val: detailTicket.response_sla_status,   status: detailTicket.response_sla_status,   elapsed: detailTicket.response_elapsed_minutes },
                  { label: "Resolution",        val: detailTicket.resolution_sla_status, status: detailTicket.resolution_sla_status, elapsed: detailTicket.resolution_elapsed_minutes },
                ].map(({ label, val, status, elapsed }) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px" }}>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "0 0 6px", textTransform: "uppercase" }}>{label}</p>
                    <p style={{ ...getSlaStyle(status), fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>
                      {status === "breached" ? "⚠ Breached" : status === "at_risk" ? "⚡ At Risk" : "✓ Healthy"}
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, margin: 0 }}>{fmtMinutes(elapsed)} elapsed</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timestamps */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, marginBottom: 20 }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>Timeline</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Created",    val: detailTicket.created_at  },
                  { label: "Assigned",   val: detailTicket.assigned_at },
                  { label: "Started",    val: detailTicket.started_at  },
                  { label: "Resolved",   val: detailTicket.resolved_at },
                  { label: "Closed",     val: detailTicket.closed_at   },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>{label}</span>
                    <span style={{ color: val ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: val ? 500 : 400 }}>
                      {val ? new Date(val).toLocaleString() : "—"}
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

            {/* Assign from panel */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
                {detailTicket._assignedName || detailTicket.assigned_at ? "Reassign Ticket" : "Assign Ticket"}
              </p>
              {(detailTicket._assignedName || detailTicket.assigned_at) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 10, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fff", color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>
                    {(detailTicket._assignedName || "??").split(" ").map(n => n[0]).join("")}
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
                    {detailTicket._assignedName || "Previously assigned"}
                  </span>
                </div>
              )}
              <select
                className="modal-select"
                style={{ margin: "0 0 12px" }}
                value={selectedAgent}
                onChange={e => { setSelectedAgent(e.target.value); setAssignError(""); }}
              >
                <option value="">Select a team member...</option>
                {teamMembersList.map(m => (
                  <option key={m.member_id} value={m.member_id}>
                    {m.name}
                  </option>
                ))}
              </select>

              {/* Error inside panel */}
              {assignError && (
                <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, color: "#f87171", fontSize: 13 }}>
                  ⚠ {assignError}
                </div>
              )}

              <button
                className="modal-confirm"
                disabled={!selectedAgent || assignLoading}
                style={{ opacity: (!selectedAgent || assignLoading) ? 0.4 : 1 }}
                onClick={() => handleAssign(detailTicket.ticket_id)}
              >
                {assignLoading ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
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
              SECTION 1 — ACTION CENTER
          ══════════════════════════════════════════ */}

          {/* Summary counters row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { key: "unassigned", label: "Unassigned High Priority", count: highUnassigned.length, icon: Flame,        color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)"  },
              { key: "pending",    label: "Pending Tickets",          count: pendingTickets.length,  icon: Clock,         color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)"   },
              { key: "sla",        label: "SLA At Risk / Breached",   count: slaAtRisk.length,       icon: ShieldAlert,   color: "#60a5fa", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.2)"   },
              { key: "approval",   label: "Awaiting Approval",        count: resolvedTickets.length, icon: CheckCircle,   color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)"  },
            ].map(({ key, label, count, icon: Icon, color, bg, border }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                style={{
                  background: activeSection === key ? bg : "rgba(255,255,255,0.02)",
                  border: `1px solid ${activeSection === key ? border : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 16, padding: "18px 20px", cursor: "pointer",
                  textAlign: "left", transition: "all 0.2s",
                  animation: "fadeSlideIn 0.4s ease both",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  {triageLoading
                    ? <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)" }} />
                    : <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 26, color: count > 0 ? color : "rgba(255,255,255,0.2)" }}>{count}</span>
                  }
                </div>
                <p style={{ color: activeSection === key ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 600, margin: 0 }}>{label}</p>
              </button>
            ))}
          </div>

          {/* Active triage table */}
          <div className="chart-card" style={{ marginBottom: 24, animation: "fadeSlideIn 0.4s ease both" }}>

            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {activeSection === "unassigned" && <><Flame size={18} style={{ color: "#f87171" }} /><div><h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", margin: 0 }}>Unassigned High Priority</h3><p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "3px 0 0" }}>High priority tickets with no assigned agent — assign immediately</p></div></>}
                {activeSection === "pending"    && <><Clock size={18} style={{ color: "#fbbf24" }} /><div><h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", margin: 0 }}>Pending Tickets</h3><p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "3px 0 0" }}>All tickets waiting to be assigned to an agent</p></div></>}
                {activeSection === "sla"        && <><ShieldAlert size={18} style={{ color: "#60a5fa" }} /><div><h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", margin: 0 }}>SLA At Risk / Breached</h3><p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "3px 0 0" }}>Tickets approaching or past SLA deadline</p></div></>}
                {activeSection === "approval"   && <><CheckCircle size={18} style={{ color: "#a78bfa" }} /><div><h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", margin: 0 }}>Awaiting Approval</h3><p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "3px 0 0" }}>Resolved tickets waiting for your approval or rejection</p></div></>}
              </div>
              <button
                onClick={() => navigate("/tickets")}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                <Ticket size={13} /> View All
              </button>
            </div>

            {/* Approval error banner */}
            {approvalError && (
              <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>
                ⚠ {approvalError}
                <button onClick={() => setApprovalError("")} style={{ float: "right", background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>✕</button>
              </div>
            )}

            {triageLoading ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
                <RefreshCw size={22} style={{ margin: "0 auto 10px", display: "block", animation: "spin 1s linear infinite" }} />
                Loading action items...
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>

                {/* ── UNASSIGNED HIGH PRIORITY ── */}
                {activeSection === "unassigned" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Ticket ID", "Subject", "Priority", "SLA Status", "Created", "Assign To"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: h === "Ticket ID" || h === "Subject" || h === "Created" ? "left" : "center", fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {highUnassigned.length === 0
                        ? <tr><td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>🎉 No unassigned high priority tickets</td></tr>
                        : highUnassigned.map(t => (
                          <tr key={t.ticket_id} className="ticket-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }} onClick={() => { setDetailTicket(t); setSelectedAgent(""); }}>
                            <td style={{ padding: "14px", color: "#94a3b8", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>TCK-{t.ticket_id}</td>
                            <td style={{ padding: "14px", color: "#fff", fontWeight: 500, maxWidth: 240 }}>
                              <span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.subject}</span>
                            </td>
                            <td style={{ padding: "14px", textAlign: "center" }}>
                              <span style={{ ...getPriorityStyle(t.priority), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{t.priority}</span>
                            </td>
                            <td style={{ padding: "14px", textAlign: "center" }}>
                              {(() => { const s = slaBadge(t); return <span style={{ ...getSlaStyle(s), fontSize: 12, fontWeight: 600 }}>{s === "breached" ? "⚠ Breached" : s === "at_risk" ? "⚡ At Risk" : "✓ Healthy"}</span>; })()}
                            </td>
                            <td style={{ padding: "14px", color: "rgba(255,255,255,0.3)", fontSize: 12, whiteSpace: "nowrap" }}>{formatCreated(t.created_at)}</td>
                            <td style={{ padding: "14px", textAlign: "center" }}>
                              <button className="assign-btn" onClick={e => { e.stopPropagation(); setAssignModal(t.ticket_id); setSelectedAgent(""); }}>
                                <UserPlus size={11} /> Assign
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                )}

                {/* ── PENDING TICKETS ── */}
                {activeSection === "pending" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Ticket ID", "Subject", "Priority", "SLA Status", "Created", "Assign To"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: h === "Ticket ID" || h === "Subject" || h === "Created" ? "left" : "center", fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTickets.length === 0
                        ? <tr><td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>🎉 No pending tickets</td></tr>
                        : pendingTickets.map(t => (
                          <tr key={t.ticket_id} className="ticket-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }} onClick={() => { setDetailTicket(t); setSelectedAgent(""); }}>
                            <td style={{ padding: "14px", color: "#94a3b8", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>TCK-{t.ticket_id}</td>
                            <td style={{ padding: "14px", color: "#fff", fontWeight: 500, maxWidth: 240 }}>
                              <span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.subject}</span>
                            </td>
                            <td style={{ padding: "14px", textAlign: "center" }}>
                              <span style={{ ...getPriorityStyle(t.priority), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{t.priority}</span>
                            </td>
                            <td style={{ padding: "14px", textAlign: "center" }}>
                              {(() => { const s = slaBadge(t); return <span style={{ ...getSlaStyle(s), fontSize: 12, fontWeight: 600 }}>{s === "breached" ? "⚠ Breached" : s === "at_risk" ? "⚡ At Risk" : "✓ Healthy"}</span>; })()}
                            </td>
                            <td style={{ padding: "14px", color: "rgba(255,255,255,0.3)", fontSize: 12, whiteSpace: "nowrap" }}>{formatCreated(t.created_at)}</td>
                            <td style={{ padding: "14px", textAlign: "center" }}>
                              <button className="assign-btn" onClick={e => { e.stopPropagation(); setAssignModal(t.ticket_id); setSelectedAgent(""); }}>
                                <UserPlus size={11} /> Assign
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                )}

                {/* ── SLA AT RISK ── */}
                {activeSection === "sla" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Ticket ID", "Subject", "Priority", "Status", "Response SLA", "Resolution SLA", "Created"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: h === "Ticket ID" || h === "Subject" || h === "Created" ? "left" : "center", fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slaAtRisk.length === 0
                        ? <tr><td colSpan={7} style={{ padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>✅ All tickets within SLA</td></tr>
                        : slaAtRisk.map(t => (
                          <tr key={t.ticket_id} className="ticket-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }} onClick={() => { setDetailTicket(t); setSelectedAgent(""); }}>
                            <td style={{ padding: "14px", color: "#94a3b8", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>TCK-{t.ticket_id}</td>
                            <td style={{ padding: "14px", color: "#fff", fontWeight: 500, maxWidth: 200 }}>
                              <span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.subject}</span>
                            </td>
                            <td style={{ padding: "14px", textAlign: "center" }}>
                              <span style={{ ...getPriorityStyle(t.priority), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{t.priority}</span>
                            </td>
                            <td style={{ padding: "14px", textAlign: "center" }}>
                              <span style={{ ...getStatusStyle(t.status), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{t.status}</span>
                            </td>
                            <td style={{ padding: "14px", textAlign: "center" }}>
                              <span style={{ ...getSlaStyle(t.response_sla_status), fontSize: 12, fontWeight: 600 }}>{t.response_sla_status === "breached" ? "⚠ Breached" : t.response_sla_status === "at_risk" ? "⚡ At Risk" : "✓ OK"}</span>
                            </td>
                            <td style={{ padding: "14px", textAlign: "center" }}>
                              <span style={{ ...getSlaStyle(t.resolution_sla_status), fontSize: 12, fontWeight: 600 }}>{t.resolution_sla_status === "breached" ? "⚠ Breached" : t.resolution_sla_status === "at_risk" ? "⚡ At Risk" : "✓ OK"}</span>
                            </td>
                            <td style={{ padding: "14px", color: "rgba(255,255,255,0.3)", fontSize: 12, whiteSpace: "nowrap" }}>{formatCreated(t.created_at)}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                )}

                {/* ── APPROVAL QUEUE ── */}
                {activeSection === "approval" && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Ticket ID", "Subject", "Priority", "SLA Status", "Resolved", "Actions"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: h === "Ticket ID" || h === "Subject" || h === "Resolved" ? "left" : "center", fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedTickets.length === 0
                        ? <tr><td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>🎉 No tickets awaiting approval</td></tr>
                        : resolvedTickets.map(t => (
                          <tr key={t.ticket_id} className="ticket-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }} onClick={() => { setDetailTicket(t); setSelectedAgent(""); }}>
                            <td style={{ padding: "14px", color: "#94a3b8", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>TCK-{t.ticket_id}</td>
                            <td style={{ padding: "14px", color: "#fff", fontWeight: 500, maxWidth: 200 }}>
                              <span style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.subject}</span>
                            </td>
                            <td style={{ padding: "14px", textAlign: "center" }}>
                              <span style={{ ...getPriorityStyle(t.priority), padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{t.priority}</span>
                            </td>
                            <td style={{ padding: "14px", textAlign: "center" }}>
                              {(() => { const s = slaBadge(t); return <span style={{ ...getSlaStyle(s), fontSize: 12, fontWeight: 600 }}>{s === "breached" ? "⚠ Breached" : s === "at_risk" ? "⚡ At Risk" : "✓ Healthy"}</span>; })()}
                            </td>
                            <td style={{ padding: "14px", color: "rgba(255,255,255,0.3)", fontSize: 12, whiteSpace: "nowrap" }}>{formatCreated(t.resolved_at || t.created_at)}</td>
                            <td style={{ padding: "14px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                                <button
                                  disabled={approvalLoading === t.ticket_id}
                                  onClick={() => handleApproval(t.ticket_id, "approve")}
                                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.08)", color: "#4ade80", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: approvalLoading === t.ticket_id ? 0.5 : 1, fontFamily: "'Nunito Sans', sans-serif" }}
                                >
                                  <ThumbsUp size={11} /> {approvalLoading === t.ticket_id ? "…" : "Approve"}
                                </button>
                                <button
                                  disabled={approvalLoading === t.ticket_id}
                                  onClick={() => handleApproval(t.ticket_id, "reject")}
                                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: approvalLoading === t.ticket_id ? 0.5 : 1, fontFamily: "'Nunito Sans', sans-serif" }}
                                >
                                  <ThumbsDown size={11} /> {approvalLoading === t.ticket_id ? "…" : "Reject"}
                                </button>
                              </div>
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