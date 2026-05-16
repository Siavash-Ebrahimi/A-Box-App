"use client";

// /agent-hub/case/[id]
// Dedicated workspace ("automation studio") for a single i-Case.
// All state lives here; child components are pure presentation. Zones, properties,
// and the i-Case itself are loaded from localStorage on mount.

import { useEffect, useMemo, useState, use as useUnwrap } from "react";
import { useRouter } from "next/navigation";
import ICaseWorkspace from "@/components/agent/icase/ICaseWorkspace";
import {
  loadICases,
  updateICase as persistUpdateICase,
  removeICase as persistRemoveICase,
  loadZones,
} from "@/lib/agent/storage";
import { PROPERTIES } from "@/lib/agent/mockProperties";

export default function ICaseWorkspacePage({ params }) {
  // Next 15+ may pass params as a Promise; unwrap if so. The fallback covers
  // older versions where params is already a plain object.
  const resolved = typeof params?.then === "function" ? useUnwrap(params) : params;
  const id = resolved?.id;
  const router = useRouter();

  const [iCase, setICase] = useState(null);
  const [zones, setZones] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const all = loadICases();
    const match = all.find((c) => c.id === id);
    setZones(loadZones());
    if (!match) {
      setNotFound(true);
    } else {
      setICase(match);
    }
    setHydrated(true);
  }, [id]);

  // Persist on every change after the first hydration so closing the tab can't
  // lose work. Debounced via React's batching — saving on every state edit is
  // fine at MVP scale.
  function patch(next) {
    setICase((cur) => {
      if (!cur) return cur;
      const merged = { ...cur, ...next };
      persistUpdateICase(cur.id, next);
      return merged;
    });
  }

  function handleDelete() {
    if (!iCase) return;
    if (!confirm(`Delete i-Case "${iCase.name}"? This can't be undone.`)) return;
    persistRemoveICase(iCase.id);
    router.push("/agent-hub");
  }

  const scopedProperties = useMemo(() => {
    if (!iCase) return [];
    const idSet = new Set(iCase.selectedPropertyIds || []);
    return PROPERTIES.filter((p) => idSet.has(p.id));
  }, [iCase]);

  if (!hydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-500 text-sm">
        Loading workspace…
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <div className="text-sm">i-Case not found.</div>
        <button
          type="button"
          onClick={() => router.push("/agent-hub")}
          className="text-xs px-3 py-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 transition"
        >
          ← Back to Agent Hub
        </button>
      </div>
    );
  }

  return (
    <ICaseWorkspace
      iCase={iCase}
      zones={zones}
      scopedProperties={scopedProperties}
      onPatch={patch}
      onDelete={handleDelete}
      onBack={() => router.push("/agent-hub")}
    />
  );
}
