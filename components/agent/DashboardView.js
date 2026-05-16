"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { PROPERTIES, ACTIVITY_TYPES, formatPrice } from "@/lib/agent/mockProperties";
import { filterPropertiesByZones } from "@/lib/agent/distance";
import { AI_AGENTS } from "@/lib/agent/aiAgents";
import { PERSONAS } from "@/lib/agent/personas";
import { ICASE_TEMPLATES } from "@/lib/agent/iCases";
import {
  loadZoneLayers,
  loadZoneBusinessSummaries,
} from "@/lib/agent/storage";
import { PROPERTY_FILTER_BY_VALUE } from "@/lib/property/filters";
import { BUSINESS_CATEGORIES } from "./BusinessRibbon";

// Default look for workspace-built i-Cases (no template key).
const WORKSPACE_DEFAULT_META = { icon: "🤖", color: "#06b6d4", category: "Custom workspace" };
function metaFor(iCase) {
  return ICASE_TEMPLATES[iCase?.templateKey] || WORKSPACE_DEFAULT_META;
}
import { FREE_TIER_MAX_ICASES, FREE_TIER_MAX_ZONES } from "@/lib/agent/storage";
import ZoneSettingsModal from "./ZoneSettingsModal";
import ICaseBuilder from "./ICaseBuilder";

const ZoneSnapMap = dynamic(() => import("./ZoneSnapMap"), { ssr: false });

const ZONE_PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899"];

export default function DashboardView({
  profile,
  zones,
  iCases,
  onGo,
  onFocusZone,
  onUpdateZone,
  onRemoveZone,
  onAddICase,
  onUpdateICase,
  onRemoveICase,
  onOpenICase,
}) {
  const [settingsZone, setSettingsZone] = useState(null);
  const [builderState, setBuilderState] = useState(null); // null | { editing: null|case }

  // Pull the per-zone layer state + business-analysis summaries so each snap
  // card can show what the agent has actually configured (active property
  // filters + which business categories they've analysed).
  const [zoneLayers, setZoneLayers] = useState({});
  const [bizSummaries, setBizSummaries] = useState({});
  useEffect(() => {
    setZoneLayers(loadZoneLayers());
    setBizSummaries(loadZoneBusinessSummaries());
  }, [zones.length]);

  const reachedCaseLimit = iCases.length >= FREE_TIER_MAX_ICASES;
  const reachedZoneLimit = zones.length >= FREE_TIER_MAX_ZONES;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-8 py-7">
      {/* Greeting */}
      <div className="mb-7">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-1">
          Welcome back
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          {profile?.name}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Your AI-first workspace for managing zones, properties, and customer conversations.
        </p>
      </div>

      {/* Empty-state guide when nothing exists yet */}
      {zones.length === 0 && iCases.length === 0 ? (
        <FirstTimeGuide onGoAreas={() => onGo("areas")} />
      ) : null}

      {/* YOUR WORKING ZONES */}
      <section className="mb-9">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-slate-300 font-semibold">
            Your Working Zones · {zones.length}
          </h2>
          {zones.length > 0 ? (
            <button
              type="button"
              onClick={() => onGo("areas")}
              className="text-[11px] px-3 py-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 font-semibold transition"
            >
              🗺️ Show all areas together
            </button>
          ) : null}
        </div>

        {zones.length === 0 ? (
          <EmptyZones onGo={() => onGo("areas")} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {zones.map((z, i) => (
              <ZoneSnapCard
                key={z.id}
                zone={z}
                index={i}
                color={ZONE_PALETTE[i % ZONE_PALETTE.length]}
                layer={zoneLayers[z.id]}
                bizSummary={bizSummaries[z.id]}
                onOpenMap={() => onFocusZone?.(z.id)}
                onOpenSettings={() => setSettingsZone(z)}
                relatedICases={iCases.filter((c) => c.zoneIds?.includes(z.id))}
              />
            ))}

            {/* Big + add-zone card — mirrors the i-Cases "Add new" pattern below.
                Clicking jumps to the Working Areas view where the agent drops a
                pin and configures radius + activities. Disabled at the free-plan
                quota (kept consistent with how AreasView caps creation). */}
            <button
              type="button"
              onClick={() => !reachedZoneLimit && onGo("areas")}
              disabled={reachedZoneLimit}
              className={`rounded-lg border-2 border-dashed flex flex-col items-center justify-center min-h-[260px] p-5 transition ${
                reachedZoneLimit
                  ? "border-slate-800 bg-slate-900/30 cursor-not-allowed"
                  : "border-slate-700 bg-slate-900/30 hover:border-cyan-500 hover:bg-cyan-500/5"
              }`}
              title={reachedZoneLimit ? "Free-plan limit reached — upgrade to Gold" : "Drop a new working zone"}
            >
              <div className={`text-5xl ${reachedZoneLimit ? "text-slate-700" : "text-cyan-300"}`}>+</div>
              <div className={`mt-2 text-sm font-semibold ${reachedZoneLimit ? "text-slate-500" : "text-slate-100"}`}>
                {reachedZoneLimit ? "Free-plan limit reached" : "Add new zone"}
              </div>
              <div className={`text-[11px] mt-1 max-w-[28ch] text-center leading-relaxed ${
                reachedZoneLimit ? "text-slate-600" : "text-slate-400"
              }`}>
                {reachedZoneLimit
                  ? `You're using ${FREE_TIER_MAX_ZONES} of ${FREE_TIER_MAX_ZONES} zones. Upgrade to Gold for unlimited.`
                  : "Pick a spot on the map, set a radius, and tag the activities you cover there."}
              </div>
            </button>
          </div>
        )}
      </section>

      {/* MY i-CASES / ASSISTANCES */}
      <section className="mb-9">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-slate-300 font-semibold">
              My i-Cases / Assistances · {iCases.length}
              <span className="ml-2 text-slate-500 normal-case tracking-normal">
                Free plan: up to {FREE_TIER_MAX_ICASES}
              </span>
            </h2>
            <p className="text-[11.5px] text-slate-500 mt-1 max-w-xl leading-relaxed">
              Each i-Case is an automation recipe — a trigger, a few steps, and the agents and
              customers it watches. Spin one up per repeating task to handle multiple
              workflows in parallel.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {iCases.map((c) => (
            <ICaseCard
              key={c.id}
              iCase={c}
              zones={zones}
              onEdit={() => setBuilderState({ editing: c })}
              onRemove={() => {
                if (confirm(`Delete i-Case "${c.name}"?`)) onRemoveICase(c.id);
              }}
              onTogglePause={() =>
                onUpdateICase(c.id, { status: c.status === "active" ? "paused" : "active" })
              }
              onApproveAll={() =>
                onUpdateICase(c.id, {
                  notifications: (c.notifications || []).map((n) => ({ ...n, approved: true })),
                })
              }
              onOpen={() => onOpenICase?.(c.id)}
            />
          ))}

          {/* Big + add-card */}
          <button
            type="button"
            onClick={() => !reachedCaseLimit && setBuilderState({ editing: null })}
            disabled={reachedCaseLimit}
            className={`rounded-lg border-2 border-dashed flex flex-col items-center justify-center min-h-[220px] p-5 transition ${
              reachedCaseLimit
                ? "border-slate-800 bg-slate-900/30 cursor-not-allowed"
                : "border-slate-700 bg-slate-900/30 hover:border-amber-500 hover:bg-amber-500/5"
            }`}
          >
            <div className={`text-5xl ${reachedCaseLimit ? "text-slate-700" : "text-amber-300"}`}>+</div>
            <div className={`mt-2 text-sm font-semibold ${reachedCaseLimit ? "text-slate-500" : "text-slate-100"}`}>
              {reachedCaseLimit ? "Free-plan limit reached" : "Add new i-Case"}
            </div>
            <div className={`text-[11px] mt-1 max-w-[28ch] text-center leading-relaxed ${
              reachedCaseLimit ? "text-slate-600" : "text-slate-400"
            }`}>
              {reachedCaseLimit
                ? `You're using ${FREE_TIER_MAX_ICASES} of ${FREE_TIER_MAX_ICASES}. Upgrade to Gold for unlimited.`
                : "Pick a template, name it, assign zones + agents."}
            </div>
          </button>
        </div>
      </section>

      <div className="text-[10px] text-slate-600 leading-relaxed">
        A-Box Agent Hub MVP · Mock property data · AI customers powered by OpenRouter ·
        Everything you save here lives in this browser (no signup required).
      </div>

      {settingsZone ? (
        <ZoneSettingsModal
          zone={settingsZone}
          onClose={() => setSettingsZone(null)}
          onUpdate={onUpdateZone}
          onRemove={onRemoveZone}
        />
      ) : null}

      {builderState ? (
        <ICaseBuilder
          existing={builderState.editing}
          zones={zones}
          onClose={() => setBuilderState(null)}
          onSave={(payload) => {
            if (builderState.editing) onUpdateICase(builderState.editing.id, payload);
            else onAddICase(payload);
          }}
        />
      ) : null}
    </div>
  );
}

// ----- Working-zone snap card ------------------------------------------------

function ZoneSnapCard({ zone, index, color, layer, bizSummary, onOpenMap, onOpenSettings, relatedICases }) {
  const matched = useMemo(() => filterPropertiesByZones(PROPERTIES, [zone]), [zone]);
  const counts = useMemo(() => groupByActivity(matched, zone), [matched, zone]);
  const total = matched.length;

  // Resolve filter values → filter metadata for the chips. If the agent has
  // touched the ribbon (propertyTouched), surface the ACTIVE filter set; if
  // they haven't, dim the row to indicate "still all default-lit".
  const activeFilters = (layer?.propertyFilters || []).map(
    (v) => PROPERTY_FILTER_BY_VALUE[v],
  ).filter(Boolean);
  const propertyTouched = !!layer?.propertyTouched;
  const propertyOn = !!layer?.propertyOn;
  const bizCategory = bizSummary?.category;
  const bizCatLabel = BUSINESS_CATEGORIES.find((c) => c.value === bizCategory)?.label || bizCategory;

  return (
    <div className="text-left rounded-lg overflow-hidden border border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:shadow-lg hover:shadow-cyan-500/10 transition group">
      {/* Mini map snapshot — click to fly to it in the working-areas view */}
      <button type="button" onClick={onOpenMap} className="block relative h-32 w-full bg-slate-800 cursor-pointer">
        <ZoneSnapMap zone={zone} color={color} />
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px ${color}` }}
          />
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-100 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur">
            Zone {index + 1}
          </span>
        </div>
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-100 px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur tabular-nums">
            {(zone.radius / 1000).toFixed(1)} km
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-900 to-transparent" />
      </button>

      {/* Body */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-slate-100 truncate">{zone.label}</div>
            <div className="text-[10.5px] text-slate-400 truncate">
              {zone.addressLabel || "Resolving address…"}
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-slate-400 hover:text-slate-100 px-1.5 py-0.5 rounded hover:bg-slate-800 transition"
            title="Zone settings"
            aria-label="Zone settings"
          >
            ⋯
          </button>
        </div>

        {/* Activity-typed counts */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {Object.entries(counts).length === 0 ? (
            <span className="text-[10px] text-slate-500 italic">No properties match this zone</span>
          ) : (
            Object.entries(counts).map(([key, n]) => {
              const meta = ACTIVITY_TYPES.find((a) => a.value === key);
              if (!meta) return null;
              return (
                <span
                  key={key}
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${meta.color} tabular-nums`}
                >
                  {meta.icon} {n} {meta.label}
                </span>
              );
            })
          )}
        </div>

        {/* Top matching properties (up to 4) */}
        {matched.length > 0 ? (
          <div className="mt-3 space-y-1.5">
            {matched.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-500 w-3 shrink-0">·</span>
                <span className="text-slate-200 truncate flex-1">{p.title}</span>
                <span className="text-amber-300 font-semibold tabular-nums shrink-0">
                  {formatPrice(p)}
                </span>
              </div>
            ))}
            {matched.length > 4 ? (
              <div className="text-[10px] text-slate-500 ml-3">
                + {matched.length - 4} more in this zone
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Selected property types — only shown when the Property layer is on
            for this zone. Greyed out until the agent has actually touched the
            ribbon (otherwise we're just echoing the default-lit state). */}
        {propertyOn ? (
          <div className="mt-3 pt-2 border-t border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
              Selected properties · {activeFilters.length}
              {!propertyTouched ? <span className="ml-1 normal-case tracking-normal text-slate-600">(default — all lit)</span> : null}
            </div>
            <div className="flex flex-wrap gap-1">
              {activeFilters.length === 0 ? (
                <span className="text-[10px] text-slate-500 italic">No types selected</span>
              ) : (
                activeFilters.slice(0, 6).map((f) => (
                  <span
                    key={f.value}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      propertyTouched ? "" : "opacity-60"
                    }`}
                    style={{
                      borderColor: `${f.color}66`,
                      background: `${f.color}1f`,
                      color: f.color,
                    }}
                  >
                    {f.icon} {f.label}
                  </span>
                ))
              )}
              {activeFilters.length > 6 ? (
                <span className="text-[10px] text-slate-500">+{activeFilters.length - 6}</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Searched business activity — shown once a Business analysis has run
            for this zone. Pulls from the slim summary cached in localStorage. */}
        {bizSummary ? (
          <div className="mt-2 pt-2 border-t border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
              Searched activity
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-200">
              <span className="text-base">📊</span>
              <span className="truncate flex-1">{bizCatLabel || "—"}</span>
              <span className="text-amber-300 tabular-nums" title="Gold">🥇 {bizSummary.goldCount || 0}</span>
              <span className="text-slate-300 tabular-nums" title="Silver">🥈 {bizSummary.silverCount || 0}</span>
              <span className="text-amber-700 tabular-nums" title="Bronze">🥉 {bizSummary.bronzeCount || 0}</span>
            </div>
            {bizSummary.analyzedAt ? (
              <div className="text-[9.5px] text-slate-500 mt-1">
                Last analysed {new Date(bizSummary.analyzedAt).toLocaleDateString()}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Assignments + linked i-Cases */}
        <Assignments
          agentKeys={zone.assignedAgents}
          customerKeys={zone.assignedCustomers}
          relatedICases={relatedICases}
        />

        <button
          type="button"
          onClick={onOpenMap}
          className="mt-3 text-[10.5px] uppercase tracking-wider text-cyan-300 font-semibold group-hover:text-cyan-200"
        >
          Open in map →
        </button>
      </div>
    </div>
  );
}

function Assignments({ agentKeys = [], customerKeys = [], relatedICases = [] }) {
  if (agentKeys.length === 0 && customerKeys.length === 0 && relatedICases.length === 0) return null;
  return (
    <div className="mt-3 pt-2 border-t border-slate-800 space-y-1.5 text-[10px] text-slate-400">
      {agentKeys.length > 0 ? (
        <div className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider text-slate-500 w-12 shrink-0">Agents</span>
          <ChipStack keys={agentKeys} source={AI_AGENTS} />
        </div>
      ) : null}
      {customerKeys.length > 0 ? (
        <div className="flex items-center gap-1.5">
          <span className="uppercase tracking-wider text-slate-500 w-12 shrink-0">Clients</span>
          <ChipStack keys={customerKeys} source={PERSONAS} />
        </div>
      ) : null}
      {relatedICases.length > 0 ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="uppercase tracking-wider text-slate-500 w-12 shrink-0">i-Cases</span>
          {relatedICases.map((c) => {
            const t = metaFor(c);
            return (
              <span
                key={c.id}
                className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px]"
                title={c.name}
              >
                {t?.icon || "🤖"} {c.name}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ChipStack({ keys, source }) {
  return (
    <div className="flex -space-x-1.5">
      {keys.map((k) => {
        const p = source[k];
        if (!p) return null;
        return (
          <span
            key={k}
            className="w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-slate-900 font-bold text-[9px]"
            style={{ background: p.color }}
            title={p.name}
          >
            {p.avatar}
          </span>
        );
      })}
    </div>
  );
}

// ----- i-Case card -----------------------------------------------------------

function ICaseCard({ iCase, zones, onEdit, onRemove, onTogglePause, onApproveAll, onOpen }) {
  const t = metaFor(iCase);
  const pending = (iCase.notifications || []).filter((n) => !n.approved).length;
  const linkedZones = zones.filter((z) => iCase.zoneIds?.includes(z.id));

  return (
    <div
      className="rounded-lg overflow-hidden border bg-slate-900/40 hover:shadow-lg transition"
      style={{ borderColor: `${t?.color || "#64748b"}50` }}
    >
      {/* Header bar with the case's graphic + status */}
      <div
        className="px-3 py-2.5 flex items-center gap-2.5"
        style={{ background: `${t?.color || "#64748b"}15` }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{ background: `${t?.color || "#64748b"}30`, color: t?.color || "#cbd5e1" }}
        >
          {t?.icon || "🤖"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold text-slate-100 truncate">{iCase.name}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            {t?.category || "Custom"} · {iCase.status === "paused" ? "paused" : "active"}
          </div>
        </div>
        <span
          className={`w-2 h-2 rounded-full ${
            iCase.status === "paused" ? "bg-slate-500" : "bg-emerald-400 animate-pulse"
          }`}
        />
      </div>

      <div className="p-3 space-y-2.5">
        {/* Description: either the workspace-author's description, or the legacy
            template's blurb. Trigger/steps only render for legacy template-based
            i-Cases — workspace-built i-Cases show their actual rule count instead. */}
        {iCase.description ? (
          <div className="text-[11.5px] text-slate-300 leading-snug">{iCase.description}</div>
        ) : t?.description ? (
          <div className="text-[11.5px] text-slate-300 leading-snug">{t.description}</div>
        ) : null}

        {t?.trigger ? (
          <div className="text-[10.5px] text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Trigger:</strong> {t.trigger}
          </div>
        ) : null}

        {Array.isArray(t?.steps) && t.steps.length > 0 ? (
          <ol className="text-[10.5px] text-slate-300 list-decimal list-inside space-y-0.5">
            {t.steps.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        ) : (iCase.rules && iCase.rules.length > 0) ? (
          <div className="text-[10.5px] text-slate-400">
            <strong className="text-slate-300">{iCase.rules.length}</strong>{" "}
            rule{iCase.rules.length === 1 ? "" : "s"} configured in the workspace.
          </div>
        ) : (
          <div className="text-[10.5px] text-slate-500 italic">
            No rules yet — open the workspace to compose your automation.
          </div>
        )}

        {/* Linked zones / agents / customers */}
        <div className="text-[10px] space-y-1 pt-1 border-t border-slate-800">
          {linkedZones.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {linkedZones.map((z, i) => (
                <span key={z.id} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                  📍 {z.label}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 italic">No zones linked yet</div>
          )}
          {iCase.agentKeys?.length || iCase.customerKeys?.length ? (
            <div className="flex items-center gap-2 mt-1">
              {iCase.agentKeys?.length ? <ChipStack keys={iCase.agentKeys} source={AI_AGENTS} /> : null}
              {iCase.customerKeys?.length ? <ChipStack keys={iCase.customerKeys} source={PERSONAS} /> : null}
            </div>
          ) : null}
        </div>

        {/* Notifications */}
        <div className="rounded border border-slate-800 bg-slate-950">
          <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-800">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Notifications · {pending} pending
            </span>
            {pending > 0 ? (
              <button
                type="button"
                onClick={onApproveAll}
                className="text-[10px] font-semibold text-emerald-300 hover:text-emerald-200"
              >
                Approve all
              </button>
            ) : null}
          </div>
          <div className="max-h-24 overflow-y-auto scrollbar-thin px-2.5 py-1.5 space-y-1">
            {(iCase.notifications || []).length === 0 ? (
              <div className="text-[10.5px] text-slate-500 italic">No events yet</div>
            ) : (
              iCase.notifications.map((n) => (
                <div key={n.id} className="text-[10.5px] flex items-start gap-1.5">
                  <span className={n.approved ? "text-emerald-400" : "text-amber-300"}>
                    {n.approved ? "✓" : "•"}
                  </span>
                  <span className={n.approved ? "text-slate-500 line-through" : "text-slate-200"}>
                    {n.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onOpen}
            className="flex-1 text-[11px] px-2 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold transition"
            title="Open this i-Case in its workspace"
          >
            ⚡ Open
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            title="Rename or edit description"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            className="text-[11px] px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            {iCase.status === "paused" ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] px-2 py-1.5 rounded border border-red-700/40 bg-red-900/15 hover:bg-red-900/30 text-red-300 transition"
            title="Delete this i-Case"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- Empty states ----------------------------------------------------------

function FirstTimeGuide({ onGoAreas }) {
  return (
    <div className="mb-7 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5">
      <div className="text-[11px] uppercase tracking-wider text-cyan-300 font-semibold mb-1.5">
        Start here
      </div>
      <div className="text-sm text-slate-100 font-semibold">
        Your workspace is empty. Two steps to make the dashboard useful:
      </div>
      <ol className="text-[12.5px] text-slate-300 mt-3 space-y-2 list-decimal list-inside leading-relaxed">
        <li>
          <button
            type="button"
            onClick={onGoAreas}
            className="text-cyan-300 hover:text-cyan-200 underline-offset-2 hover:underline font-semibold"
          >
            Open Working Areas
          </button>{" "}
          and drop your first zone — pick a radius and the activities you cover (Sell / Rent /
          Office / …).
        </li>
        <li>
          Add an <strong className="text-amber-300">i-Case</strong> below to automate repeating
          tasks (welcome leads, daily market pulse, showing follow-ups).
        </li>
      </ol>
    </div>
  );
}

function EmptyZones({ onGo }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center">
      <div className="text-3xl mb-2">📍</div>
      <div className="text-sm font-semibold text-slate-200">No working zones yet</div>
      <div className="text-[12px] text-slate-400 mt-1 leading-relaxed max-w-md mx-auto">
        Add your first zone to see a snap-card here, with the map preview, address, and property
        counts broken down by activity.
      </div>
      <button
        type="button"
        onClick={onGo}
        className="mt-4 px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition"
      >
        Create your first zone →
      </button>
    </div>
  );
}

// ----- helpers ----------------------------------------------------------------

function groupByActivity(matched, zone) {
  const counts = {};
  for (const p of matched) {
    const a = primaryActivityOf(p);
    if (!a) continue;
    if (zone.activities && zone.activities.length > 0 && !zone.activities.includes(a)) continue;
    counts[a] = (counts[a] || 0) + 1;
  }
  return counts;
}

function primaryActivityOf(p) {
  if (p.type === "office") return "office";
  if (p.type === "hotel") return "hotel";
  if (p.type === "warehouse") return "manufacturing";
  if (p.type === "retail") return "retail";
  if (p.listing === "sale") return "sell";
  if (p.listing === "rent") return "rent";
  return null;
}
