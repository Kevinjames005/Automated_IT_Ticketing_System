import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Ticket, Users, BarChart3, LogOut, Settings,
  TrendingUp, TrendingDown, CheckCircle, AlertCircle, RefreshCw, Calendar, Clock,
} from "lucide-react";
import {
  fetchAnalytics, fetchPriorityBreakdown, fetchCategoryBreakdown,
  fetchSlaTrend, fetchSlaComparison,
} from "../api";
import supabase from "../supabaseClient";
import { useUser } from "../../UserContext";

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtMins(m) {
  if (!m || m <= 0) return "—";
  if (m < 60) return `${Math.round(m)}m`;
  return `${(m / 60).toFixed(1)}h`;
}
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}
function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }

// ── Mini SVG Bar Chart ────────────────────────────────────────────────────────
function BarChartSVG({ data, valueKey, color = "#ffffff", height = 120 }) {
  if (!data?.length) return <Empty />;
  const vals = data.map(d => d[valueKey] || 0);
  const max = Math.max(...vals, 1);
  const w = 100 / data.length;
  return (
    <svg width="100%" height={height} style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const pct = (d[valueKey] || 0) / max;
        const barH = clamp(pct * (height - 24), 2, height - 24);
        const x = i * w + w * 0.15;
        const bw = w * 0.7;
        return (
          <g key={i}>
            <rect x={`${x}%`} y={height - barH - 20} width={`${bw}%`} height={barH}
              fill={color} opacity={0.8} rx={3} />
            <text x={`${x + bw / 2}%`} y={height - 4} textAnchor="middle"
              fill="rgba(255,255,255,0.35)" fontSize={10}>{d.label || d.name || d.date}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Grouped Bar Chart (2 values) ─────────────────────────────────────────────
function GroupedBarSVG({ data, keyA, keyB, colorA, colorB, height = 140 }) {
  if (!data?.length) return <Empty />;
  const allVals = data.flatMap(d => [d[keyA] || 0, d[keyB] || 0]);
  const max = Math.max(...allVals, 1);
  const groupW = 100 / data.length;
  return (
    <svg width="100%" height={height} style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const aH = clamp(((d[keyA] || 0) / max) * (height - 24), 2, height - 24);
        const bH = clamp(((d[keyB] || 0) / max) * (height - 24), 2, height - 24);
        const gx = i * groupW;
        return (
          <g key={i}>
            <rect x={`${gx + groupW * 0.1}%`}  y={height - aH - 20} width={`${groupW * 0.35}%`} height={aH}  fill={colorA} opacity={0.85} rx={2} />
            <rect x={`${gx + groupW * 0.5}%`}  y={height - bH - 20} width={`${groupW * 0.35}%`} height={bH}  fill={colorB} opacity={0.85} rx={2} />
            <text x={`${gx + groupW / 2}%`} y={height - 4} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={10}>{d.name || d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Area / Line Chart (SVG path) ─────────────────────────────────────────────
function LineChartSVG({ data, lines, height = 160 }) {
  if (!data?.length) return <Empty />;
  const W = 600, H = height - 28;
  const allVals = lines.flatMap(l => data.map(d => parseFloat(d[l.key]) || 0));
  const max = Math.max(...allVals, 1);
  const px = (i) => (i / (data.length - 1)) * W;
  const py = (v) => H - clamp((parseFloat(v) / max) * H, 0, H);

  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={0} y1={H * (1 - f)} x2={W} y2={H * (1 - f)}
          stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
      ))}
      {lines.map(({ key, color, fill }) => {
        const pts = data.map((d, i) => `${px(i)},${py(d[key])}`).join(" ");
        const areaPath = `M${px(0)},${H} ` + data.map((d, i) => `L${px(i)},${py(d[key])}`).join(" ") + ` L${px(data.length - 1)},${H} Z`;
        return (
          <g key={key}>
            {fill && <path d={areaPath} fill={color} opacity={0.12} />}
            <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => (
              <circle key={i} cx={px(i)} cy={py(d[key])} r={3} fill={color} opacity={0.8} />
            ))}
          </g>
        );
      })}
      {/* X labels */}
      {data.map((d, i) => (
        <text key={i} x={px(i)} y={height - 4} textAnchor="middle"
          fill="rgba(255,255,255,0.3)" fontSize={10}>{d.date || d.label}</text>
      ))}
    </svg>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutSVG({ data, size = 140 }) {
  if (!data?.length) return <Empty />;
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (total === 0) return <Empty />;
  const cx = size / 2, cy = size / 2, r = size * 0.36, ir = size * 0.22;
  let angle = -Math.PI / 2;
  const slices = data.map(d => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const ix1 = cx + ir * Math.cos(angle - sweep), iy1 = cy + ir * Math.sin(angle - sweep);
    const ix2 = cx + ir * Math.cos(angle), iy2 = cy + ir * Math.sin(angle);
    return { path: `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${ir},${ir} 0 ${large},0 ${ix1},${iy1} Z`, color: d.color };
  });
  return (
    <svg width={size} height={size}>
      {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity={0.85} />)}
      <text x={cx} y={cy + 5} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={700}>{total}</text>
    </svg>
  );
}

// ── Horizontal Bar ────────────────────────────────────────────────────────────
function HBarChart({ data, valueKey, colors }) {
  if (!data?.length) return <Empty />;
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{d.name}</span>
            <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{d[valueKey]}</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${((d[valueKey] || 0) / max) * 100}%`, background: colors[i % colors.length], borderRadius: 4, transition: "width .6s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.15)", fontSize: 13 }}>No data yet</div>;
}

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "overview",  label: "Dashboard",       icon: LayoutDashboard, path: "/teamlead"         },
  { id: "tickets",   label: "Tickets",          icon: Ticket,          path: "/tickets"          },
  { id: "team",      label: "Team Performance", icon: Users,           path: "/team-performance" },
  { id: "analytics", label: "Analytics",        icon: BarChart3,       path: "/analytics"        },
];

const CAT_COLORS  = ["#ffffff", "#94a3b8", "#60a5fa", "#a78bfa", "#f472b6", "#fb923c", "#4ade80", "#fbbf24"];
const PRIO_COLORS = { high: "#f87171", medium: "#fbbf24", low: "#4ade80" };

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const [range,        setRange]        = useState("7days");
  const [kpi,          setKpi]          = useState(null);
  const [priority,     setPriority]     = useState([]);
  const [category,     setCategory]     = useState([]);
  const [trend,        setTrend]        = useState([]);
  const [comparison,   setComparison]   = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");


  const days = range === "7days" ? 7 : 30;

  useEffect(() => { loadAll(); }, [range]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [kpiRes, prioRes, catRes, trendRes, compRes] = await Promise.allSettled([
        fetchAnalytics(range),
        fetchPriorityBreakdown(range),
        fetchCategoryBreakdown(range),
        fetchSlaTrend(days),
        fetchSlaComparison(days),
      ]);

      if (kpiRes.status === "fulfilled")  setKpi(kpiRes.value);
      else console.error("KPI:", kpiRes.reason?.message);

      if (prioRes.status === "fulfilled") {
        setPriority((prioRes.value?.priority_breakdown || []).map(p => ({
          name:           (p.priority || "").charAt(0).toUpperCase() + (p.priority || "").slice(1),
          priority:       p.priority || "",
          Total:          p.total_tickets   || 0,
          Open:           p.open_tickets    || 0,
          Closed:         p.closed_tickets  || 0,
          "Avg Response":   Math.round(p.average_response_time_minutes   || 0),
          "Avg Resolution": Math.round(p.average_resolution_time_minutes || 0),
        })));
      } else console.error("Priority:", prioRes.reason?.message);

      if (catRes.status === "fulfilled") {
        setCategory((catRes.value?.category_breakdown || []).slice(0, 8).map(c => ({
          name:  c.category || "Unknown",
          Total: c.total_tickets || 0,
          Open:  c.open_tickets  || 0,
        })));
      } else console.error("Category:", catRes.reason?.message);

      if (trendRes.status === "fulfilled") {
        setTrend((trendRes.value?.sla_trend || []).map(t => ({
          date:          fmtDate(t.date),
          Tickets:       t.total_tickets || 0,
          "Resp Breach": parseFloat(t.response_breach_percent   || 0),
          "Res Breach":  parseFloat(t.resolution_breach_percent || 0),
          "Avg Resp":    Math.round(t.average_response_time_minutes   || 0),
          "Avg Res":     Math.round(t.average_resolution_time_minutes || 0),
        })));
      } else console.error("Trend:", trendRes.reason?.message);

      if (compRes.status === "fulfilled") setComparison(compRes.value);
      else console.error("Comparison:", compRes.reason?.message);

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const pieData = priority.map(p => ({ name: p.name, value: p.Total, color: PRIO_COLORS[p.priority] || "#94a3b8" }));

  const slaBreachColor = (pct) => {
    if (!pct) return "#94a3b8";
    if (pct > 30) return "#f87171";
    if (pct > 10) return "#fbbf24";
    return "#4ade80";
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#080808", fontFamily: "'Nunito Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Nunito+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px } ::-webkit-scrollbar-track { background:#111 } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1);border-radius:3px }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-d { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .nav-btn { width:100%;display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;border:none;background:transparent;cursor:pointer;text-align:left;font-family:'Nunito Sans',sans-serif;font-size:14px;color:rgba(255,255,255,0.4);transition:all .2s }
        .nav-btn:hover  { background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.8) }
        .nav-btn.active { background:rgba(255,255,255,0.08);color:#fff;font-weight:600 }
        .card { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:22px }
        .kpi  { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:22px;animation:fadeUp .4s ease both;transition:border-color .2s,background .2s }
        .kpi:hover { border-color:rgba(255,255,255,0.14);background:rgba(255,255,255,0.05) }
        .range-btn { padding:7px 18px;border-radius:10px;font-size:12px;font-weight:600;font-family:'Nunito Sans',sans-serif;cursor:pointer;transition:all .2s;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.4) }
        .range-btn.active { background:rgba(255,255,255,0.1);color:#fff;border-color:rgba(255,255,255,0.2) }
        .ct { color:rgba(255,255,255,0.3);font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 4px }
        .cv { color:#fff;font-weight:800;font-size:26px;margin:0;font-family:'Nunito',sans-serif }
        .stitle { font-family:'Nunito',sans-serif;font-weight:700;font-size:15px;color:#fff;margin:0 0 4px }
        .ssub   { color:rgba(255,255,255,0.3);font-size:12px;margin:0 0 18px }
        .legend-dot { width:9px;height:9px;border-radius:50%;flex-shrink:0 }
      `}</style>

      {/* SIDEBAR */}
      <aside style={{ width:240,background:"#0d0d0d",borderRight:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",padding:"24px 16px",height:"100vh",position:"sticky",top:0,flexShrink:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:36,padding:"0 6px" }}>
          <div style={{ width:8,height:8,background:"#fff",borderRadius:"50%",boxShadow:"0 0 10px 3px rgba(255,255,255,0.3)",animation:"pulse-d 2.5s ease infinite" }} />
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "0.25em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>SACK.AI</span>
        </div>
        <nav style={{ flex:1,display:"flex",flexDirection:"column",gap:4 }}>
          {NAV.map(({ id, label, icon: Icon, path }) => (
            <button key={id} className={`nav-btn ${id === "analytics" ? "active" : ""}`} onClick={() => navigate(path)}>
              <Icon size={16} /> {label}
            </button>
          ))}
           <button onClick={() => navigate("/settings")}
  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 4, fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, fontWeight: 600, background: "transparent", color: "rgba(255,255,255,0.35)", marginTop: 8 }}>
  <Settings size={16} /> Settings
</button>
        </nav>
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:16,marginTop:16 }}>
          <div style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"14px 12px",marginBottom:10 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
              <div style={{ width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:14,flexShrink:0,boxShadow:"0 0 0 2px rgba(99,102,241,0.3)" }}>
                {currentUser?.initials || "TL"}
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ color:"#fff",fontSize:13,fontWeight:700,margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                  {currentUser?.name || "Team Lead"}
                </p>
                <p style={{ color:"rgba(255,255,255,0.35)",fontSize:11,margin:"2px 0 0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
                  {currentUser?.email || "—"}
                </p>
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ background:"rgba(99,102,241,0.15)",color:"#818cf8",border:"1px solid rgba(99,102,241,0.25)",borderRadius:999,fontSize:10,fontWeight:700,padding:"2px 10px",letterSpacing:"0.05em",textTransform:"uppercase" }}>
                Team Lead
              </span>
              <span style={{ width:6,height:6,borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 6px #4ade80",display:"inline-block" }} />
              <span style={{ color:"#4ade80",fontSize:10,fontWeight:600 }}>Online</span>
            </div>
          </div>
          <button className="nav-btn" onClick={() => supabase.auth.signOut().then(() => navigate("/"))}><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex:1,overflowY:"auto" }}>

        {/* HEADER */}
        <header style={{ background:"rgba(8,8,8,0.9)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"16px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50 }}>
          <div>
            <h1 style={{ fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:20,color:"#fff",margin:0 }}>Analytics</h1>
            <p style={{ color:"rgba(255,255,255,0.3)",fontSize:12,margin:"2px 0 0" }}>SLA performance, trends and breakdowns</p>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <Calendar size={14} style={{ color:"rgba(255,255,255,0.3)" }} />
            {["7days","30days"].map(r => (
              <button key={r} className={`range-btn ${range===r?"active":""}`} onClick={() => setRange(r)}>
                {r === "7days" ? "7 Days" : "30 Days"}
              </button>
            ))}
            <button onClick={loadAll} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:8,cursor:"pointer",display:"flex",color:"rgba(255,255,255,0.5)",marginLeft:4 }}>
              <RefreshCw size={15} style={{ animation:loading?"spin 1s linear infinite":"none" }} />
            </button>
          </div>
        </header>

        <div style={{ padding:28 }}>

          {loading && (
            <div style={{ textAlign:"center",padding:"80px 0",color:"rgba(255,255,255,0.3)" }}>
              <RefreshCw size={28} style={{ margin:"0 auto 12px",display:"block",animation:"spin 1s linear infinite" }} />
              <p style={{ fontSize:14,margin:0 }}>Loading analytics...</p>
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign:"center",padding:"80px 0",color:"#f87171" }}>
              <AlertCircle size={36} style={{ margin:"0 auto 12px",display:"block" }} />
              <p style={{ fontSize:15,margin:0 }}>Failed to load analytics</p>
              <p style={{ fontSize:13,marginTop:6,color:"rgba(255,255,255,0.3)" }}>{error}</p>
              <button onClick={loadAll} style={{ marginTop:16,padding:"8px 20px",borderRadius:10,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",color:"#fff",cursor:"pointer",fontSize:13 }}>Try Again</button>
            </div>
          )}

          {!loading && (
            <>
              {/* ── KPI CARDS ROW 1 ── */}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:16 }}>
                {[
                  { label:"Total Tickets",  val: kpi?.total_tickets  ?? "—", icon:Ticket,      color:"#fff",    bg:"rgba(255,255,255,0.08)", delay:"0s"    },
                  { label:"Open Tickets",   val: kpi?.open_tickets   ?? "—", icon:AlertCircle, color:"#fbbf24", bg:"rgba(251,191,36,0.1)",   delay:"0.06s" },
                  { label:"Closed Tickets", val: kpi?.closed_tickets ?? "—", icon:CheckCircle, color:"#4ade80", bg:"rgba(74,222,128,0.1)",   delay:"0.12s" },
                ].map(({ label, val, icon: Icon, color, bg, delay }) => (
                  <div key={label} className="kpi" style={{ animationDelay:delay,display:"flex",alignItems:"center",gap:16 }}>
                    <div style={{ width:46,height:46,borderRadius:13,background:bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <Icon size={20} style={{ color }} />
                    </div>
                    <div>
                      <p className="ct">{label}</p>
                      <p className="cv">{val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── KPI CARDS ROW 2 ── */}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:28 }}>
                {[
                  { label:"Avg Lead Assign Time",       val: fmtMins(kpi?.average_response_time_minutes),   color:"#60a5fa", delay:"0.18s" },
                  { label:"Avg Member Resolution Time", val: fmtMins(kpi?.average_resolution_time_minutes), color:"#a78bfa", delay:"0.24s" },
                  { label:"Lead SLA Breach Rate",       val: kpi ? `${kpi.response_breach_rate_percent ?? 0}%`   : "—", color: slaBreachColor(kpi?.response_breach_rate_percent),   delay:"0.30s" },
                  { label:"Member SLA Breach Rate",     val: kpi ? `${kpi.resolution_breach_rate_percent ?? 0}%` : "—", color: slaBreachColor(kpi?.resolution_breach_rate_percent), delay:"0.36s" },
                ].map(({ label, val, color, delay }) => (
                  <div key={label} className="kpi" style={{ animationDelay:delay }}>
                    <p className="ct">{label}</p>
                    <p style={{ color, fontWeight:800, fontSize:26, margin:"8px 0 4px", fontFamily:"'Nunito',sans-serif" }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* ── TREND CHARTS ── */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18 }}>

                <div className="card">
                  <p className="stitle">SLA Breach Rate Over Time</p>
                  <p className="ssub">Daily breach % — lower is better</p>
                  <LineChartSVG data={trend} height={160} lines={[
                    { key:"Resp Breach", color:"#f87171", fill:true },
                    { key:"Res Breach",  color:"#fbbf24", fill:true },
                  ]} />
                  <div style={{ display:"flex",gap:18,marginTop:12 }}>
                    {[{ c:"#f87171",l:"Lead SLA Breach %" },{ c:"#fbbf24",l:"Member SLA Breach %" }].map(({c,l}) => (
                      <div key={l} style={{ display:"flex",alignItems:"center",gap:6 }}><div className="legend-dot" style={{ background:c }} /><span style={{ color:"rgba(255,255,255,0.4)",fontSize:12 }}>{l}</span></div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <p className="stitle">Avg Response & Resolution Time</p>
                  <p className="ssub">Daily average in minutes</p>
                  <LineChartSVG data={trend} height={160} lines={[
                    { key:"Avg Resp", color:"#60a5fa", fill:false },
                    { key:"Avg Res",  color:"#a78bfa", fill:false },
                  ]} />
                  <div style={{ display:"flex",gap:18,marginTop:12 }}>
                    {[{ c:"#60a5fa",l:"Avg Lead Assign Time" },{ c:"#a78bfa",l:"Avg Member Resolution" }].map(({c,l}) => (
                      <div key={l} style={{ display:"flex",alignItems:"center",gap:6 }}><div className="legend-dot" style={{ background:c }} /><span style={{ color:"rgba(255,255,255,0.4)",fontSize:12 }}>{l}</span></div>
                    ))}
                  </div>
                </div>

              </div>

              {/* ── VOLUME + PIE ── */}
              <div style={{ display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:18,marginBottom:18 }}>

                <div className="card">
                  <p className="stitle">Daily Ticket Volume</p>
                  <p className="ssub">Tickets created per day</p>
                  <BarChartSVG data={trend} valueKey="Tickets" color="#ffffff" height={140} />
                </div>

                <div className="card">
                  <p className="stitle">Priority Distribution</p>
                  <p className="ssub">Ticket split by priority</p>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"center",margin:"8px 0" }}>
                    <DonutSVG data={pieData} size={150} />
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:8,marginTop:8 }}>
                    {pieData.map(({ name, value, color }) => (
                      <div key={name} style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <div className="legend-dot" style={{ background:color }} />
                          <span style={{ color:"rgba(255,255,255,0.5)",fontSize:13 }}>{name}</span>
                        </div>
                        <span style={{ color:"#fff",fontWeight:700,fontSize:14,fontFamily:"'Nunito',sans-serif" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* ── PRIORITY + CATEGORY BREAKDOWN ── */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18 }}>

                <div className="card">
                  <p className="stitle">Priority Breakdown</p>
                  <p className="ssub">Open vs closed per priority</p>
                  <GroupedBarSVG data={priority} keyA="Open" keyB="Closed" colorA="#f87171" colorB="rgba(255,255,255,0.2)" height={150} />
                  <div style={{ display:"flex",gap:16,marginTop:10 }}>
                    {[{ c:"#f87171",l:"Open" },{ c:"rgba(255,255,255,0.2)",l:"Closed" }].map(({c,l}) => (
                      <div key={l} style={{ display:"flex",alignItems:"center",gap:6 }}><div style={{ width:9,height:9,borderRadius:3,background:c,flexShrink:0 }} /><span style={{ color:"rgba(255,255,255,0.4)",fontSize:12 }}>{l}</span></div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <p className="stitle">Category Breakdown</p>
                  <p className="ssub">Total tickets per category</p>
                  <HBarChart data={category} valueKey="Total" colors={CAT_COLORS} />
                </div>

              </div>

              {/* ── AVG TIMES BY PRIORITY ── */}
              <div style={{ marginBottom:18 }}>
                <div className="card">
                  <p className="stitle">Avg Response & Resolution Time by Priority</p>
                  <p className="ssub">In minutes — how fast tickets are handled per priority level</p>
                  <GroupedBarSVG data={priority} keyA="Avg Response" keyB="Avg Resolution" colorA="#60a5fa" colorB="#a78bfa" height={150} />
                  <div style={{ display:"flex",gap:16,marginTop:10 }}>
                    {[{ c:"#60a5fa",l:"Avg Response (mins)" },{ c:"#a78bfa",l:"Avg Resolution (mins)" }].map(({c,l}) => (
                      <div key={l} style={{ display:"flex",alignItems:"center",gap:6 }}><div style={{ width:9,height:9,borderRadius:3,background:c,flexShrink:0 }} /><span style={{ color:"rgba(255,255,255,0.4)",fontSize:12 }}>{l}</span></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── PERIOD COMPARISON ── */}
              {comparison && (
                <div className="card">
                  <p className="stitle">Period Comparison</p>
                  <p className="ssub">This {range === "7days" ? "week" : "month"} vs previous period</p>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0 }}>

                    {/* Current */}
                    <div style={{ padding:"16px 20px",borderRight:"1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ color:"rgba(255,255,255,0.3)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 14px" }}>Current</p>
                      {[
                        { label:"Total Tickets",  val: comparison.current_period?.total_tickets },
                        { label:"Avg Response",   val: fmtMins(comparison.current_period?.average_response_time_minutes)   },
                        { label:"Avg Resolution", val: fmtMins(comparison.current_period?.average_resolution_time_minutes) },
                      ].map(({ label, val }) => (
                        <div key={label} style={{ marginBottom:14 }}>
                          <p style={{ color:"rgba(255,255,255,0.3)",fontSize:12,margin:"0 0 2px" }}>{label}</p>
                          <p style={{ color:"#fff",fontWeight:700,fontSize:20,margin:0,fontFamily:"'Nunito',sans-serif" }}>{val ?? "—"}</p>
                        </div>
                      ))}
                    </div>

                    {/* Previous */}
                    <div style={{ padding:"16px 20px",borderRight:"1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ color:"rgba(255,255,255,0.3)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 14px" }}>Previous</p>
                      {[
                        { label:"Total Tickets",  val: comparison.previous_period?.total_tickets },
                        { label:"Avg Response",   val: fmtMins(comparison.previous_period?.average_response_time_minutes)   },
                        { label:"Avg Resolution", val: fmtMins(comparison.previous_period?.average_resolution_time_minutes) },
                      ].map(({ label, val }) => (
                        <div key={label} style={{ marginBottom:14 }}>
                          <p style={{ color:"rgba(255,255,255,0.3)",fontSize:12,margin:"0 0 2px" }}>{label}</p>
                          <p style={{ color:"rgba(255,255,255,0.45)",fontWeight:700,fontSize:20,margin:0,fontFamily:"'Nunito',sans-serif" }}>{val ?? "—"}</p>
                        </div>
                      ))}
                    </div>

                    {/* Change */}
                    <div style={{ padding:"16px 20px" }}>
                      <p style={{ color:"rgba(255,255,255,0.3)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 14px" }}>Change</p>
                      {[
                        { label:"Ticket Volume",   val: comparison.trend?.ticket_volume_change_percent   },
                        { label:"Response Time",   val: comparison.trend?.response_time_change_percent   },
                        { label:"Resolution Time", val: comparison.trend?.resolution_time_change_percent },
                      ].map(({ label, val }) => {
                        const up = Number(val) > 0, down = Number(val) < 0;
                        const color = val == null ? "#94a3b8" : up ? "#f87171" : "#4ade80";
                        return (
                          <div key={label} style={{ marginBottom:14 }}>
                            <p style={{ color:"rgba(255,255,255,0.3)",fontSize:12,margin:"0 0 4px" }}>{label}</p>
                            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                              {up   && <TrendingUp   size={14} style={{ color }} />}
                              {down && <TrendingDown size={14} style={{ color }} />}
                              <span style={{ color, fontWeight:700, fontSize:16, fontFamily:"'Nunito',sans-serif" }}>
                                {val == null ? "—" : `${Number(val) > 0 ? "+" : ""}${Number(val).toFixed(1)}%`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>
              )}

            </>
          )}
        </div>
      </main>
    </div>
  );
}