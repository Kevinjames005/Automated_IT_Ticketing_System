import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Shield, Bell, Users, Sliders,
  ChevronRight, Save, Eye, EyeOff, LogOut,
  ArrowLeft, CheckCircle, AlertTriangle,
  X, Menu, LayoutDashboard, Ticket,
  BarChart3, Settings,
} from "lucide-react";
import supabase from "../supabaseClient";
import { useUser } from "../../UserContext";
import { apiFetch } from "../api";

export default function LeadSettingsPage() {
  const navigate = useNavigate();
  const { currentUser, updateUserName } = useUser();

  const [activeSection, setActiveSection] = useState("profile");
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [saveStatus,    setSaveStatus]    = useState(""); // "saving" | "saved" | "error"


  // Profile
  const [displayName,  setDisplayName]  = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  // Password
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [pwError,   setPwError]   = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // Team members
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // SLA thresholds (display only — edit sla_service.py to persist)
  const slaThresholds = [
    { priority: "High",   lead_response: "15 min", member_response: "15 min", resolution: "2 hrs",  color: "#f87171", bg: "rgba(248,113,113,0.08)",  border: "rgba(248,113,113,0.2)"  },
    { priority: "Medium", lead_response: "1 hr",   member_response: "1 hr",   resolution: "8 hrs",  color: "#fbbf24", bg: "rgba(251,191,36,0.08)",   border: "rgba(251,191,36,0.2)"   },
    { priority: "Low",    lead_response: "4 hrs",  member_response: "4 hrs",  resolution: "24 hrs", color: "#94a3b8", bg: "rgba(148,163,184,0.08)",  border: "rgba(148,163,184,0.2)"  },
  ];

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    ticketResolved:   true,
    slaBreached:      true,
    newTicketHigh:    true,
    dailyDigest:      false,
  });


  // ── pre-fill form fields from context ──────────────────────────────────────
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.name || "");
      setProfileEmail(currentUser.email || "");
    }
  }, [currentUser]);

  // ── load members when Team section opens ──────────────────────────────────
  useEffect(() => {
    if (activeSection === "team" && members.length === 0) {
      setMembersLoading(true);
      apiFetch("/members")
        .then(res => setMembers(res.members || []))
        .catch(e => console.error(e))
        .finally(() => setMembersLoading(false));
    }
  }, [activeSection]);

  // ── save profile ──────────────────────────────────────────────────────────
  async function handleSaveProfile() {
    setSaveStatus("saving");
    try {
      // 1. Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: displayName, name: displayName }
      });
      if (authError) throw authError;

      // 2. Update team_leads table — this is what all other pages read
      const { error: dbError } = await supabase
        .from("team_leads")
        .update({ name: displayName })
        .eq("supabase_user_id", currentUser.id);
      if (dbError) throw dbError;

      // 3. Update global context so all pages reflect the new name instantly
      updateUserName(displayName);

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2500);
    } catch {
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
    { id: "profile",       label: "Profile",        icon: User    },
    { id: "security",      label: "Security",        icon: Shield  },
    { id: "team",          label: "Team Members",    icon: Users   },
    { id: "sla",           label: "SLA Thresholds",  icon: Sliders },
    { id: "notifications", label: "Notifications",   icon: Bell    },
  ];

 const navItems = [
    { id: "dashboard",   label: "Dashboard",        icon: LayoutDashboard, path: "/teamlead"        },
    { id: "tickets",     label: "Tickets",           icon: Ticket,          path: "/tickets"         },
    { id: "team",        label: "Team Performance",  icon: Users,           path: "/team-performance"},
    { id: "analytics",   label: "Analytics",         icon: BarChart3,       path: "/analytics"       },
    { id: "settings",    label: "Settings",           icon: Settings,        path: "/settings"        },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#080808", fontFamily: "'Nunito Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&family=Nunito+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-dot{ 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin     { to { transform:rotate(360deg); } }
        @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .nav-btn {
          width:100%; display:flex; align-items:center; gap:12px; padding:10px 14px;
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
        .input-field:focus    { border-color:rgba(255,255,255,0.3); }
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
        label { display:block; color:rgba(255,255,255,0.35); font-size:11px; text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; }
      `}</style>

      {/* ══ SIDEBAR ════════════════════════════════════════════════════════════ */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99 }} />
      )}
      <aside style={{ width: 240, background: "#0d0d0d", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "24px 16px", height: "100vh", position: "sticky", top: 0, flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36, padding: "0 6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, background: "#fff", borderRadius: "50%", boxShadow: "0 0 10px 3px rgba(255,255,255,0.3)", animation: "pulse-dot 2.5s ease infinite" }} />
            <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "0.05em" }}>AI Ticket</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map(({ id, label, icon: Icon, path }) => (
            <button key={id}
              className={`nav-btn ${id === "settings" ? "active" : ""}`}
              onClick={() => { if (path !== "/settings") navigate(path); }}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        {/* ── USER PROFILE CARD ─────────────────────────────────────────── */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16, marginTop: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 12px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              {/* Avatar */}
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
            {/* Role badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 999, fontSize: 10, fontWeight: 700, padding: "2px 10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Team Lead
              </span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80", display: "inline-block" }} />
              <span style={{ color: "#4ade80", fontSize: 10, fontWeight: 600 }}>Online</span>
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
            <button onClick={() => navigate("/teamlead")} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "7px 12px", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "'Nunito Sans', sans-serif" }}>
              <ArrowLeft size={14} /> Dashboard
            </button>
            <div>
              <h1 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", margin: 0 }}>Settings</h1>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "2px 0 0" }}>Manage your account and team preferences</p>
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
          <div style={{ width: 210, flexShrink: 0, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 10, position: "sticky", top: 96 }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 18, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#080808", fontWeight: 800, fontSize: 22, fontFamily: "'Nunito', sans-serif", flexShrink: 0 }}>
                    {currentUser?.initials || "TL"}
                  </div>
                  <div>
                    <p style={{ color: "#fff", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 18, margin: 0 }}>{currentUser?.name || "Loading..."}</p>
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: "4px 0 6px" }}>{currentUser?.email}</p>
                    <span style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)", padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Team Lead</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
                  <div>
                    <label>Display Name</label>
                    <input className="input-field" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div>
                    <label>Email Address</label>
                    <input className="input-field" value={profileEmail} disabled title="Email cannot be changed here" />
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
                      <input className="input-field" type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 characters" style={{ paddingRight: 44 }} />
                      <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", display: "flex" }}>
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label>Confirm New Password</label>
                    <input className="input-field" type={showPw ? "text" : "password"} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat password" />
                  </div>
                </div>

                {pwError   && <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 16, color: "#f87171", fontSize: 13, maxWidth: 400 }}>⚠ {pwError}</div>}
                {pwSuccess && <div style={{ background: "rgba(74,222,128,0.08)",  border: "1px solid rgba(74,222,128,0.2)",  borderRadius: 10, padding: "10px 14px", marginTop: 16, color: "#4ade80", fontSize: 13, maxWidth: 400 }}>✓ {pwSuccess}</div>}

                <button className="save-btn" style={{ marginTop: 20 }} onClick={handleChangePassword}>
                  <Shield size={14} /> Update Password
                </button>

                <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <h3 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", margin: "0 0 6px" }}>Sign Out</h3>
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: "0 0 16px" }}>Sign out of your account on this device.</p>
                  <button className="danger-btn" onClick={handleLogout}><LogOut size={14} /> Sign Out</button>
                </div>
              </div>
            )}

            {/* ── TEAM MEMBERS ─────────────────────────────────────────────── */}
            {activeSection === "team" && (
              <div className="settings-card">
                <h2 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", margin: "0 0 6px" }}>Team Members</h2>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: "0 0 24px" }}>All support agents currently on your team.</p>

                {membersLoading ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.2)" }}>
                    <span style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)", borderTop: "2px solid rgba(255,255,255,0.5)", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                  </div>
                ) : members.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, textAlign: "center", padding: "40px 0" }}>No members found.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {members.map((m, i) => {
                      const initials = (m.name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <div key={m.member_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, animation: `fadeUp .35s ease ${i * 0.05}s both` }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "'Nunito', sans-serif", flexShrink: 0 }}>
                            {initials}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ color: "#fff", fontWeight: 600, fontSize: 14, margin: 0 }}>{m.name}</p>
                            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "3px 0 0" }}>{m.email}</p>
                          </div>
                          <span style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)", padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Agent</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── SLA THRESHOLDS ───────────────────────────────────────────── */}
            {activeSection === "sla" && (
              <div className="settings-card">
                <h2 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", margin: "0 0 6px" }}>SLA Thresholds</h2>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: "0 0 24px" }}>Current response and resolution time limits by priority.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {slaThresholds.map(({ priority, lead_response, member_response, resolution, color, bg, border }, i) => (
                    <div key={priority} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, animation: `fadeUp .35s ease ${i * 0.08}s both` }}>
                      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 13, padding: "16px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <span style={{ color, fontWeight: 700, fontSize: 14 }}>{priority}</span>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "16px 18px" }}>
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: ".06em" }}>Lead Assign</p>
                        <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: 0, fontFamily: "'Nunito', sans-serif" }}>{lead_response}</p>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "16px 18px" }}>
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: ".06em" }}>Member Response</p>
                        <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: 0, fontFamily: "'Nunito', sans-serif" }}>{member_response}</p>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "16px 18px" }}>
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: ".06em" }}>Member Resolution</p>
                        <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: 0, fontFamily: "'Nunito', sans-serif" }}>{resolution}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 12, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <AlertTriangle size={14} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                    To change these values, update <code style={{ color: "#fbbf24", background: "rgba(251,191,36,0.1)", padding: "1px 6px", borderRadius: 4 }}>services/sla_service.py</code> in your backend.
                  </p>
                </div>
              </div>
            )}

            {/* ── NOTIFICATIONS ────────────────────────────────────────────── */}
            {activeSection === "notifications" && (
              <div className="settings-card">
                <h2 style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", margin: "0 0 6px" }}>Notification Preferences</h2>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: "0 0 28px" }}>Control which events trigger alerts on your dashboard.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { key: "ticketResolved",  label: "Ticket Resolved",       desc: "When a team member submits a resolution for approval",      color: "#a78bfa" },
                    { key: "slaBreached",     label: "SLA Breached",          desc: "When any ticket breaches its response or resolution SLA",   color: "#f87171" },
                    { key: "newTicketHigh",   label: "New High Priority",     desc: "When a new high priority ticket arrives unassigned",        color: "#fbbf24" },
                    { key: "dailyDigest",     label: "Daily Digest",          desc: "Morning summary of open tickets and team performance",      color: "#60a5fa" },
                  ].map(({ key, label, desc, color }, i) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none", animation: `fadeUp .35s ease ${i * 0.07}s both` }}>
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

                <button className="save-btn" style={{ marginTop: 24 }}
                  onClick={() => { setSaveStatus("saved"); setTimeout(() => setSaveStatus(""), 2500); }}>
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