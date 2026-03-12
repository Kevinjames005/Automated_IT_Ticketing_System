import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Shield, Bell, ChevronRight,
  Save, Eye, EyeOff, LogOut, ArrowLeft,
  CheckCircle, AlertTriangle, X, Menu,
  Activity, Target, Award, Settings, Star,
} from "lucide-react";
import supabase from "../supabaseClient";
import { apiFetch, fetchTickets, fetchMemberAnalytics } from "../api";

export default function MemberSettingsPage() {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("profile");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [saveStatus,    setSaveStatus]    = useState(""); // "saving" | "saved" | "error"

  // Sidebar performance card data (mirrors TeamMemberDashboard)
  const [myPerf,          setMyPerf]          = useState(null);
  const [activeCount,     setActiveCount]     = useState("…");
  const [resolvedCount,   setResolvedCount]   = useState("…");

  // Identity
  const [currentUser, setCurrentUser] = useState(null);

  // Profile edits
  const [displayName,  setDisplayName]  = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  // Password
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [pwError,   setPwError]   = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // Notifications (UI prefs — stored in state)
  const [notifPrefs, setNotifPrefs] = useState({
    ticketApproved:  true,
    ticketReassigned: true,
    slaWarning:      true,
  });

  // ── load identity ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadIdentity() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/"); return; }

      const email    = session.user.email;
      const name     = session.user.user_metadata?.full_name ||
                       session.user.user_metadata?.name ||
                       email.split("@")[0];
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
      setDisplayName(name);
      setProfileEmail(email);

      // Load sidebar performance card data
      try {
        const [ticketRes, resolvedRes, perfRes] = await Promise.allSettled([
          fetchTickets({ status: "Assigned",    limit: 100 }),
          fetchTickets({ status: "Resolved",    limit: 100 }),
          fetchMemberAnalytics("7days"),
        ]);
        if (ticketRes.status   === "fulfilled") setActiveCount(ticketRes.value?.tickets?.length ?? 0);
        if (resolvedRes.status === "fulfilled") setResolvedCount(resolvedRes.value?.tickets?.length ?? 0);
        if (perfRes.status     === "fulfilled" && member_id) {
          const me = (perfRes.value?.members || []).find(m => m.member_id === member_id);
          if (me) setMyPerf(me);
        }
      } catch (e) {
        console.error("Sidebar perf load failed:", e.message);
      }
    }
    loadIdentity();
  }, []);

  // ── save display name ──────────────────────────────────────────────────────
  async function handleSaveProfile() {
    setSaveStatus("saving");
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName, name: displayName }
      });
      if (error) throw error;
      setCurrentUser(prev => ({
        ...prev,
        name: displayName,
        initials: displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
      }));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2500);
    } catch (e) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  }

  // ── change password ────────────────────────────────────────────────────────
  async function handleChangePassword() {
    setPwError(""); setPwSuccess("");
    if (!newPw || newPw.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw)         { setPwError("Passwords do not match."); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setPwSuccess("Password updated successfully.");
      setNewPw(""); setConfirmPw("");
    } catch (e) {
      setPwError(e.message || "Failed to update password.");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  const sections = [
    { id: "profile",       label: "Profile",       icon: User   },
    { id: "security",      label: "Security",       icon: Shield },
    { id: "notifications", label: "Notifications",  icon: Bell   },
  ];

  const navItems = [
    { id: "my-tickets",  label: "My Tickets",  icon: Activity,    path: "/teammember",                  badge: activeCount,   badgeColor: "rgba(255,255,255,0.9)", badgeBg: "rgba(255,255,255,0.15)" },
    { id: "resolved",    label: "Resolved",    icon: CheckCircle, path: "/teammember?tab=resolved",      badge: resolvedCount, badgeColor: "#4ade80",               badgeBg: "rgba(74,222,128,0.15)"  },
    { id: "performance", label: "Performance", icon: Target,      path: "/teammember?tab=performance",   badge: null },
  ];

  const gradeColor = (g) => ({ A:"#4ade80", B:"#ffffff", C:"#fbbf24", D:"#f87171" }[g] || "#fff");

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#080808", fontFamily: "'Nunito Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&family=Nunito+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-d { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .nav-btn {
          width:100%; display:flex; align-items:center; gap:11px; padding:10px 14px;
          border-radius:12px; border:none; background:transparent; cursor:pointer;
          font-family:'Nunito Sans',sans-serif; font-size:14px; color:rgba(255,255,255,0.4);
          transition:all .2s; text-align:left;
        }
        .nav-btn:hover  { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.8); }
        .nav-btn.active { background:rgba(255,255,255,0.08); color:#fff; font-weight:600; }
        .section-btn {
          width:100%; display:flex; align-items:center; gap:12px; padding:12px 16px;
          border-radius:12px; border:none; background:transparent; cursor:pointer;
          font-family:'Nunito Sans',sans-serif; font-size:13px; color:rgba(255,255,255,0.4);
          transition:all .2s; text-align:left;
        }
        .section-btn:hover  { background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.7); }
        .section-btn.active { background:rgba(255,255,255,0.07); color:#fff; font-weight:600; }
        .settings-card {
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
          border-radius:18px; padding:28px; animation:fadeUp .4s ease both;
        }
        .input-field {
          width:100%; padding:11px 14px; border-radius:11px;
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
          color:#fff; font-family:'Nunito Sans',sans-serif; font-size:14px;
          outline:none; transition:border-color .2s;
        }
        .input-field:focus { border-color:rgba(255,255,255,0.3); }
        .input-field::placeholder { color:rgba(255,255,255,0.2); }
        .input-field:disabled { opacity:0.45; cursor:not-allowed; }
        .save-btn {
          display:flex; align-items:center; gap:8px; padding:11px 22px;
          border-radius:11px; border:none; background:#fff; color:#080808;
          font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:13px;
          cursor:pointer; transition:opacity .2s; position:relative; overflow:hidden;
        }
        .save-btn::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);
          background-size:200% 100%; animation:shimmer 2.5s infinite;
        }
        .save-btn:hover   { opacity:.88; }
        .save-btn:disabled { opacity:.5; cursor:not-allowed; }
        .danger-btn {
          display:flex; align-items:center; gap:8px; padding:11px 22px;
          border-radius:11px; border:1px solid rgba(248,113,113,0.3);
          background:rgba(248,113,113,0.08); color:#f87171;
          font-family:'Nunito Sans',sans-serif; font-weight:700; font-size:13px;
          cursor:pointer; transition:all .2s;
        }
        .danger-btn:hover { background:rgba(248,113,113,0.16); border-color:rgba(248,113,113,0.5); }
        .toggle-track {
          width:44px; height:24px; border-radius:12px; position:relative;
          cursor:pointer; transition:background .2s; flex-shrink:0; border:none; outline:none;
        }
        .toggle-thumb {
          position:absolute; top:3px; width:18px; height:18px;
          background:#fff; border-radius:50%; transition:left .2s;
        }
        fieldset { border:none; padding:0; margin:0; }
        label { display:block; color:rgba(255,255,255,0.35); font-size:11px; text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; }
      `}</style>

      {/* ══ SIDEBAR ════════════════════════════════════════════════════════════ */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99 }} />
      )}
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
                  {myPerf ? myPerf.performance_grade : "—"}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              { label:"Resolved", val: resolvedCount },
              { label:"Active",   val: activeCount   },
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
          {navItems.map(({ id, label, icon: Icon, path, badge, badgeColor, badgeBg }) => (
            <button key={id} className="nav-btn" onClick={() => navigate(path)}>
              <Icon size={16} />
              <span style={{ flex:1 }}>{label}</span>
              {badge !== null && badge !== "…" && (
                <span style={{ background: badgeBg || "rgba(255,255,255,0.1)", color: badgeColor || "rgba(255,255,255,0.6)", fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:999 }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
          <button className="nav-btn active" style={{ marginTop:8 }}><Settings size={16} /> Settings</button>
        </nav>

        {/* User profile card */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:16, marginTop:16 }}>
          <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"14px 12px", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:"linear-gradient(135deg,#059669,#10b981)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:14, flexShrink:0, boxShadow:"0 0 0 2px rgba(16,185,129,0.3)" }}>
                {currentUser?.name ? currentUser.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) : "SA"}
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ color:"#fff", fontSize:13, fontWeight:700, margin:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {currentUser?.name || "Support Agent"}
                </p>
                <p style={{ color:"rgba(255,255,255,0.35)", fontSize:11, margin:"2px 0 0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {currentUser?.email || "—"}
                </p>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ background:"rgba(16,185,129,0.15)", color:"#34d399", border:"1px solid rgba(16,185,129,0.25)", borderRadius:999, fontSize:10, fontWeight:700, padding:"2px 10px", letterSpacing:"0.05em", textTransform:"uppercase" }}>
                Support Agent
              </span>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 6px #4ade80", display:"inline-block" }} />
              <span style={{ color:"#4ade80", fontSize:10, fontWeight:600 }}>Online</span>
            </div>
          </div>
          <button className="nav-btn" onClick={handleLogout}><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      {/* ══ MAIN ═══════════════════════════════════════════════════════════════ */}
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <header style={{ background: "rgba(8,8,8,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex" }}>
              <Menu size={20} />
            </button>
            <button onClick={() => navigate("/teammember")} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "7px 12px", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "'Nunito Sans', sans-serif" }}>
              <ArrowLeft size={14} /> Dashboard
            </button>
            <div>
              <h1 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", margin: 0 }}>Settings</h1>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "2px 0 0" }}>Manage your account preferences</p>
            </div>
          </div>

          {/* Save feedback */}
          {saveStatus === "saved" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 9, padding: "7px 14px", animation: "fadeUp .3s ease both" }}>
              <CheckCircle size={13} style={{ color: "#4ade80" }} />
              <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>Saved</span>
            </div>
          )}
          {saveStatus === "error" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 9, padding: "7px 14px" }}>
              <AlertTriangle size={13} style={{ color: "#f87171" }} />
              <span style={{ color: "#f87171", fontSize: 13, fontWeight: 600 }}>Save failed</span>
            </div>
          )}
        </header>

        {/* Body */}
        <div style={{ padding: 28, flex: 1, display: "flex", gap: 24, alignItems: "flex-start" }}>

          {/* Left section nav */}
          <div style={{ width: 200, flexShrink: 0, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 10, position: "sticky", top: 96 }}>
            {sections.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`section-btn ${activeSection === id ? "active" : ""}`} onClick={() => setActiveSection(id)}>
                <Icon size={15} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                <ChevronRight size={13} style={{ opacity: 0.3 }} />
              </button>
            ))}
          </div>

          {/* Right content */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── PROFILE ──────────────────────────────────────────────────── */}
            {activeSection === "profile" && (
              <div className="settings-card">
                {/* Avatar + identity */}
                <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 18, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#080808", fontWeight: 800, fontSize: 22, fontFamily: "'Nunito', sans-serif", flexShrink: 0 }}>
                    {currentUser?.initials || "??"}
                  </div>
                  <div>
                    <p style={{ color: "#fff", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 18, margin: 0 }}>{currentUser?.name || "Loading..."}</p>
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: "4px 0 6px" }}>{currentUser?.email}</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)", padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Support Agent</span>
                      {currentUser?.member_id && (
                        <span style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)", padding: "2px 10px", borderRadius: 6, fontSize: 11 }}>
                          ID #{currentUser.member_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Editable fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
                  <div>
                    <label>Display Name</label>
                    <input
                      className="input-field"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label>Email Address</label>
                    <input
                      className="input-field"
                      value={profileEmail}
                      disabled
                      title="Email cannot be changed here"
                    />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button className="save-btn" disabled={saveStatus === "saving"} onClick={handleSaveProfile}>
                    {saveStatus === "saving"
                      ? <><span style={{ width: 13, height: 13, border: "2px solid rgba(0,0,0,0.25)", borderTop: "2px solid #080808", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} /> Saving...</>
                      : <><Save size={14} /> Save Profile</>
                    }
                  </button>
                  <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, margin: 0 }}>Email is managed by your admin.</p>
                </div>
              </div>
            )}

            {/* ── SECURITY ─────────────────────────────────────────────────── */}
            {activeSection === "security" && (
              <div className="settings-card">
                <h2 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", margin: "0 0 6px" }}>Change Password</h2>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: "0 0 24px" }}>Update your login password.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 400 }}>
                  <div>
                    <label>New Password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-field"
                        type={showPw ? "text" : "password"}
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        placeholder="Min 8 characters"
                        style={{ paddingRight: 44 }}
                      />
                      <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex" }}>
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label>Confirm New Password</label>
                    <input
                      className="input-field"
                      type={showPw ? "text" : "password"}
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Repeat password"
                    />
                  </div>
                </div>

                {pwError && (
                  <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 16, color: "#f87171", fontSize: 13, maxWidth: 400 }}>
                    ⚠ {pwError}
                  </div>
                )}
                {pwSuccess && (
                  <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 16, color: "#4ade80", fontSize: 13, maxWidth: 400 }}>
                    ✓ {pwSuccess}
                  </div>
                )}

                <button className="save-btn" style={{ marginTop: 20 }} onClick={handleChangePassword}>
                  <Shield size={14} /> Update Password
                </button>

                {/* Sign out */}
                <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", margin: "0 0 6px" }}>Sign Out</h3>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: "0 0 16px" }}>Sign out of your account on this device.</p>
                  <button className="danger-btn" onClick={handleLogout}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* ── NOTIFICATIONS ────────────────────────────────────────────── */}
            {activeSection === "notifications" && (
              <div className="settings-card">
                <h2 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", margin: "0 0 6px" }}>Notification Preferences</h2>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: "0 0 28px" }}>Control which events trigger alerts in your dashboard.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    {
                      key: "ticketApproved",
                      label: "Ticket Approved",
                      desc: "Get notified when your team lead approves your resolution",
                      color: "#4ade80",
                    },
                    {
                      key: "ticketReassigned",
                      label: "Ticket Reassigned",
                      desc: "Get notified when a ticket is sent back to you for rework",
                      color: "#fbbf24",
                    },
                    {
                      key: "slaWarning",
                      label: "SLA Warning",
                      desc: "Alert when your response or resolution time is at risk of breaching — your clock starts from when the ticket is assigned to you",
                      color: "#f87171",
                    },
                  ].map(({ key, label, desc, color }, i) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none", animation: `fadeUp .35s ease ${i * 0.07}s both` }}>
                      <div style={{ flex: 1, marginRight: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                          <p style={{ color: "#fff", fontWeight: 600, fontSize: 14, margin: 0 }}>{label}</p>
                        </div>
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 0 15px" }}>{desc}</p>
                      </div>
                      <button
                        className="toggle-track"
                        style={{ background: notifPrefs[key] ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.1)" }}
                        onClick={() => setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                      >
                        <div className="toggle-thumb" style={{ left: notifPrefs[key] ? "23px" : "3px", background: notifPrefs[key] ? "#080808" : "rgba(255,255,255,0.4)" }} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  className="save-btn"
                  style={{ marginTop: 24 }}
                  onClick={() => { setSaveStatus("saved"); setTimeout(() => setSaveStatus(""), 2500); }}
                >
                  <Save size={14} /> Save Preferences
                </button>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}