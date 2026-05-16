"use client";

// Local-only "Add Business" store. Businesses the agent drops via the Agent
// Hub's per-zone Business ribbon (or sidebar drawer) are saved here per-browser
// and shown as custom markers on the working-area map.

const KEY = "abox.business.userAdded.v1";

function safeGet(fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function safeSet(value) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch {}
}

export function loadUserBusinesses() {
  return safeGet([]);
}

export function addUserBusiness(b) {
  const next = [
    ...loadUserBusinesses(),
    {
      ...b,
      id: b.id || `userbiz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      _userAdded: true,
      createdAt: Date.now(),
    },
  ];
  safeSet(next);
  return next;
}

export function removeUserBusiness(id) {
  const next = loadUserBusinesses().filter((b) => b.id !== id);
  safeSet(next);
  return next;
}
