import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Ticket, Users, BarChart3, Settings, LogOut,
  Bell, Star, TrendingUp, TrendingDown, Award, CheckCircle,
  Clock, AlertCircle, MessageSquare, Target, Zap, Shield, RefreshCw,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import { fetchMemberAnalytics } from "../api";
import supabase from "../supabaseClient";

// Grade color mapping
const GRADE_COLORS = { A: "#4ade80", B: "#ffffff", C: "#fbbf24", D: "#f87171" };

// Assign a consistent color per member index
const MEMBER_PALETTE = ["#ffffff", "#94a3b8", "#fbbf24", "#4ade80", "#60a5fa", "#a78bfa"];

// Convert avg_response_time_minutes to readable string
function fmtMinutes(mins) {
  if (!mins || mins === 0) return "—";
  if (mins < 60) return `${Math.round(mins)}m`;
  return `${(mins / 60).toFixed(1)}h`;
}

// Build initials from name
function initials(name) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// Build skill-like scores from real data for the radar chart
function buildSkills(member) {
  const breachRate   = member.sla_breach_rate_percent || 0;
  const reopenScore  = Math.max(0, 100 - (member.reopens / Math.max(member.tickets_handled, 1)) * 100);
  const speedScore   = Math.max(0, 100 - Math.min(member.average_response_time_minutes / 2, 100));
  const resolveScore = Math.max(0, 100 - Math.min(member.average_resolution_time_minutes / 10, 100));
  const slaScore     = Math.max(0, 100 - breachRate);
  return {
    Speed:       Math.round(speedScore),
    Resolution:  Math.round(resolveScore),
    "SLA Score": Math.round(slaScore),
    Reliability: Math.round(reopenScore),
    Volume:      Math.min(100, Math.round((member.tickets_handled / 30) * 100)),
  };
}

const navItems = [
  { id: "overview", label: "Dashboard",       icon: LayoutDashboard, path: "/teamlead"         },
  { id: "tickets",  label: "Tickets",          icon: Ticket,          path: "/tickets"          },
  { id: "team",     label: "Team Performance", icon: Users,           path: "/team-performance" },
  { id: "analytics",label: "Analytics",        icon: BarChart3,       path: "/analytics"        },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function TeamPerformancePage() {
  const navigate = useNavigate();
  const [members,           setMembers]           = useState([]);
  const [selectedMember,    setSelectedMember]    = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState("");
  const [range,             setRange]             = useState("7days");
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNav,         setActiveNav]         = useState("team");
  const [currentUser,       setCurrentUser]       = useState(null);

  // ── Load logged-in user ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: leadRow } = await supabase
          .from("team_leads")
          .select("lead_id, name")
          .eq("supabase_user_id", user.id)
          .single();
        const name = leadRow?.name || user.email;
        setCurrentUser({
          id:       user.id,
          email:    user.email,
          name,
          initials: name
            ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
            : user.email.slice(0, 2).toUpperCase(),
        });
      } catch (e) {
        console.error("Failed to load user:", e);
      }
    })();
  }, []);

  // ── Fetch real member analytics ──────────────────
  useEffect(() => {
    loadMembers();
  }, [range]);

  async function loadMembers() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchMemberAnalytics(range);
      const enriched = (data.members || []).map((m, i) => ({
        ...m,
        avatar:  initials(m.name),
        color:   MEMBER_PALETTE[i % MEMBER_PALETTE.length],
        skills:  buildSkills(m),
      }));
      setMembers(enriched);
      if (enriched.length > 0) setSelectedMember(enriched[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleNavClick = (item) => {
    if (item.path) navigate(item.path);
    else setActiveNav(item.id);
  };

  // Build radar data from selected member's skills
  const radarData = selectedMember
    ? Object.entries(selectedMember.skills).map(([key, val]) => ({ skill: key, value: val }))
    : [];

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
        @keyframes fadeUp   { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes pulse-dot{ 0%,100%{opacity:1} 50%{opacity:.4} }
        .nav-btn { width:100%;display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;border:none;background:transparent;cursor:pointer;font-family:'Nunito Sans',sans-serif;font-size:14px;color:rgba(255,255,255,0.4);transition:all .2s;text-align:left; }
        .nav-btn:hover  { background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.8); }
        .nav-btn.active { background:rgba(255,255,255,0.08);color:#fff;font-weight:600; }
        .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; }
        .member-card { padding: 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s; }
        .member-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }
        .member-card.active { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.2); }
        .progress-track { height: 5px; background: rgba(255,255,255,0.06); border-radius: 999px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 999px; transition: width 0.6s ease; }
        .range-btn { padding: 7px 16px; border-radius: 10px; font-size: 12px; font-weight: 600; font-family: 'Nunito Sans', sans-serif; cursor: pointer; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: rgba(255,255,255,0.4); }
        .range-btn.active { background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.2); }
      `}</style>

      {/* SIDEBAR */}
      <aside style={{ width: 220, background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "28px 0", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "0.25em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>SACK.AI</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`nav-btn ${activeNav === item.id ? "active" : ""}`} onClick={() => handleNavClick(item)}>
                <Icon size={16} /> {item.label}
              </button>
            );
          })}
          <button onClick={() => navigate("/settings")}
  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 4, fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, fontWeight: 600, background: "transparent", color: "rgba(255,255,255,0.35)", marginTop: 8 }}>
  <Settings size={16} /> Settings
</button>
        </nav>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16, marginTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "0 6px" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#080808", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>TL</div>
                    <div>
                      <p style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0 }}>Team Lead</p>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>admin@company.com</p>
                    </div>
                  </div>
                  <button onClick={() => navigate("/")}
  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, fontWeight: 600, background: "transparent", color: "rgba(255,255,255,0.35)" }}>
  <LogOut size={16} /> Logout
</button>
                </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 22, color: "#fff", margin: 0 }}>Team Performance</h1>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: "4px 0 0" }}>Real-time agent metrics and analytics</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["7days", "30days"].map(r => (
              <button key={r} className={`range-btn ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>
                {r === "7days" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>

          {loading && (
            <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.3)" }}>
              <RefreshCw size={28} style={{ margin: "0 auto 12px", display: "block", animation: "spin 1s linear infinite" }} />
              <p style={{ fontSize: 14, margin: 0 }}>Loading team performance...</p>
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#f87171" }}>
              <AlertCircle size={36} style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ fontSize: 15, margin: 0 }}>Failed to load performance data</p>
              <p style={{ fontSize: 13, marginTop: 6, color: "rgba(255,255,255,0.3)" }}>{error}</p>
              <button onClick={loadMembers} style={{ marginTop: 16, padding: "8px 20px", borderRadius: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", fontSize: 13 }}>Try Again</button>
            </div>
          )}

          {!loading && !error && selectedMember && (
            <>
              {/* MEMBER LIST + DETAIL */}
              <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, marginBottom: 20 }}>

                {/* LEFT - member list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Agents ({members.length})</h3>
                  {members.map((member) => (
                    <div key={member.member_id} className={`member-card ${selectedMember.member_id === member.member_id ? "active" : ""}`} onClick={() => setSelectedMember(member)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: member.color, color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                          {member.avatar}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0 }}>{member.name}</p>
                          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>{member.tickets_handled} tickets handled</p>
                        </div>
                        <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 22, color: GRADE_COLORS[member.performance_grade] || "#fff" }}>{member.performance_grade}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                        {[
                          { label: "Response",   val: fmtMinutes(member.average_response_time_minutes) },
                          { label: "Resolution", val: fmtMinutes(member.average_resolution_time_minutes) },
                          { label: "Breach",     val: `${member.sla_breach_rate_percent}%`, color: member.sla_breach_rate_percent > 30 ? "#f87171" : member.sla_breach_rate_percent > 10 ? "#fbbf24" : "#4ade80" },
                        ].map(({ label, val, color }) => (
                          <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "7px 10px" }}>
                            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, margin: 0, textTransform: "uppercase" }}>{label}</p>
                            <p style={{ color: color || "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 13, margin: 0 }}>{val}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* RIGHT - detail panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="card" style={{ padding: 24, animation: "fadeUp 0.3s ease both" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 22 }}>
                      <div style={{ width: 64, height: 64, borderRadius: "50%", background: selectedMember.color, color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
                        {selectedMember.avatar}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h2 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 22, color: "#fff", margin: "0 0 4px" }}>{selectedMember.name}</h2>
                        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, margin: "0 0 14px" }}>Support Agent</p>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {[
                            { label: "Avg Response",    val: fmtMinutes(selectedMember.average_response_time_minutes),   color: "#94a3b8" },
                            { label: "Avg Resolution",  val: fmtMinutes(selectedMember.average_resolution_time_minutes), color: "#4ade80" },
                            { label: "Total Handled",   val: `${selectedMember.tickets_handled} tickets`,               color: "#fff"    },
                            { label: "Reopens",         val: selectedMember.reopens,                                     color: selectedMember.reopens > 2 ? "#f87171" : "#fff" },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 16px" }}>
                              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>{label}</p>
                              <p style={{ color, fontWeight: 700, fontSize: 16, margin: 0, fontFamily: "'Nunito', sans-serif" }}>{val}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 20px", flexShrink: 0 }}>
                        <Award size={18} style={{ color: GRADE_COLORS[selectedMember.performance_grade], marginBottom: 4 }} />
                        <p style={{ color: GRADE_COLORS[selectedMember.performance_grade], fontWeight: 800, fontSize: 32, margin: 0, fontFamily: "'Nunito', sans-serif" }}>{selectedMember.performance_grade}</p>
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>Grade</p>
                      </div>
                    </div>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 14px" }}>Performance Breakdown</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {Object.entries(selectedMember.skills).map(([skill, val]) => (
                        <div key={skill}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 5 }}>
                            <span>{skill}</span><span style={{ fontWeight: 700, color: "#fff" }}>{val}%</span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${val}%`, background: val >= 80 ? "#4ade80" : val >= 60 ? "#ffffff" : "#fbbf24" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="card" style={{ padding: 24 }}>
                      <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", margin: "0 0 4px" }}>Performance Radar</h3>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 16px" }}>Computed from real metrics</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="rgba(255,255,255,0.08)" />
                          <PolarAngleAxis dataKey="skill" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
                          <Radar name={selectedMember.name} dataKey="value" stroke={selectedMember.color} fill={selectedMember.color} fillOpacity={0.1} strokeWidth={1.5} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="card" style={{ padding: 24 }}>
                      <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", margin: "0 0 4px" }}>SLA Summary</h3>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 20px" }}>Breach and reopen stats</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {[
                          { label: "SLA Breaches",    val: selectedMember.sla_breaches,            color: selectedMember.sla_breaches > 5 ? "#f87171" : "#fff" },
                          { label: "Breach Rate",     val: `${selectedMember.sla_breach_rate_percent}%`, color: selectedMember.sla_breach_rate_percent > 30 ? "#f87171" : selectedMember.sla_breach_rate_percent > 10 ? "#fbbf24" : "#4ade80" },
                          { label: "Ticket Reopens",  val: selectedMember.reopens,                  color: selectedMember.reopens > 2 ? "#fbbf24" : "#4ade80" },
                          { label: "Total Handled",   val: selectedMember.tickets_handled,           color: "#fff" },
                        ].map(({ label, val, color }) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{label}</span>
                            <span style={{ color, fontWeight: 700, fontSize: 16, fontFamily: "'Nunito', sans-serif" }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* COMPARISON CHART */}
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", margin: "0 0 4px" }}>Team Comparison</h3>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 24px" }}>Tickets handled vs SLA breaches per agent</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={members} barCategoryGap="30%">
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="tickets_handled" name="Tickets Handled" radius={[4,4,0,0]} opacity={0.9}>
                      {members.map((m, i) => <Cell key={i} fill={m.color} />)}
                    </Bar>
                    <Bar dataKey="sla_breaches" name="SLA Breaches" fill="#f87171" radius={[4,4,0,0]} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}