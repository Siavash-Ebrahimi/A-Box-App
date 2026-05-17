"use client";

// Right rail of the i-Case workspace. Shows context for the selected node:
//   - Source nodes: the underlying property/recommendation details + zone
//   - Tool nodes: a per-tool config form (small, type-specific)
//   - AI nodes: an inline chat surface that posts to /api/agent-chat with the
//     CONNECTED upstream context inlined into the prompt
//
// When nothing is selected, a quick "how to build a flow" cheatsheet is shown
// so the workspace never feels empty.

import { useEffect, useMemo, useRef, useState } from "react";
import { NODE_FAMILY_META, TOOL_NODES_BY_KIND } from "@/lib/agent/iCaseFlow";
import TranslateButtons from "@/components/TranslateButtons";

// We post the AI chat to the existing /api/agent-chat endpoint. That route
// requires a personaKey; the buyer_marina persona is a sensible default for
// real-estate questions and falls back to a templated reply when the LLM is
// unreachable, so the demo never feels broken.
const DEFAULT_AI_PERSONA = "buyer_marina";

export default function FlowInspector({
  iCase,
  flow,
  selectedNodeId,
  zones = [],
  savedProperties = [],
  savedRecsByZone = {},
  runningNodeId = null,
  onChange,
  onSelectNode,
  onRunCompare,                 // (nodeId, contextLines) => Promise<void>
  onRunTool,                    // (nodeId) => Promise<void> — generic runner for non-compare AI tools
}) {
  const node = selectedNodeId ? flow.nodes.find((n) => n.id === selectedNodeId) : null;

  // Build a map of upstream sources for the selected node (1 hop back through
  // the edge graph). Used for AI-context inlining.
  const upstream = useMemo(() => {
    if (!node) return [];
    const incoming = flow.edges.filter((e) => e.target === node.id).map((e) => e.source);
    return incoming.map((id) => flow.nodes.find((n) => n.id === id)).filter(Boolean);
  }, [node, flow.edges, flow.nodes]);

  return (
    <aside className="w-[320px] shrink-0 border-l border-slate-800 bg-slate-950 flex flex-col">
      <header className="px-4 py-3 border-b border-slate-800">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Inspector
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
          {node ? "Configure the selected node." : "Drop a node, then click it to configure."}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
        {!node ? (
          <Cheatsheet />
        ) : node.type === "source" ? (
          <SourceInspector
            node={node}
            zones={zones}
            savedProperties={savedProperties}
            savedRecsByZone={savedRecsByZone}
          />
        ) : node.type === "ai" ? (
          <AIInspector
            node={node}
            upstream={upstream}
            zones={zones}
            savedProperties={savedProperties}
            savedRecsByZone={savedRecsByZone}
            running={runningNodeId === node.id}
            onChange={(patch) => onChange({
              ...flow,
              nodes: flow.nodes.map((n) => n.id === node.id ? { ...n, data: { ...n.data, ...patch } } : n),
            })}
            onRunCompare={onRunCompare}
            onRunTool={onRunTool}
          />
        ) : (
          <ToolInspector
            node={node}
            iCase={iCase}
            upstream={upstream}
            onChange={(patch) => onChange({
              ...flow,
              nodes: flow.nodes.map((n) => n.id === node.id ? { ...n, data: { ...n.data, ...patch } } : n),
            })}
          />
        )}
      </div>
    </aside>
  );
}

// ---- Cheatsheet ---------------------------------------------------------

function Cheatsheet() {
  return (
    <div className="space-y-3 text-[11.5px] text-slate-300 leading-relaxed">
      <Step n="1" title="Drag a Source">
        From the left tab "<strong className="text-amber-300">Saved Properties</strong>" or
        "<strong className="text-cyan-300">Saved Recommendations</strong>", drag any card onto
        the canvas.
      </Step>
      <Step n="2" title="Add a Tool">
        Switch to the <strong className="text-purple-300">Tools</strong> tab and drag a
        Trigger / Action / AI node next to your source.
      </Step>
      <Step n="3" title="Connect them">
        Click the <strong className="text-cyan-300">+</strong> handle on a node's right edge,
        then click another node to draw a connection.
      </Step>
      <Step n="4" title="Branch the flow">
        Drop a <strong>Condition</strong> node in the middle (e.g. "If/else filter") to send
        the flow down different paths.
      </Step>
      <Step n="5" title="Talk to AI">
        Drop the <strong className="text-emerald-300">AI Chat</strong> node and connect any
        sources to its left port. Selecting it opens a chat scoped to those items.
      </Step>
    </div>
  );
}
function Step({ n, title, children }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/40 p-2.5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-900 font-bold text-[11px] flex items-center justify-center">{n}</span>
        <span className="text-[12px] font-semibold text-slate-100">{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ---- Source inspector ---------------------------------------------------

function SourceInspector({ node, zones, savedProperties, savedRecsByZone }) {
  const family = NODE_FAMILY_META.source;
  let detail = null;

  if (node.kind === "zone") {
    const z = zones.find((x) => x.id === node.refId);
    const zoneIdx = zones.findIndex((x) => x.id === node.refId);
    if (z) {
      // Count what's inside this zone — properties favourited that fall in
      // its radius, plus recommendations saved against it.
      const recs = savedRecsByZone[z.id] || [];
      const propsInside = savedProperties.filter(
        (p) => typeof p.lat === "number" && typeof p.lng === "number"
          && (((p.lat - z.lat) ** 2 + (p.lng - z.lng) ** 2) ** 0.5 * 111000) <= z.radius,
      );
      detail = (
        <div className="space-y-1.5">
          <Row label="Zone" value={`Zone ${zoneIdx + 1}`} accent />
          <Row label="Label" value={z.label || "—"} />
          {z.addressLabel ? <Row label="Address" value={z.addressLabel} /> : null}
          <Row label="Radius" value={`${(z.radius / 1000).toFixed(2)} km`} mono />
          <div className="pt-2 border-t border-slate-800">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
              Whole-zone contents
            </div>
            <ul className="text-[11px] text-slate-200 space-y-0.5">
              <li>🏠 {propsInside.length} saved properties</li>
              <li>★ {recs.length} saved recommendations</li>
            </ul>
            <div className="text-[10px] text-slate-500 italic mt-2 leading-snug">
              When connected to a tool, the tool acts on ALL of the above at once.
            </div>
          </div>
        </div>
      );
    }
  } else if (node.kind === "property") {
    const p = savedProperties.find((x) => x.id === node.refId);
    if (p) {
      detail = (
        <div className="space-y-1.5">
          <Row label="Building" value={p.building || "—"} />
          <Row label="Area" value={p.area || "—"} />
          <Row label="Type" value={`${p.type}${p.listing ? ` · ${p.listing}` : ""}`} />
          <Row label="Beds / Baths" value={`${p.beds || "Studio"} BR · ${p.baths || 1} bath`} />
          <Row label="Size" value={`${Number(p.area_sqft || 0).toLocaleString()} ft²`} />
          <Row
            label="Price"
            value={p.listing === "rent"
              ? `AED ${Number(p.price).toLocaleString()}/yr`
              : `AED ${Number(p.price).toLocaleString()}`}
            accent
          />
          <Row label="Coords" value={`${Number(p.lat).toFixed(4)}, ${Number(p.lng).toFixed(4)}`} mono />
        </div>
      );
    }
  } else if (node.kind === "recommendation") {
    const zoneList = savedRecsByZone[node.data?.zoneId] || [];
    const r = zoneList.find((x) => x.id === node.refId);
    const zoneIdx = zones.findIndex((z) => z.id === node.data?.zoneId);
    if (r) {
      detail = (
        <div className="space-y-1.5">
          <Row label="Street" value={r.street} />
          <Row label="Tier" value={`${r.tier?.toUpperCase()}  ·  score ${Math.round(r.score)}`} accent />
          {r.highway ? <Row label="Highway" value={r.highway} /> : null}
          <Row label="From" value={zoneIdx >= 0 ? `Zone ${zoneIdx + 1}` : "—"} />
          {r.summary ? (
            <div className="text-[11px] text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
              {r.summary}
            </div>
          ) : null}
          {r.reason ? (
            <div className="text-[10.5px] text-slate-400 leading-relaxed pt-2 border-t border-slate-800">
              <strong className="text-amber-300">Why this spot:</strong> {r.reason}
            </div>
          ) : null}
        </div>
      );
    }
  }

  return (
    <div>
      <SectionHeader color={family.color} label={family.label} icon={family.icon} title={node.data?.label || node.kind} />
      {detail || (
        <div className="text-[11px] text-slate-500 italic">
          Source item not found. It may have been removed from favourites — delete this node
          and drag a fresh one in.
        </div>
      )}
    </div>
  );
}

// ---- Tool inspector (generic config) ------------------------------------

function ToolInspector({ node, iCase, upstream, onChange }) {
  const tool = TOOL_NODES_BY_KIND[node.kind];
  const family = NODE_FAMILY_META[node.type] || NODE_FAMILY_META.action;
  if (!tool) {
    return (
      <div className="text-[11.5px] text-red-300 leading-snug">
        Unknown tool kind: <code className="text-slate-400">{node.kind}</code>. Delete this
        node and re-drop it from the sidebar.
      </div>
    );
  }
  return (
    <div>
      <SectionHeader color={family.color} label={family.label} icon={tool.icon} title={tool.label} />
      <p className="text-[11.5px] text-slate-300 leading-relaxed mb-3">{tool.description}</p>

      {/* Type-specific config — small forms, all auto-save via onChange */}
      <div className="space-y-2.5">
        {node.kind === "trigger_price_change" ? (
          <>
            <SelectField label="Direction" value={node.data.direction || "any"} onChange={(v) => onChange({ direction: v })}
              options={[
                { value: "any", label: "Any change" },
                { value: "up",  label: "Only price up" },
                { value: "down",label: "Only price down" },
              ]} />
            <NumberField label="Minimum change %" value={node.data.minDeltaPct ?? 2} onChange={(v) => onChange({ minDeltaPct: v })} />
          </>
        ) : null}

        {node.kind === "trigger_schedule" ? (
          <>
            <SelectField label="Cadence" value={node.data.cadence || "daily"} onChange={(v) => onChange({ cadence: v })}
              options={[
                { value: "daily",  label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "hourly", label: "Hourly" },
              ]} />
            <TextField label="Time" value={node.data.time || "09:00"} onChange={(v) => onChange({ time: v })} placeholder="HH:MM" />
          </>
        ) : null}

        {node.kind === "condition_filter" ? (
          <>
            <SelectField label="Field" value={node.data.field || "price"} onChange={(v) => onChange({ field: v })}
              options={[
                { value: "price", label: "Price" },
                { value: "beds",  label: "Bedrooms" },
                { value: "area_sqft", label: "Size (sqft)" },
                { value: "score", label: "Recommendation score" },
              ]} />
            <SelectField label="Operator" value={node.data.op || "<"} onChange={(v) => onChange({ op: v })}
              options={[
                { value: "<",  label: "< (less than)" },
                { value: "<=", label: "≤ (at most)" },
                { value: "=",  label: "= (equals)" },
                { value: ">=", label: "≥ (at least)" },
                { value: ">",  label: "> (greater than)" },
              ]} />
            <NumberField label="Value" value={node.data.value ?? 0} onChange={(v) => onChange({ value: v })} />
          </>
        ) : null}

        {node.kind === "condition_compare" ? (
          <>
            <SelectField label="Metric" value={node.data.metric || "price"} onChange={(v) => onChange({ metric: v })}
              options={[
                { value: "price", label: "Price" },
                { value: "area_sqft", label: "Size (sqft)" },
                { value: "score", label: "Score" },
              ]} />
            <SelectField label="A is …" value={node.data.op || ">"} onChange={(v) => onChange({ op: v })}
              options={[
                { value: ">",  label: "greater than B" },
                { value: "<",  label: "less than B" },
                { value: "=",  label: "equal to B" },
              ]} />
            <div className="text-[10px] text-slate-500 italic">Connect two sources to the "a" and "b" inputs.</div>
          </>
        ) : null}

        {node.kind === "action_notify_me" ? (
          <SelectField label="Channel" value={node.data.channel || "push"} onChange={(v) => onChange({ channel: v })}
            options={[
              { value: "push",  label: "Push notification" },
              { value: "email", label: "Email" },
              { value: "sms",   label: "SMS" },
            ]} />
        ) : null}

        {node.kind === "action_notify_customer" ? (
          <>
            <TextField label="Persona key" value={node.data.personaKey || ""} onChange={(v) => onChange({ personaKey: v })}
              placeholder="e.g. buyer_marina" />
            <TextField multiline label="Message template" value={node.data.template || ""} onChange={(v) => onChange({ template: v })}
              placeholder="Hi {{name}}, your saved property has updated…" />
          </>
        ) : null}

        {node.kind === "action_generate_report" ? (
          <TextField label="Report title" value={node.data.title || ""} onChange={(v) => onChange({ title: v })}
            placeholder="Market update" />
        ) : null}

        {node.kind === "action_create_task" ? (
          <NumberField label="Due in (days)" value={node.data.dueInDays ?? 1} onChange={(v) => onChange({ dueInDays: v })} />
        ) : null}

        {node.kind === "ai_analysis" ? (
          <TextField multiline label="Analysis prompt" value={node.data.prompt || ""} onChange={(v) => onChange({ prompt: v })}
            placeholder="Analyse the connected items and recommend the best for…" />
        ) : null}
      </div>

      <UpstreamSummary upstream={upstream} />
    </div>
  );
}

// ---- AI inspector (interactive chat) ------------------------------------

function AIInspector({ node, upstream, zones, savedProperties, savedRecsByZone, running, onChange, onRunCompare, onRunTool }) {
  const family = NODE_FAMILY_META.ai;
  const tool = TOOL_NODES_BY_KIND[node.kind];

  // AI Compare gets a dedicated "Run" surface (the headline tool).
  if (node.kind === "ai_compare") {
    return (
      <CompareInspector
        node={node}
        upstream={upstream}
        zones={zones}
        savedProperties={savedProperties}
        savedRecsByZone={savedRecsByZone}
        running={running}
        onRunCompare={onRunCompare}
      />
    );
  }

  // The 4 new featured tools share a common run UI — header + tool-specific
  // config form + last-result preview + Run button.
  if (
    node.kind === "ai_find_property"
    || node.kind === "ai_analyze_business"
    || node.kind === "ai_suggest_business"
    || node.kind === "ai_vending_finder"
    || node.kind === "ai_analysis"
  ) {
    return (
      <RunnableAIInspector
        node={node}
        upstream={upstream}
        running={running}
        onChange={onChange}
        onRunTool={onRunTool}
      />
    );
  }

  // Other AI tools fall back to the generic config form (e.g. ai_chat handled below).
  if (node.kind !== "ai_chat") {
    return <ToolInspector node={node} upstream={upstream} onChange={onChange} />;
  }

  return (
    <div>
      <SectionHeader color={family.color} label={family.label} icon="💬" title="AI Chat" />
      <p className="text-[11.5px] text-slate-300 leading-relaxed mb-3">
        Ask any question about the items connected to this chat. The connected
        sources are inlined as context, so answers stay grounded in YOUR data.
      </p>
      <UpstreamSummary upstream={upstream} />
      <ChatSurface
        node={node}
        upstream={upstream}
        zones={zones}
        savedProperties={savedProperties}
        savedRecsByZone={savedRecsByZone}
      />
    </div>
  );
}

// ---- Runnable AI inspector (Find / Analyse / Suggest / Vending) --------
//
// Shared shell for the 4 featured non-Compare AI tools. Each has a small
// instructions block + a kind-specific config form + a Run button. The
// last-result text is shown inline so the agent can see what came back
// without re-opening the canvas node.

function RunnableAIInspector({ node, upstream, running, onChange, onRunTool }) {
  const tool = TOOL_NODES_BY_KIND[node.kind];
  const family = NODE_FAMILY_META.ai;
  const lastResult = node.data?.lastResult;
  const lastRunAt = node.data?.lastRunAt;

  // Minimum-inputs check per tool — gives the user a clear "need to connect X"
  // hint when they haven't wired anything up yet.
  const upstreamCount = upstream.length;
  const ready = upstreamCount >= 1;

  // Voice mic for the brief field on ai_find_property — uses Web Speech API.
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  // Translation surface for the last-result preview at the bottom.
  const [resultShown, setResultShown] = useState(lastResult || "");
  const [resultRtl, setResultRtl] = useState(false);
  useEffect(() => { setResultShown(lastResult || ""); setResultRtl(false); }, [lastResult]);
  function startVoice() {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input isn't supported in this browser. Type your brief instead."); return; }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript || "";
      const prev = (node.data?.brief || "").trim();
      onChange({ brief: prev ? `${prev} ${text}` : text });
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  }
  function stopVoice() {
    try { recRef.current?.stop(); } catch {/* ignore */}
    setListening(false);
  }

  return (
    <div>
      <SectionHeader color={family.color} label="AI · Featured" icon={tool?.icon || "🤖"} title={tool?.label || node.kind} />
      <p className="text-[11.5px] text-slate-300 leading-relaxed mb-3">{tool?.description}</p>

      {/* How-to instructions */}
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5 mb-3 text-[11px] text-slate-200 leading-relaxed">
        {howToFor(node.kind)}
      </div>

      {/* Inputs status */}
      <div className="rounded border border-slate-700 bg-slate-900/40 p-2.5 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Connected · {upstreamCount}
          </span>
          <span className={`text-[10px] uppercase tracking-wider font-semibold ${ready ? "text-emerald-400" : "text-amber-400"}`}>
            {ready ? "Ready" : "Connect ≥ 1"}
          </span>
        </div>
        {upstreamCount === 0 ? (
          <div className="text-[10.5px] text-slate-500 italic leading-snug">
            Nothing connected yet. Wire a zone, property or business into this node's left port.
          </div>
        ) : (
          <ul className="space-y-1">
            {upstream.map((u, i) => (
              <li key={u.id} className="flex items-center gap-2 text-[10.5px] text-slate-200">
                <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ background: u.data?.color || "#64748b", color: "#0f172a" }}>
                  {i + 1}
                </span>
                <span className="truncate flex-1">{u.data?.label || u.kind}</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider shrink-0">{u.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Kind-specific config */}
      {node.kind === "ai_find_property" ? (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-semibold">
              Buyer brief (criteria)
            </span>
            <button
              type="button"
              onClick={listening ? stopVoice : startVoice}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                listening
                  ? "border-red-500/50 bg-red-500/20 text-red-200 animate-pulse"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
              }`}
              title="Dictate the brief by voice"
            >
              {listening ? "🎙 Listening… stop" : "🎙 Speak"}
            </button>
          </div>
          <textarea
            value={node.data?.brief || ""}
            onChange={(e) => onChange({ brief: e.target.value })}
            rows={4}
            placeholder="e.g. 1-bed apartment with sea view, low floor (≤ 5), 2 baths, away from construction noise, near a bus station."
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-[11.5px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-y"
          />
        </div>
      ) : null}

      {node.kind === "ai_vending_finder" ? (
        <div className="mb-3">
          <SelectField
            label="Preferred machine category (or auto)"
            value={node.data?.preferred || "auto"}
            onChange={(v) => onChange({ preferred: v })}
            options={[
              { value: "auto",        label: "Auto — let AI suggest" },
              { value: "snacks",      label: "Snacks + cold drinks" },
              { value: "hot_drinks",  label: "Hot drinks + pastries" },
              { value: "fresh",       label: "Fresh food" },
              { value: "ppe",         label: "PPE + pharmacy basics" },
              { value: "ice_cream",   label: "Ice cream / frozen" },
            ]}
          />
        </div>
      ) : null}

      {node.kind === "ai_analysis" ? (
        <div className="mb-3">
          <TextField
            multiline
            label="Analysis prompt"
            value={node.data?.prompt || ""}
            onChange={(v) => onChange({ prompt: v })}
            placeholder="Analyse the connected items and recommend the best for…"
          />
        </div>
      ) : null}

      {/* Run button */}
      <button
        type="button"
        onClick={() => ready && !running && onRunTool?.(node.id)}
        disabled={!ready || running}
        className={`w-full text-[12px] font-semibold px-3 py-2.5 rounded transition ${
          running
            ? "bg-slate-800 text-slate-400 cursor-progress"
            : ready
              ? "bg-amber-500 hover:bg-amber-400 text-slate-900"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
        }`}
      >
        {running ? "⏳ Working… the tool node is pulsing on the canvas" : ready ? "▶ Run" : "Connect at least one source to enable"}
      </button>

      {lastRunAt ? (
        <div className="mt-2 text-[10px] text-slate-500 text-center">
          Last run {new Date(lastRunAt).toLocaleString()}
        </div>
      ) : null}

      {/* Last result preview — with EN/AR/FA translate buttons */}
      {lastResult ? (
        <div className="mt-3 rounded border border-slate-700 bg-slate-900/50 p-2.5">
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <div className="text-[9.5px] uppercase tracking-wider text-slate-400 font-semibold">
              Last result
            </div>
            <TranslateButtons
              text={lastResult}
              onTranslated={(t, _lang, isRtl) => { setResultShown(t); setResultRtl(isRtl); }}
              compact
            />
          </div>
          <div
            dir={resultRtl ? "rtl" : "ltr"}
            className="text-[11.5px] text-slate-200 leading-relaxed max-h-72 overflow-y-auto scrollbar-thin whitespace-pre-wrap"
          >
            {resultShown}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function howToFor(kind) {
  switch (kind) {
    case "ai_find_property":
      return (
        <>
          📋 <strong>How to use:</strong> connect 1+ <em>whole zones</em> to this tool's left port,
          type or speak your buyer brief in the box below, then tap <strong className="text-amber-300">Run</strong>.
          The AI ranks the best matching properties from inside those zones.
        </>
      );
    case "ai_analyze_business":
      return (
        <>
          📋 <strong>How to use:</strong> connect a saved <em>business</em> (or a whole zone containing
          businesses) to this tool, then tap <strong className="text-amber-300">Run</strong>. The AI
          analyses the concept against its location and the zone's character.
        </>
      );
    case "ai_suggest_business":
      return (
        <>
          📋 <strong>How to use:</strong> connect 1+ <em>whole zones</em> to this tool, then tap
          <strong className="text-amber-300"> Run</strong>. The AI returns a ranked list of the
          strongest business concepts to open there, with rationale and risk.
        </>
      );
    case "ai_vending_finder":
      return (
        <>
          📋 <strong>How to use:</strong> connect 1+ <em>whole zones</em>, optionally pick a
          machine category below, then tap <strong className="text-amber-300">Run</strong>. The AI
          lists the best streets/spots in the zone and recommends a vending-machine model for each.
        </>
      );
    case "ai_analysis":
    default:
      return (
        <>
          📋 <strong>How to use:</strong> connect any sources, write your analysis prompt below,
          then tap <strong className="text-amber-300">Run</strong>.
        </>
      );
  }
}

// ---- AI Compare — the headline tool ------------------------------------

function CompareInspector({ node, upstream, zones, savedProperties, savedRecsByZone, running, onRunCompare }) {
  const family = NODE_FAMILY_META.ai;
  const enough = upstream.length >= 2;
  const lastRunAt = node.data?.lastRunAt;

  function buildContextLines() {
    const lines = [];
    upstream.forEach((u) => {
      if (u.kind === "property") {
        const p = savedProperties.find((x) => x.id === u.refId);
        if (!p) { lines.push(`[property missing]`); return; }
        lines.push(
          `PROPERTY "${p.title}" — ${p.building || ""}${p.area ? `, ${p.area}` : ""}. Type: ${p.type}. ${p.beds || "Studio"} BR / ${p.baths || 1} bath, ${Number(p.area_sqft || 0).toLocaleString()} ft². ${p.listing === "rent" ? `Rent AED ${Number(p.price).toLocaleString()}/year` : `Sale AED ${Number(p.price).toLocaleString()}`}.`,
        );
      } else if (u.kind === "recommendation") {
        const list = savedRecsByZone[u.data?.zoneId] || [];
        const r = list.find((x) => x.id === u.refId);
        const zIdx = zones.findIndex((z) => z.id === u.data?.zoneId);
        if (!r) { lines.push(`[recommendation missing]`); return; }
        lines.push(
          `RECOMMENDATION "${r.street}" from Zone ${zIdx + 1} — tier ${r.tier?.toUpperCase()}, score ${Math.round(r.score)}. ${r.summary || ""}${r.reason ? ` Why: ${r.reason}` : ""}`,
        );
      } else if (u.kind === "zone") {
        // Expand a whole-zone source into one line per saved item inside it,
        // so the AI's report reasons over every property + recommendation.
        const z = zones.find((x) => x.id === u.refId);
        const zIdx = zones.findIndex((x) => x.id === u.refId);
        if (!z) { lines.push(`[zone missing]`); return; }
        const propsInside = savedProperties.filter(
          (p) => typeof p.lat === "number" && typeof p.lng === "number"
            && (((p.lat - z.lat) ** 2 + (p.lng - z.lng) ** 2) ** 0.5 * 111000) <= z.radius,
        );
        const recs = savedRecsByZone[z.id] || [];
        lines.push(`ZONE "${z.label || `Zone ${zIdx + 1}`}" (radius ${(z.radius / 1000).toFixed(2)} km) — whole-zone source. Items inside:`);
        propsInside.forEach((p) => lines.push(
          `  • Property "${p.title}" — ${p.type}, ${p.beds || "Studio"} BR, ${Number(p.area_sqft || 0).toLocaleString()} ft², ${p.listing === "rent" ? `AED ${Number(p.price).toLocaleString()}/yr` : `AED ${Number(p.price).toLocaleString()}`}`,
        ));
        recs.forEach((r) => lines.push(
          `  • Recommendation "${r.street}" — tier ${r.tier?.toUpperCase()}, score ${Math.round(r.score)}`,
        ));
        if (propsInside.length === 0 && recs.length === 0) {
          lines.push("  (zone has no saved items yet)");
        }
      } else {
        lines.push(`${u.kind} node`);
      }
    });
    // Number every line for the prompt
    return lines.map((l, i) => `${i + 1}. ${l}`);
  }

  async function handleRun() {
    if (!enough || running) return;
    const lines = buildContextLines();
    await onRunCompare?.(node.id, lines);
  }

  return (
    <div>
      <SectionHeader color={family.color} label="AI · Featured" icon="⚖️" title="AI Compare (Pro report)" />

      {/* How-to instructions */}
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5 mb-3">
        <div className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold mb-1.5">
          📋 How to use
        </div>
        <ol className="text-[11px] text-slate-200 leading-relaxed space-y-1 list-decimal list-inside">
          <li>Drag <strong>2 or more</strong> saved Properties or Recommendations onto the canvas from the left sidebar.</li>
          <li>On each source, click the <strong className="text-cyan-300">+</strong> port on its right edge.</li>
          <li>Then click <strong>this Compare node</strong> to draw a connecting line into it.</li>
          <li>Repeat for every item you want to compare.</li>
          <li>Click <strong className="text-amber-300">Run AI Comparison</strong> below.</li>
        </ol>
      </div>

      {/* Connected items summary */}
      <div className="rounded border border-slate-700 bg-slate-900/40 p-2.5 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Items wired in · {upstream.length}
          </span>
          <span className={`text-[10px] uppercase tracking-wider font-semibold ${
            enough ? "text-emerald-400" : "text-amber-400"
          }`}>
            {enough ? "Ready" : "Need ≥ 2"}
          </span>
        </div>
        {upstream.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic leading-snug">
            Nothing connected yet. Wire saved properties or recommendations into this node's left port.
          </div>
        ) : (
          <ul className="space-y-1">
            {upstream.map((u, i) => (
              <li key={u.id} className="flex items-center gap-2 text-[11px] text-slate-200">
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ background: u.data?.color || "#64748b", color: "#0f172a" }}>
                  {i + 1}
                </span>
                <span className="truncate">{u.data?.label || u.kind}</span>
                <span className="text-[9.5px] text-slate-500 uppercase tracking-wider shrink-0">
                  {u.kind}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Run button */}
      <button
        type="button"
        onClick={handleRun}
        disabled={!enough || running}
        className={`w-full text-[12px] font-semibold px-3 py-2.5 rounded transition ${
          running
            ? "bg-slate-800 text-slate-400 cursor-progress"
            : enough
              ? "bg-amber-500 hover:bg-amber-400 text-slate-900"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
        }`}
      >
        {running
          ? "⏳ AI is comparing… the tool node is pulsing on the canvas"
          : enough
            ? `▶ Run AI Comparison · ${upstream.length} items`
            : `Connect ${2 - upstream.length} more item${2 - upstream.length === 1 ? "" : "s"} to enable`}
      </button>

      {/* Last-run timestamp + re-open last report */}
      {lastRunAt ? (
        <div className="mt-2 text-[10px] text-slate-500 text-center">
          Last run {new Date(lastRunAt).toLocaleString()}
        </div>
      ) : null}
    </div>
  );
}

function ChatSurface({ node, upstream, zones, savedProperties, savedRecsByZone }) {
  const [history, setHistory] = useState([]); // [{ role, text }]
  const [draft, setDraft] = useState(node.data?.seedQuestion || "");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history.length, busy]);

  function buildContextBlock() {
    if (upstream.length === 0) {
      return "(No sources connected. Drop a saved property or recommendation onto the canvas and connect it to this chat's left port for grounded answers.)";
    }
    const lines = upstream.map((u, i) => {
      if (u.kind === "property") {
        const p = savedProperties.find((x) => x.id === u.refId);
        if (!p) return `${i + 1}. [property missing]`;
        return `${i + 1}. Property "${p.title}" — ${p.building}, ${p.area}. ${p.beds || "Studio"} BR / ${p.baths || 1} bath, ${Number(p.area_sqft || 0).toLocaleString()} ft². ${p.listing === "rent" ? `AED ${Number(p.price).toLocaleString()}/year` : `AED ${Number(p.price).toLocaleString()}`}.`;
      }
      if (u.kind === "recommendation") {
        const zoneList = savedRecsByZone[u.data?.zoneId] || [];
        const r = zoneList.find((x) => x.id === u.refId);
        const zIdx = zones.findIndex((z) => z.id === u.data?.zoneId);
        if (!r) return `${i + 1}. [recommendation missing]`;
        return `${i + 1}. Recommendation "${r.street}" from Zone ${zIdx + 1} — tier ${r.tier?.toUpperCase()}, score ${Math.round(r.score)}. ${r.summary || ""}`;
      }
      return `${i + 1}. ${u.kind} node`;
    });
    return lines.join("\n");
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    const userMsg = { role: "user", text };
    setHistory((h) => [...h, userMsg]);
    setDraft("");

    const context = buildContextBlock();
    const composed = `Context for this question:\n${context}\n\nQuestion: ${text}`;

    // Call /api/agent-chat with a default persona. If the LLM is unreachable,
    // the route returns a templated fallback so the chat still feels alive.
    try {
      const res = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaKey: DEFAULT_AI_PERSONA,
          messages: [
            ...history.map((m) => ({ role: m.role, content: m.text })),
            { role: "user", content: composed },
          ],
        }),
      });
      const data = await res.json();
      const reply = data?.text || "(No response — try again or check your OPENROUTER_API_KEY.)";
      setHistory((h) => [...h, { role: "assistant", text: reply }]);
    } catch (e) {
      setHistory((h) => [...h, { role: "assistant", text: "Network error — please retry once your connection is back." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-emerald-500/30 bg-slate-900/60 overflow-hidden">
      <div ref={scrollRef} className="max-h-72 min-h-[140px] overflow-y-auto scrollbar-thin px-3 py-2 space-y-2">
        {history.length === 0 ? (
          <div className="text-[11px] text-slate-500 italic">
            Ask something like "Which one is the better long-term investment?" or "Draft a
            client message comparing these two".
          </div>
        ) : (
          history.map((m, i) => (
            <div key={i} className={`text-[11.5px] leading-relaxed ${m.role === "user" ? "text-slate-100" : "text-emerald-200"}`}>
              <span className="text-[9.5px] uppercase tracking-wider opacity-60 mr-1">{m.role === "user" ? "You" : "AI"}:</span>
              {m.text}
            </div>
          ))
        )}
        {busy ? (
          <div className="text-[11px] text-emerald-300/80 italic">AI is thinking…</div>
        ) : null}
      </div>
      <div className="border-t border-emerald-500/30 bg-slate-950 p-2 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask the AI anything about the connected items…"
          disabled={busy}
          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-[11.5px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !draft.trim()}
          className="text-[11px] px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ---- Small shared bits --------------------------------------------------

function SectionHeader({ color, label, icon, title }) {
  return (
    <div className="mb-2">
      <div className="text-[9.5px] uppercase tracking-[0.15em] font-semibold" style={{ color }}>
        {icon} {label}
      </div>
      <div className="text-sm font-semibold text-slate-100 mt-0.5 truncate">{title}</div>
    </div>
  );
}

function Row({ label, value, accent, mono }) {
  return (
    <div className="flex items-baseline gap-2 text-[11px]">
      <span className="text-slate-500 w-20 shrink-0 uppercase tracking-wider text-[9.5px]">{label}</span>
      <span className={`flex-1 ${accent ? "text-amber-300 font-semibold" : "text-slate-200"} ${mono ? "tabular-nums" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, multiline }) {
  const Cmp = multiline ? "textarea" : "input";
  return (
    <label className="block">
      <div className="text-[9.5px] uppercase tracking-wider text-slate-400 font-semibold mb-1">{label}</div>
      <Cmp
        type={multiline ? undefined : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={multiline ? 3 : undefined}
        placeholder={placeholder}
        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-[11.5px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-y"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="block">
      <div className="text-[9.5px] uppercase tracking-wider text-slate-400 font-semibold mb-1">{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-[11.5px] text-slate-100 focus:outline-none focus:border-amber-500"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-[9.5px] uppercase tracking-wider text-slate-400 font-semibold mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-[11.5px] text-slate-100 focus:outline-none focus:border-amber-500"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function UpstreamSummary({ upstream }) {
  if (upstream.length === 0) {
    return (
      <div className="mt-3 text-[10.5px] text-slate-500 italic leading-relaxed border-t border-slate-800 pt-2">
        Tip: connect a source (saved property / recommendation) to this node's left port to
        give it data.
      </div>
    );
  }
  return (
    <div className="mt-3 border-t border-slate-800 pt-2">
      <div className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
        Connected inputs · {upstream.length}
      </div>
      <div className="space-y-1">
        {upstream.map((u) => (
          <div key={u.id} className="text-[10.5px] text-slate-300 truncate">
            • {u.data?.label || u.kind}
          </div>
        ))}
      </div>
    </div>
  );
}
