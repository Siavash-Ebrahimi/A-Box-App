"use client";

// Agent Hub entry point. State for the active view, saved zones, favourites,
// and chat history lives here. Persistence is per-browser via localStorage
// (no backend / no signup) — see lib/agent/storage.js.

import { useEffect, useMemo, useState } from "react";
import AgentSidebar from "@/components/agent/AgentSidebar";
import AgentBootstrap from "@/components/agent/AgentBootstrap";
import DashboardView from "@/components/agent/DashboardView";
import AreasView from "@/components/agent/AreasView";
import PropertiesView from "@/components/agent/PropertiesView";
import ChatView from "@/components/agent/ChatView";
import { PROPERTIES } from "@/lib/agent/mockProperties";
import { filterPropertiesByZones } from "@/lib/agent/distance";
import {
  loadZones,
  addZone as persistAddZone,
  updateZone as persistUpdateZone,
  removeZone as persistRemoveZone,
  loadFavourites,
  toggleFavourite as persistToggleFavourite,
  loadChats,
  saveChats,
  clearChat as persistClearChat,
  loadProfile,
  loadBootstrap,
  bootstrapAsDemo,
  bootstrapAsCustom,
  deleteCustomAgent,
  loadICases,
  addICase as persistAddICase,
  updateICase as persistUpdateICase,
  removeICase as persistRemoveICase,
} from "@/lib/agent/storage";
import { ICASE_TEMPLATES, seedNotifications } from "@/lib/agent/iCases";

// Convert a Nominatim address object into a short, human-friendly label.
// Picks the most specific neighbourhood-ish field, then city, then country.
function formatAddress(addr) {
  if (!addr) return null;
  const a = addr.neighbourhood || addr.suburb || addr.city_district || addr.quarter || addr.village;
  const b = addr.city || addr.town || addr.municipality || addr.county;
  const c = addr.country;
  const parts = [a, b, c].filter(Boolean);
  // Deduplicate consecutive duplicates (e.g. "Dubai, Dubai, UAE")
  const dedup = parts.filter((p, i) => p !== parts[i - 1]);
  return dedup.join(", ") || null;
}

export default function AgentHubPage() {
  const [view, setView] = useState("dashboard");
  const [zones, setZones] = useState([]);
  const [favourites, setFavourites] = useState(() => new Set());
  const [chats, setChats] = useState({});
  const [profile, setProfile] = useState({ name: "Loading…", company: "" });
  const [personaKey, setPersonaKey] = useState("buyer_marina");
  const [pendingShare, setPendingShare] = useState(null);
  const [focusZoneId, setFocusZoneId] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [bootstrap, setBootstrap] = useState(null); // null | "demo" | "custom"
  const [iCases, setICases] = useState([]);

  // Initial hydration from localStorage. Done in an effect so SSR doesn't mismatch.
  useEffect(() => {
    setZones(loadZones());
    setFavourites(loadFavourites());
    setChats(loadChats());
    setProfile(loadProfile());
    setBootstrap(loadBootstrap());
    setICases(loadICases());
    setHydrated(true);
  }, []);

  // Reverse-geocode any zone that doesn't yet have an address label. Fires for both
  // legacy zones (created before this feature) and freshly-added zones whose initial
  // save is queued without an address. Best-effort — network errors are swallowed.
  useEffect(() => {
    const targets = zones.filter((z) => !z.addressLabel && z.lat != null && z.lng != null);
    if (targets.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const z of targets) {
        try {
          const r = await fetch(`/api/reverse?lat=${z.lat}&lon=${z.lng}`);
          const d = await r.json();
          const label = formatAddress(d?.address);
          if (!cancelled && label) {
            const next = persistUpdateZone(z.id, { addressLabel: label });
            setZones(next);
          }
        } catch { /* ignore */ }
        if (cancelled) break;
      }
    })();
    return () => { cancelled = true; };
  }, [zones.length]); // re-run when a new zone is added

  // --- Bootstrap handlers ---
  function handleChooseDemo() {
    bootstrapAsDemo();
    setProfile(loadProfile());
    setBootstrap("demo");
  }
  function handleChooseCustom(name) {
    bootstrapAsCustom(name);
    setProfile(loadProfile());
    setBootstrap("custom");
  }
  function handleDeleteAgent() {
    if (!confirm("Delete this local agent? Your zones, favourites, and chat history will stay — only the agent profile is removed. You'll see the welcome screen again.")) return;
    deleteCustomAgent();
    setProfile({ name: "", company: "" });
    setBootstrap(null);
  }

  // ---- zone handlers ----
  function handleAddZone(zone) {
    const next = persistAddZone(zone);
    setZones(next);
  }
  function handleUpdateZone(id, patch) {
    const next = persistUpdateZone(id, patch);
    setZones(next);
  }
  function handleRemoveZone(id) {
    const next = persistRemoveZone(id);
    setZones(next);
  }

  // ---- i-Case handlers ----
  function handleAddICase(payload) {
    const template = ICASE_TEMPLATES[payload.templateKey] || null;
    const seed = template ? seedNotifications(template) : [];
    const next = persistAddICase({ ...payload, notifications: seed });
    setICases(next);
  }
  function handleUpdateICase(id, patch) {
    const next = persistUpdateICase(id, patch);
    setICases(next);
  }
  function handleRemoveICase(id) {
    const next = persistRemoveICase(id);
    setICases(next);
  }

  // ---- favourite handler ----
  function handleToggleFavourite(propertyId) {
    persistToggleFavourite(propertyId);
    setFavourites(loadFavourites());
  }

  // ---- chat handlers ----
  function handleAppendMessage(pKey, msg) {
    setChats((prev) => {
      const next = { ...prev, [pKey]: [...(prev[pKey] || []), msg] };
      saveChats(next);
      return next;
    });
  }
  function handleClearChat(pKey) {
    persistClearChat(pKey);
    setChats(loadChats());
  }

  // ---- send a property card from Properties → Chat ----
  function handleSendToAI(property) {
    setPendingShare(property);
    setView("chat");
  }

  // ---- click a zone snap-card on the dashboard ----
  function handleFocusZone(zoneId) {
    setFocusZoneId(zoneId);
    setView("areas");
  }

  // ---- click a persona in the sidebar ----
  function handleSelectPersonaFromSidebar(key) {
    setPersonaKey(key);
    setView("chat");
  }

  const propertiesInZones = useMemo(() => {
    if (zones.length === 0) return 0;
    return filterPropertiesByZones(PROPERTIES, zones).length;
  }, [zones]);

  const sidebarCounts = {
    zones: zones.length,
    properties: propertiesInZones || PROPERTIES.length,
  };

  // --- Bootstrap gate: show welcome before workspace ---
  if (!hydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-500 text-sm">
        Loading workspace…
      </div>
    );
  }
  if (!bootstrap) {
    return <AgentBootstrap onDemo={handleChooseDemo} onCustom={handleChooseCustom} />;
  }

  return (
    <div className="h-screen flex bg-slate-950">
      <AgentSidebar
        active={view}
        onSelect={setView}
        profile={profile}
        counts={sidebarCounts}
        chats={chats}
        onSelectPersona={handleSelectPersonaFromSidebar}
        onDeleteAgent={handleDeleteAgent}
      />

      <main className="flex-1 min-w-0">
        {view === "dashboard" ? (
          <DashboardView
            profile={profile}
            zones={zones}
            iCases={iCases}
            onGo={setView}
            onFocusZone={handleFocusZone}
            onUpdateZone={handleUpdateZone}
            onRemoveZone={handleRemoveZone}
            onAddICase={handleAddICase}
            onUpdateICase={handleUpdateICase}
            onRemoveICase={handleRemoveICase}
          />
        ) : view === "areas" ? (
          <AreasView
            zones={zones}
            focusZoneId={focusZoneId}
            onClearFocus={() => setFocusZoneId(null)}
            onAddZone={handleAddZone}
            onRemoveZone={handleRemoveZone}
          />
        ) : view === "properties" ? (
          <PropertiesView
            zones={zones}
            favourites={favourites}
            onToggleFavourite={handleToggleFavourite}
            onSendToAI={handleSendToAI}
          />
        ) : view === "chat" ? (
          <ChatView
            selectedPersonaKey={personaKey}
            onSelectPersona={setPersonaKey}
            chats={chats}
            onAppendMessage={handleAppendMessage}
            onClearChat={handleClearChat}
            pendingShare={pendingShare}
            onClearPendingShare={() => setPendingShare(null)}
          />
        ) : null}
      </main>
    </div>
  );
}
