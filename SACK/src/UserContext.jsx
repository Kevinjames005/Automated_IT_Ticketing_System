// src/UserContext.jsx
// Single source of truth for the logged-in user.
// Wrap your app with <UserProvider> in main.jsx or App.jsx,
// then call useUser() in any page to get/update the user.

import { createContext, useContext, useState, useEffect } from "react";
import supabase from "./pages/supabaseClient";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  // Load user once on app mount
  useEffect(() => {
    loadUser();

    // Also re-load if the Supabase session changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCurrentUser(null); return; }

      // Read name from the team_leads table (authoritative source)
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
          .split(" ")
          .map(n => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      });
    } catch (e) {
      console.error("UserContext: failed to load user", e);
    }
  }

  // Call this after saving a new name so all pages update immediately
  function updateUserName(newName) {
    setCurrentUser(prev => ({
      ...prev,
      name: newName,
      initials: newName
        .split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    }));
  }

  return (
    <UserContext.Provider value={{ currentUser, updateUserName, reloadUser: loadUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
}