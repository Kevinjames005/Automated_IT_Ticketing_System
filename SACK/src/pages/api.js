// src/api.js
// Reusable API helper — auto-attaches Supabase token to every request

import supabase from "./supabaseClient";

const BASE_URL = "http://localhost:8000"; // 👈 change this to your backend URL in production

async function getToken() {
  // First try existing session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  // If token is expired or expiring within 60 seconds, refresh it
  const expiresAt = session.expires_at; // Unix timestamp in seconds
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt && expiresAt - now < 60) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed.session) throw new Error("Session expired. Please log in again.");
    return refreshed.session.access_token;
  }

  return session.access_token;
}

async function apiFetch(path, options = {}) {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ── Tickets ──────────────────────────────────────────
export function fetchTickets({ status, priority, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (status)   params.append("status",   status);
  if (priority) params.append("priority", priority);
  params.append("page",  page);
  params.append("limit", limit);
  return apiFetch(`/tickets?${params.toString()}`);
}

// ── Members ──────────────────────────────────────────
export function fetchMembers() {
  return apiFetch("/members");
}

// ── Assign Ticket ─────────────────────────────────────
export function assignTicket({ ticket_id, member_id, lead_id }) {
  return apiFetch("/assign-ticket", {
    method: "POST",
    body: JSON.stringify({ ticket_id, member_id, lead_id }),
  });
}

// ── Start Ticket (member: Assigned → In Progress) ─────
export function startTicket({ ticket_id, member_id }) {
  return apiFetch("/start-ticket", {
    method: "POST",
    body: JSON.stringify({ ticket_id, member_id }),
  });
}

// ── Resolve Ticket (member: In Progress → Resolved) ───
// This triggers the team lead approval queue automatically.
export function resolveTicket({ ticket_id, member_id, resolution_text }) {
  return apiFetch("/resolve-ticket", {
    method: "POST",
    body: JSON.stringify({ ticket_id, member_id, resolution_text }),
  });
}

// ── Approvals ─────────────────────────────────────────
export function approveResolution({ ticket_id, add_to_kb = false }) {
  return apiFetch("/approve-resolution", {
    method: "POST",
    body: JSON.stringify({ ticket_id, add_to_kb }),
  });
}

export function rejectResolution({ ticket_id }) {
  return apiFetch("/reject-resolution", {
    method: "POST",
    body: JSON.stringify({ ticket_id }),
  });
}

// ── Analytics ─────────────────────────────────────────
export function fetchAnalytics(range = "7days") {
  return apiFetch(`/analytics?range=${range}`);
}

export function fetchMemberAnalytics(range = "7days") {
  return apiFetch(`/analytics/members?range=${range}`);
}

export function fetchPriorityBreakdown() {
  return apiFetch("/analytics/priority");
}

export function fetchCategoryBreakdown() {
  return apiFetch("/analytics/categories");
}

export function fetchSlaTrend(days = 7) {
  return apiFetch(`/analytics/sla-trend?days=${days}`);
}

export function fetchSlaComparison(days = 7) {
  return apiFetch(`/analytics/sla-comparison?days=${days}`);
}

export { apiFetch };

// Add this function to your existing api.js, alongside the other exports:

export function reassignTicket({ ticket_id, new_member_id, lead_id }) {
  return apiFetch("/reassign-ticket", {
    method: "POST",
    body: JSON.stringify({ ticket_id, new_member_id, lead_id }),
  });
}