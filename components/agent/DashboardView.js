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
  loadFavourites,
  loadFavoriteRecommendations,
} from "@/lib/agent/storage";
import { loadUserProperties } from "@/lib/property/userProperties";
import { metersBetween } from "@/lib/agent/distance";
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
  // filters + which business categories they've analysed). Also load
  // property favourites + favourited recommendations so saved items show up
  // beside each zone — these feed the i-Cases section too.
  const [zoneLayers, setZoneLayers] = useState({});
  const [bizSummaries, setBizSummaries] = useState({});
  const [favIds, setFavIds] = useState(() => new Set());
  const [favRecsByZone, setFavRecsByZone] = useState({});
  const [userProps, setUserProps] = useState([]);
  useEffect(() => {
    setZoneLayers(loadZoneLayers());
    setBizSummaries(loadZoneBusinessSummaries());
    setFavIds(loadFavourites());
    setFavRecsByZone(loadFavoriteRecommendations());
    setUserProps(loadUserProperties());
  }, [zones.length]);

  // Resolve favourite property IDs to full property records once (uses the
  // built-in catalogue + user-added properties). Cards filter this list by
  // zone radius locally.
  const favouriteProperties = useMemo(() => {
    if (!favIds || favIds.size === 0) return [];
    const all = [...PROPERTIES, ...userProps];
    return all.filter((p) => favIds.has(p.id));
  }, [favIds, userProps]);

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

      {/* Side-by-side layout: Working Zones (left) | i-Cases (right). Stacks
          to a single column below the xl breakpoint so the dashboard stays
          usable on narrower viewports. A divider line sits in the gutter
          between the two columns (vertical on xl, horizontal when stacked). */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-9 relative xl:divide-x divide-slate-800">

      {/* YOUR WORKING ZONES — left column */}
      <section className="xl:pr-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-slate-300 font-semibold">
            Your Working Zones · {zones.length}
          </h2>
          {zones.length > 0 ? (
            <button
              type="button"
              onClick={() => onGo("areas")}
              className="text-[10px] px-2.5 py-1 rounded border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 font-semibold transition"
            >
              🗺️ Show all areas
            </button>
          ) : null}
        </div>

        {zones.length === 0 ? (
          <EmptyZones onGo={() => onGo("areas")} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {zones.map((z, i) => (
              <ZoneSnapCard
                key={z.id}
                zone={z}
                index={i}
                color={ZONE_PALETTE[i % ZONE_PALETTE.length]}
                layer={zoneLayers[z.id]}
                bizSummary={bizSummaries[z.id]}
                favouriteProperties={favouriteProperties}
                favouriteRecs={favRecsByZone[z.id] || []}
                onOpenMap={() => onFocusZone?.(z.id)}
                onOpenSettings={() => setSettingsZone(z)}
                relatedICases={iCases.filter((c) => c.zoneIds?.includes(z.id))}
              />
            ))}

            {/* Big + add-zone card */}
            <button
              type="button"
              onClick={() => !reachedZoneLimit && onGo("areas")}
              disabled={reachedZoneLimit}
              className={`rounded-lg border-2 border-dashed flex flex-col items-center justify-center min-h-[180px] p-3 transition ${
                reachedZoneLimit
                  ? "border-slate-800 bg-slate-900/30 cursor-not-allowed"
                  : "border-slate-700 bg-slate-900/30 hover:border-cyan-500 hover:bg-cyan-500/5"
              }`}
              title={reachedZoneLimit ? "Free-plan limit reached — upgrade to Gold" : "Drop a new working zone"}
            >
              <div className={`text-4xl ${reachedZoneLimit ? "text-slate-700" : "text-cyan-300"}`}>+</div>
              <div className={`mt-1.5 text-[12.5px] font-semibold ${reachedZoneLimit ? "text-slate-500" : "text-slate-100"}`}>
                {reachedZoneLimit ? "Free-plan limit reached" : "Add new zone"}
              </div>
              <div className={`text-[10px] mt-1 max-w-[26ch] text-center leading-relaxed ${
                reachedZoneLimit ? "text-slate-600" : "text-slate-400"
              }`}>
                {reachedZoneLimit
                  ? `${FREE_TIER_MAX_ZONES}/${FREE_TIER_MAX_ZONES} used. Upgrade to Gold.`
                  : "Pick a spot on the map, set a radius."}
              </div>
            </button>
          </div>
        )}
      </section>

      {/* MY i-CASES / ASSISTANCES — right column */}
      <section className="xl:pl-6 pt-6 xl:pt-0 border-t xl:border-t-0 border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-[11px] uppercase tracking-[0.18em] text-slate-300 font-semibold">
              My i-Cases · {iCases.length}
              <span className="ml-2 text-slate-500 normal-case tracking-normal text-[10px]">
                Free plan: up to {FREE_TIER_MAX_ICASES}
              </span>
            </h2>
            <p className="text-[10.5px] text-slate-500 mt-1 max-w-md leading-relaxed">
              Each i-Case is an automation recipe — a trigger, a few steps, and
              the agents + customers it watches.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            className={`rounded-lg border-2 border-dashed flex flex-col items-center justify-center min-h-[180px] p-3 transition ${
              reachedCaseLimit
                ? "border-slate-800 bg-slate-900/30 cursor-not-allowed"
                : "border-slate-700 bg-slate-900/30 hover:border-amber-500 hover:bg-amber-500/5"
            }`}
          >
            <div className={`text-4xl ${reachedCaseLimit ? "text-slate-700" : "text-amber-300"}`}>+</div>
            <div className={`mt-1.5 text-[12.5px] font-semibold ${reachedCaseLimit ? "text-slate-500" : "text-slate-100"}`}>
              {reachedCaseLimit ? "Free-plan limit reached" : "Add new i-Case"}
            </div>
            <div className={`text-[10px] mt-1 max-w-[26ch] text-center leading-relaxed ${
              reachedCaseLimit ? "text-slate-600" : "text-slate-400"
            }`}>
              {reachedCaseLimit
                ? `${FREE_TIER_MAX_ICASES}/${FREE_TIER_MAX_ICASES} used. Upgrade to Gold.`
                : "Name it, assign zones + agents."}
            </div>
          </button>
        </div>
      </section>

      </div>

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

// Type → emoji + label mapping for the Property section. Falls back to the
// raw type with a generic pin icon when an unknown type comes through.
const PROPERTY_TYPE_META = {
  apartment: { icon: "🏢", label: "Apartment" },
  villa:     { icon: "🏠", label: "Villa" },
  townhouse: { icon: "🏘️", label: "Townhouse" },
  studio:    { icon: "🛏️", label: "Studio" },
  penthouse: { icon: "🏙️", label: "Penthouse" },
  office:    { icon: "🏬", label: "Office" },
  retail:    { icon: "🏪", label: "Shop" },
  warehouse: { icon: "🏭", label: "Warehouse" },
  hotel:     { icon: "🏨", label: "Hotel" },
};
function typeMeta(p) {
  return PROPERTY_TYPE_META[p?.type] || { icon: "📍", label: p?.type || "Property" };
}

function ZoneSnapCard({
  zone, index, color, layer, bizSummary,
  favouriteProperties = [], favouriteRecs = [],
  onOpenMap, onOpenSettings, relatedICases,
}) {
  const bizCategory = bizSummary?.category;
  const bizCatLabel = BUSINESS_CATEGORIES.find((c) => c.value === bizCategory)?.label || bizCategory;

  // Favourited properties that physically sit inside this zone's circle.
  const savedPropsInZone = useMemo(() => {
    if (favouriteProperties.length === 0) return [];
    return favouriteProperties.filter(
      (p) => typeof p.lat === "number" && typeof p.lng === "number"
        && metersBetween(p.lat, p.lng, zone.lat, zone.lng) <= zone.radius,
    );
  }, [favouriteProperties, zone.lat, zone.lng, zone.radius]);

  const hasProperty = savedPropsInZone.length > 0;
  const hasBusiness = !!bizSummary || favouriteRecs.length > 0;

  return (
    <div className="text-left rounded-lg overflow-hidden border border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:shadow-lg hover:shadow-cyan-500/10 transition group">
      {/* Mini map snapshot */}
      <button type="button" onClick={onOpenMap} className="block relative h-24 w-full bg-slate-800 cursor-pointer">
        <ZoneSnapMap zone={zone} color={color} />
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
          <span className="text-[9.5px] uppercase tracking-wider font-bold text-slate-100 px-1 py-0.5 rounded bg-slate-900/80 backdrop-blur">
            Zone {index + 1}
          </span>
        </div>
        <div className="absolute top-1.5 right-1.5 z-10">
          <span className="text-[9.5px] uppercase tracking-wider font-semibold text-slate-100 px-1 py-0.5 rounded bg-slate-900/80 backdrop-blur tabular-nums">
            {(zone.radius / 1000).toFixed(1)} km
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-900 to-transparent" />
      </button>

      {/* Body */}
      <div className="p-2.5">
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[12.5px] text-slate-100 truncate">{zone.label}</div>
            <div className="text-[10px] text-slate-400 truncate">
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

        {/* Empty state */}
        {!hasProperty && !hasBusiness ? (
          <div className="mt-3 text-[10.5px] text-slate-500 italic leading-relaxed">
            No saved properties or business analysis yet. Open the map to start
            tagging items in this zone.
          </div>
        ) : null}

        {/* PROPERTY section — only when the agent has saved properties here */}
        {hasProperty ? (
          <section className="mt-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-[0.12em] text-amber-300 font-bold">
                🏠 Property
              </div>
              <span className="text-[9.5px] text-slate-500 tabular-nums">
                {savedPropsInZone.length} saved
              </span>
            </div>
            <div className="space-y-1">
              {savedPropsInZone.slice(0, 4).map((p) => {
                const meta = typeMeta(p);
                return (
                  <div key={p.id} className="flex items-center gap-2 text-[11px]">
                    <span className="text-base shrink-0 leading-none">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-100 font-medium truncate">{meta.label}</div>
                      <div className="text-[9.5px] text-slate-500 truncate">{p.title}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10.5px] text-amber-300 font-semibold tabular-nums">
                        {Number(p.area_sqft || 0).toLocaleString()} ft²
                      </div>
                      <div className="text-[9px] text-slate-500 tabular-nums">
                        {formatPrice(p)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {savedPropsInZone.length > 4 ? (
                <div className="text-[9.5px] text-slate-500 pt-0.5">
                  + {savedPropsInZone.length - 4} more saved
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* BUSINESS section — only when an analysis has run OR recs are saved */}
        {hasBusiness ? (
          <section className="mt-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-[0.12em] text-cyan-300 font-bold">
                📊 Business
              </div>
              {bizCatLabel ? (
                <span className="text-[9.5px] text-slate-400 truncate max-w-[140px]">
                  {bizCatLabel}
                </span>
              ) : null}
            </div>
            {bizSummary ? (
              <div className="flex items-center gap-2 text-[11px] text-slate-200">
                <span className="text-amber-300 tabular-nums" title="Gold streets">🥇 {bizSummary.goldCount || 0}</span>
                <span className="text-slate-300 tabular-nums" title="Silver streets">🥈 {bizSummary.silverCount || 0}</span>
                <span className="text-amber-700 tabular-nums" title="Bronze streets">🥉 {bizSummary.bronzeCount || 0}</span>
                {bizSummary.analyzedAt ? (
                  <span className="ml-auto text-[9px] text-slate-500">
                    {new Date(bizSummary.analyzedAt).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
            ) : null}
            {favouriteRecs.length > 0 ? (
              <div className="mt-1.5 space-y-1">
                {favouriteRecs.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-center gap-1.5 text-[10.5px]">
                    <span className="text-cyan-300 shrink-0">★</span>
                    <span className="text-slate-200 truncate flex-1">{r.street}</span>
                    <span className="text-cyan-300 font-semibold tabular-nums shrink-0">
                      {r.tier?.[0]?.toUpperCase()}·{Math.round(r.score)}
                    </span>
                  </div>
                ))}
                {favouriteRecs.length > 3 ? (
                  <div className="text-[9.5px] text-slate-500">
                    + {favouriteRecs.length - 3} more saved
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Linked i-Cases (compact) */}
        {relatedICases && relatedICases.length > 0 ? (
          <section className="mt-3 pt-2 border-t border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
              i-Cases · {relatedICases.length}
            </div>
            <div className="flex flex-wrap gap-1">
              {relatedICases.map((c) => (
                <span
                  key={c.id}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 truncate max-w-[150px]"
                  title={c.name}
                >
                  🤖 {c.name}
                </span>
              ))}
            </div>
          </section>
        ) : null}

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
        className="px-2.5 py-2 flex items-center gap-2"
        style={{ background: `${t?.color || "#64748b"}15` }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ background: `${t?.color || "#64748b"}30`, color: t?.color || "#cbd5e1" }}
        >
          {t?.icon || "🤖"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-slate-100 truncate">{iCase.name}</div>
          <div className="text-[9.5px] uppercase tracking-wider text-slate-500">
            {t?.category || "Custom"} · {iCase.status === "paused" ? "paused" : "active"}
          </div>
        </div>
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            iCase.status === "paused" ? "bg-slate-500" : "bg-emerald-400 animate-pulse"
          }`}
        />
      </div>

      <div className="p-2.5 space-y-2">
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
          <div className="max-h-20 overflow-y-auto scrollbar-thin px-2.5 py-1.5 space-y-1">
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
