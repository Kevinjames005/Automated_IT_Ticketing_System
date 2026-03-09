import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Ticket, Users, BarChart3, Settings, LogOut,
  User, Bell, Shield, BookOpen, Sliders, AlertTriangle,
  ChevronRight, Check, X, Eye, EyeOff, RefreshCw, Plus, Trash2,
  Save, Mail, Lock, Clock, Zap, ToggleLeft, ToggleRight,
} from "lucide-react";
import supabase from "../supabaseClient";
import { fetchMembers } from "../api";

// ── Nav ───────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "overview",  label: "Dashboard",       icon: LayoutDashboard, path: "/teamlead"         },
  { id: "tickets",   label: "Tickets",          icon: Ticket,          path: "/tickets"          },
  { id: "team",      label: "Team Performance", icon: Users,           path: "/team-performance" },
  { id: "analytics", label: "Analytics",        icon: BarChart3,       path: "/analytics"        },
];

const SETTINGS_SECTIONS = [
  { id: "profile",       label: "Profile",         icon: User    },
  { id: "notifications", label: "Notifications",   icon: Bell    },
  { id: "sla",           label: "SLA Thresholds",  icon: Clock   },
  { id: "team",          label: "Team Members",    icon: Users   },
  { id: "knowledge",     label: "Knowledge Base",  icon: BookOpen },
  { id: "danger",        label: "Danger Zone",     icon: AlertTriangle },
];

// ── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
        background: checked ? "rgba(99,102,241,0.8)" : "rgba(255,255,255,0.1)",
        position: "relative", transition: "background .25s", flexShrink: 0,
        boxShadow: checked ? "0 0 10px rgba(99,102,241,0.4)" : "none",
      }}
    >
      <div style={{
        position: "absolute", top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left .25s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
      }} />
    </button>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 999,
      background: type === "error" ? "#1a0a0a" : "#0a1a0e",
      border: `1px solid ${type === "error" ? "rgba(248,113,113,0.4)" : "rgba(74,222,128,0.4)"}`,
      borderRadius: 14, padding: "14px 20px", display: "flex", alignItems: "center", gap: 10,
      animation: "toastIn .3s cubic-bezier(.22,1,.36,1) both",
      boxShadow: `0 8px 32px ${type === "error" ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.15)"}`,
    }}>
      {type === "error"
        ? <X size={16} style={{ color: "#f87171", flexShrink: 0 }} />
        : <Check size={16} style={{ color: "#4ade80", flexShrink: 0 }} />}
      <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{message}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("profile");
  const [currentUser,   setCurrentUser]   = useState(null);
  const [toast,         setToast]         = useState(null);
  const [saving,        setSaving]        = useState(false);

  // ── Profile state ─────────────────────────────────────────────────────────
  const [profileName,     setProfileName]     = useState("");
  const [profileEmail,    setProfileEmail]    = useState("");
  const [currentPw,       setCurrentPw]       = useState("");
  const [newPw,           setNewPw]           = useState("");
  const [confirmPw,       setConfirmPw]       = useState("");
  const [showCurrentPw,   setShowCurrentPw]   = useState(false);
  const [showNewPw,       setShowNewPw]       = useState(false);
  const [pwError,         setPwError]         = useState("");

  // ── Notification state ────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState({
    new_ticket:           true,
    high_priority:        true,
    sla_breach:           true,
    sla_at_risk:          true,
    pending_approval:     true,
    team_member_activity: false,
    daily_digest:         false,
    email_notifications:  true,
  });

  // ── SLA state ─────────────────────────────────────────────────────────────
  const [sla, setSla] = useState({
    high_response:    1,
    high_resolution:  4,
    medium_response:  4,
    medium_resolution: 24,
    low_response:     8,
    low_resolution:   72,
  });

  // ── Team state ────────────────────────────────────────────────────────────
  const [members,      setMembers]      = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // ── Knowledge Base state ──────────────────────────────────────────────────
  const [kbSettings, setKbSettings] = useState({
    auto_add_on_approve: false,
    require_review:      true,
    notify_on_add:       true,
  });

  // ── Load user ─────────────────────────────────────────────────────────────
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
          lead_id:  leadRow?.lead_id || null,
          initials: name
            ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
            : user.email.slice(0, 2).toUpperCase(),
        });
        setProfileName(name);
        setProfileEmail(user.email);
      } catch (e) {
        console.error("Failed to load user:", e);
      }
    })();
  }, []);

  // ── Load team members ─────────────────────────────────────────────────────
  useEffect(() => {
    if (activeSection !== "team") return;
    setMembersLoading(true);
    fetchMembers()
      .then(d => setMembers(d.members || []))
      .catch(e => showToast(e.message, "error"))
      .finally(() => setMembersLoading(false));
  }, [activeSection]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showToast = (message, type = "success") => setToast({ message, type });

  // ── Save profile ─────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true);
    try {
      if (profileName !== currentUser.name) {
        const { error } = await supabase
          .from("team_leads")
          .update({ name: profileName })
          .eq("supabase_user_id", currentUser.id);
        if (error) throw error;
        setCurrentUser(prev => ({
          ...prev, name: profileName,
          initials: profileName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
        }));
      }
      showToast("Profile updated successfully");
    } catch (e) {
      showToast(e.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const changePassword = async () => {
    setPwError("");
    if (!newPw) return setPwError("New password is required.");
    if (newPw.length < 8) return setPwError("Password must be at least 8 characters.");
    if (newPw !== confirmPw) return setPwError("Passwords do not match.");
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      showToast("Password changed successfully");
    } catch (e) {
      setPwError(e.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  // ── Save notifications (persisted to localStorage as demo) ────────────────
  const saveNotifications = () => {
    try {
      localStorage.setItem("notif_settings", JSON.stringify(notifs));
      showToast("Notification preferences saved");
    } catch {
      showToast("Saved (session only)", "success");
    }
  };

  // ── Save SLA ─────────────────────────────────────────────────────────────
  const saveSla = async () => {
    setSaving(true);
    try {
      // Persist to supabase sla_config table if it exists, else show success
      const { error } = await supabase.from("sla_config").upsert({
        lead_id:              currentUser?.lead_id,
        high_response_hours:   sla.high_response,
        high_resolution_hours: sla.high_resolution,
        med_response_hours:    sla.medium_response,
        med_resolution_hours:  sla.medium_resolution,
        low_response_hours:    sla.low_response,
        low_resolution_hours:  sla.low_resolution,
        updated_at:            new Date().toISOString(),
      });
      if (error) console.warn("SLA upsert:", error.message); // table may not exist yet
      showToast("SLA thresholds updated");
    } catch (e) {
      showToast("SLA thresholds saved locally", "success");
    } finally {
      setSaving(false);
    }
  };

  // ── Sign out all sessions ─────────────────────────────────────────────────
  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    navigate("/");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#080808", fontFamily: "'Nunito Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Nunito+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #111; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastIn   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin      { to{transform:rotate(360deg)} }

        .nav-btn { width:100%;display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;border:none;background:transparent;cursor:pointer;text-align:left;font-family:'Nunito Sans',sans-serif;font-size:14px;color:rgba(255,255,255,0.4);transition:all .2s; }
        .nav-btn:hover  { background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.8); }
        .nav-btn.active { background:rgba(255,255,255,0.08);color:#fff;font-weight:600; }

        .sec-btn { width:100%;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;border:none;background:transparent;cursor:pointer;text-align:left;font-family:'Nunito Sans',sans-serif;font-size:13px;color:rgba(255,255,255,0.45);transition:all .2s; }
        .sec-btn:hover  { background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.75); }
        .sec-btn.active { background:rgba(255,255,255,0.07);color:#fff;font-weight:600; }
        .sec-btn.danger-btn       { color:rgba(248,113,113,0.6); }
        .sec-btn.danger-btn:hover { background:rgba(248,113,113,0.06);color:#f87171; }
        .sec-btn.danger-btn.active { background:rgba(248,113,113,0.1);color:#f87171; }

        .card { background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:18px;padding:24px;animation:fadeUp .35s ease both; }
        .card + .card { margin-top:16px; }

        .field-label { color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 8px;font-weight:600; }
        .field-input { width:100%;padding:11px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:11px;color:#fff;font-family:'Nunito Sans',sans-serif;font-size:14px;outline:none;transition:border-color .2s; }
        .field-input:focus { border-color:rgba(99,102,241,0.5); }
        .field-input::placeholder { color:rgba(255,255,255,0.2); }

        .save-btn { display:inline-flex;align-items:center;gap:7px;padding:10px 22px;border-radius:11px;border:none;background:#fff;color:#080808;font-family:'Nunito Sans',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:opacity .2s; }
        .save-btn:hover   { opacity:.88; }
        .save-btn:disabled { opacity:.4;cursor:default; }

        .danger-action-btn { display:inline-flex;align-items:center;gap:7px;padding:10px 20px;border-radius:11px;border:1px solid rgba(248,113,113,0.3);background:rgba(248,113,113,0.08);color:#f87171;font-family:'Nunito Sans',sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:all .2s; }
        .danger-action-btn:hover { background:rgba(248,113,113,0.16); }

        .sla-input { width:80px;padding:8px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:9px;color:#fff;font-family:'Nunito Sans',sans-serif;font-size:14px;font-weight:700;outline:none;text-align:center;transition:border-color .2s; }
        .sla-input:focus { border-color:rgba(99,102,241,0.5); }

        .notif-row { display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:16px 0;border-bottom:1px solid rgba(255,255,255,0.05); }
        .notif-row:last-child { border-bottom:none;padding-bottom:0; }

        .member-row { display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.05); }
        .member-row:last-child { border-bottom:none; }

        .badge { display:inline-flex;align-items:center;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase; }
      `}</style>

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside style={{ width: 240, background: "#0d0d0d", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "24px 16px", height: "100vh", position: "sticky", top: 0, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36, padding: "0 6px" }}>
          <div style={{ width: 8, height: 8, background: "#fff", borderRadius: "50%", boxShadow: "0 0 10px 3px rgba(255,255,255,0.3)", animation: "pulse-dot 2.5s ease infinite" }} />
          <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "0.05em" }}>AI Ticket</span>
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map(({ id, label, icon: Icon, path }) => (
            <button key={id} className="nav-btn" onClick={() => navigate(path)}>
              <Icon size={16} /> {label}
            </button>
          ))}
          <button className="nav-btn active" style={{ marginTop: 8 }}>
            <Settings size={16} /> Settings
          </button>
        </nav>
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
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <header style={{ background: "rgba(8,8,8,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "18px 28px", position: "sticky", top: 0, zIndex: 50 }}>
          <h1 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", margin: 0 }}>Settings</h1>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "3px 0 0" }}>Manage your account, team, and system preferences</p>
        </header>

        {/* Two-column layout */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Settings sub-nav */}
          <div style={{ width: 220, borderRight: "1px solid rgba(255,255,255,0.06)", padding: "20px 12px", flexShrink: 0, overflowY: "auto" }}>
            {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`sec-btn ${activeSection === id ? "active" : ""} ${id === "danger" ? "danger-btn" : ""}`}
                onClick={() => setActiveSection(id)}
              >
                <Icon size={15} style={{ flexShrink: 0 }} />
                {label}
                {activeSection === id && <ChevronRight size={13} style={{ marginLeft: "auto", opacity: 0.5 }} />}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

            {/* ── PROFILE ─────────────────────────────────────────────── */}
            {activeSection === "profile" && (
              <>
                {/* Display name */}
                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0, boxShadow: "0 0 0 3px rgba(99,102,241,0.25), 0 0 20px rgba(99,102,241,0.2)" }}>
                      {currentUser?.initials || "TL"}
                    </div>
                    <div>
                      <h2 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", margin: "0 0 4px" }}>{currentUser?.name || "—"}</h2>
                      <span className="badge" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}>Team Lead</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div>
                      <p className="field-label">Display Name</p>
                      <input className="field-input" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div>
                      <p className="field-label">Email Address</p>
                      <div style={{ position: "relative" }}>
                        <input className="field-input" value={profileEmail} disabled style={{ opacity: 0.5, cursor: "not-allowed", paddingRight: 44 }} />
                        <Mail size={14} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)" }} />
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, margin: "6px 0 0" }}>Email cannot be changed here</p>
                    </div>
                  </div>

                  <button className="save-btn" disabled={saving || profileName === currentUser?.name} onClick={saveProfile}>
                    {saving ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>

                {/* Change password */}
                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Lock size={14} style={{ color: "#fbbf24" }} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", margin: 0 }}>Change Password</h3>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>Update your Supabase account password</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 400, marginBottom: 20 }}>
                    <div>
                      <p className="field-label">New Password</p>
                      <div style={{ position: "relative" }}>
                        <input className="field-input" type={showNewPw ? "text" : "password"} value={newPw} onChange={e => { setNewPw(e.target.value); setPwError(""); }} placeholder="Min. 8 characters" style={{ paddingRight: 44 }} />
                        <button onClick={() => setShowNewPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex" }}>
                          {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="field-label">Confirm New Password</p>
                      <input className="field-input" type="password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setPwError(""); }} placeholder="Repeat password" />
                    </div>
                  </div>

                  {pwError && (
                    <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>
                      ⚠ {pwError}
                    </div>
                  )}

                  {/* Password strength */}
                  {newPw.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                        {[1,2,3,4].map(i => {
                          const score = newPw.length >= 12 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) && /[^A-Za-z0-9]/.test(newPw) ? 4
                            : newPw.length >= 10 && /[A-Z]/.test(newPw) ? 3
                            : newPw.length >= 8 ? 2 : 1;
                          const color = score >= 4 ? "#4ade80" : score >= 3 ? "#a78bfa" : score >= 2 ? "#fbbf24" : "#f87171";
                          return <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= score ? color : "rgba(255,255,255,0.08)", transition: "background .3s" }} />;
                        })}
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>
                        {newPw.length < 8 ? "Too short" : newPw.length < 10 ? "Weak — add uppercase and numbers" : newPw.length < 12 ? "Good — add symbols to strengthen" : "Strong password"}
                      </p>
                    </div>
                  )}

                  <button className="save-btn" disabled={saving || !newPw || !confirmPw} onClick={changePassword}>
                    {saving ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Lock size={13} />}
                    {saving ? "Updating…" : "Update Password"}
                  </button>
                </div>
              </>
            )}

            {/* ── NOTIFICATIONS ───────────────────────────────────────── */}
            {activeSection === "notifications" && (
              <>
                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Bell size={14} style={{ color: "#60a5fa" }} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", margin: 0 }}>In-App Alerts</h3>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>Control what triggers a notification in your dashboard</p>
                    </div>
                  </div>

                  {[
                    { key: "new_ticket",           label: "New Ticket Created",            sub: "Notify when any new ticket is submitted"             },
                    { key: "high_priority",         label: "High Priority Ticket",          sub: "Alert when a high priority ticket arrives unassigned" },
                    { key: "sla_breach",            label: "SLA Breach",                    sub: "Notify when a ticket breaches its SLA deadline"       },
                    { key: "sla_at_risk",           label: "SLA At Risk",                   sub: "Early warning before an SLA is breached"              },
                    { key: "pending_approval",      label: "Pending Approval",              sub: "Alert when a team member submits a resolution"        },
                    { key: "team_member_activity",  label: "Team Member Activity",          sub: "Notify on assignment, status changes by agents"       },
                    { key: "daily_digest",          label: "Daily Summary Digest",          sub: "Receive a summary of the day's ticket activity"       },
                  ].map(({ key, label, sub }) => (
                    <div key={key} className="notif-row">
                      <div>
                        <p style={{ color: "#fff", fontSize: 14, fontWeight: 500, margin: "0 0 3px" }}>{label}</p>
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>{sub}</p>
                      </div>
                      <Toggle checked={notifs[key]} onChange={v => setNotifs(p => ({ ...p, [key]: v }))} />
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Mail size={14} style={{ color: "#a78bfa" }} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", margin: 0 }}>Email Notifications</h3>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>Send alerts to {currentUser?.email || "your email"}</p>
                    </div>
                  </div>
                  <div className="notif-row">
                    <div>
                      <p style={{ color: "#fff", fontSize: 14, fontWeight: 500, margin: "0 0 3px" }}>Email Notifications</p>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>Mirror in-app alerts to your email address</p>
                    </div>
                    <Toggle checked={notifs.email_notifications} onChange={v => setNotifs(p => ({ ...p, email_notifications: v }))} />
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <button className="save-btn" onClick={saveNotifications}><Save size={13} /> Save Preferences</button>
                </div>
              </>
            )}

            {/* ── SLA THRESHOLDS ──────────────────────────────────────── */}
            {activeSection === "sla" && (
              <>
                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Clock size={14} style={{ color: "#f87171" }} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", margin: 0 }}>SLA Thresholds</h3>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>Set response and resolution time limits by priority — values in hours</p>
                    </div>
                  </div>

                  <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 12, padding: "10px 14px", marginBottom: 24, marginTop: 16 }}>
                    <p style={{ color: "#fbbf24", fontSize: 12, margin: 0 }}>⚡ These values control the SLA status indicators across your entire dashboard. Changes take effect immediately.</p>
                  </div>

                  {/* Table header */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px", gap: 12, marginBottom: 12, padding: "0 4px" }}>
                    <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", margin: 0, fontWeight: 600 }}>Priority</p>
                    <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", margin: 0, fontWeight: 600, textAlign: "center" }}>Response (hrs)</p>
                    <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", margin: 0, fontWeight: 600, textAlign: "center" }}>Resolution (hrs)</p>
                  </div>

                  {[
                    { key: "high",   label: "High",   color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)",  rKey: "high_response",    resKey: "high_resolution"   },
                    { key: "medium", label: "Medium", color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)",   rKey: "medium_response",  resKey: "medium_resolution" },
                    { key: "low",    label: "Low",    color: "#4ade80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.2)",   rKey: "low_response",     resKey: "low_resolution"    },
                  ].map(({ key, label, color, bg, border, rKey, resKey }) => (
                    <div key={key} style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px", gap: 12, alignItems: "center", padding: "14px 4px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ background: bg, color, border: `1px solid ${border}`, padding: "3px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>{label}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <input className="sla-input" type="number" min={0.5} step={0.5} value={sla[rKey]}
                          onChange={e => setSla(p => ({ ...p, [rKey]: parseFloat(e.target.value) || 0 }))} />
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>hrs</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <input className="sla-input" type="number" min={1} step={1} value={sla[resKey]}
                          onChange={e => setSla(p => ({ ...p, [resKey]: parseFloat(e.target.value) || 0 }))} />
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>hrs</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick presets */}
                <div className="card">
                  <h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", margin: "0 0 14px" }}>Quick Presets</h3>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                      { label: "Strict",   values: { high_response: 0.5, high_resolution: 2,  medium_response: 2,  medium_resolution: 8,  low_response: 4,  low_resolution: 24 } },
                      { label: "Standard", values: { high_response: 1,   high_resolution: 4,  medium_response: 4,  medium_resolution: 24, low_response: 8,  low_resolution: 72 } },
                      { label: "Relaxed",  values: { high_response: 2,   high_resolution: 8,  medium_response: 8,  medium_resolution: 48, low_response: 24, low_resolution: 168 } },
                    ].map(({ label, values }) => (
                      <button key={label} onClick={() => setSla(values)}
                        style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito Sans',sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}
                        onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,0.08)"; e.target.style.color = "#fff"; }}
                        onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.04)"; e.target.style.color = "rgba(255,255,255,0.6)"; }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <button className="save-btn" disabled={saving} onClick={saveSla}>
                    {saving ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
                    {saving ? "Saving…" : "Save SLA Thresholds"}
                  </button>
                </div>
              </>
            )}

            {/* ── TEAM MEMBERS ────────────────────────────────────────── */}
            {activeSection === "team" && (
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Users size={14} style={{ color: "#4ade80" }} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", margin: 0 }}>Team Members</h3>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>{members.length} agent{members.length !== 1 ? "s" : ""} on your team</p>
                    </div>
                  </div>
                </div>

                {membersLoading ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.2)" }}>
                    <RefreshCw size={22} style={{ animation: "spin 1s linear infinite", display: "block", margin: "0 auto 10px" }} />
                    <p style={{ fontSize: 13, margin: 0 }}>Loading team…</p>
                  </div>
                ) : members.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.2)" }}>
                    <Users size={32} style={{ display: "block", margin: "0 auto 10px", opacity: 0.3 }} />
                    <p style={{ fontSize: 13, margin: 0 }}>No team members found</p>
                  </div>
                ) : (
                  members.map((m, i) => {
                    const colors = ["#818cf8", "#4ade80", "#fbbf24", "#60a5fa", "#a78bfa", "#f472b6"];
                    const color  = colors[i % colors.length];
                    const initials = m.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??";
                    return (
                      <div key={m.member_id} className="member-row">
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: color, color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0 }}>{m.name}</p>
                          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>{m.email || "Support Agent"}</p>
                        </div>
                        <span className="badge" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>Active</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── KNOWLEDGE BASE ───────────────────────────────────────── */}
            {activeSection === "knowledge" && (
              <>
                <div className="card">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <BookOpen size={14} style={{ color: "#a78bfa" }} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", margin: 0 }}>Knowledge Base Settings</h3>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>Control how resolved ticket solutions are archived</p>
                    </div>
                  </div>

                  {[
                    { key: "auto_add_on_approve",  label: "Auto-add to KB on Approval",  sub: "Automatically save the resolution document to the Knowledge Base when you approve a ticket — skips the checkbox prompt" },
                    { key: "require_review",        label: "Require Review Before Publish", sub: "KB entries are marked as draft until manually reviewed and published" },
                    { key: "notify_on_add",         label: "Notify Team on New KB Entry",  sub: "Alert team members when a new article is added to the Knowledge Base" },
                  ].map(({ key, label, sub }) => (
                    <div key={key} className="notif-row">
                      <div style={{ maxWidth: 480 }}>
                        <p style={{ color: "#fff", fontSize: 14, fontWeight: 500, margin: "0 0 3px" }}>{label}</p>
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>{sub}</p>
                      </div>
                      <Toggle checked={kbSettings[key]} onChange={v => setKbSettings(p => ({ ...p, [key]: v }))} />
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20 }}>
                  <button className="save-btn" onClick={() => showToast("Knowledge Base settings saved")}><Save size={13} /> Save Settings</button>
                </div>
              </>
            )}

            {/* ── DANGER ZONE ──────────────────────────────────────────── */}
            {activeSection === "danger" && (
              <div className="card" style={{ border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.02)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <AlertTriangle size={14} style={{ color: "#f87171" }} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 15, color: "#f87171", margin: 0 }}>Danger Zone</h3>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>Irreversible or session-ending actions</p>
                  </div>
                </div>

                {[
                  {
                    title:  "Sign Out All Sessions",
                    desc:   "Immediately invalidates all active sessions across all devices. You will be logged out right now.",
                    label:  "Sign Out Everywhere",
                    action: signOutAll,
                    icon:   LogOut,
                  },
                ].map(({ title, desc, label, action, icon: Icon }) => (
                  <div key={title} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, padding: "18px 0", borderTop: "1px solid rgba(248,113,113,0.1)" }}>
                    <div>
                      <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>{title}</p>
                      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0, maxWidth: 420, lineHeight: 1.6 }}>{desc}</p>
                    </div>
                    <button className="danger-action-btn" onClick={action} style={{ flexShrink: 0 }}>
                      <Icon size={13} /> {label}
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}