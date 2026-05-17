"use client";

// Left rail of the i-Case workspace — now a TOOLS-ONLY palette. The zones
// moved to the horizontal ribbon at the top of the canvas (FlowZoneRibbon),
// which is where the agent picks zones / whole-zone / individual properties
// or recommendations and drags them onto the canvas.
//
// The five "featured" tools (AI Compare, AI Find Property, AI Analyse
// Business, AI Suggest Business, AI Vending-Spot Finder) sit at the top in
// their own block. The rest of the catalogue is grouped by family below.

import { TOOL_NODE_LIBRARY, NODE_FAMILY_META } from "@/lib/agent/iCaseFlow";

export default function FlowSidebar() {
  const featured = TOOL_NODE_LIBRARY.filter((t) => t.featured);
  const rest = TOOL_NODE_LIBRARY.filter((t) => !t.featured);

  return (
    <aside className="w-[240px] shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
      <header className="px-3 py-3 border-b border-slate-800">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Tool library
        </div>
        <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
          Drag any tool onto the canvas. Pick zones / properties / businesses
          from the ribbon above the canvas.
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-3">
        {/* FEATURED TOOLS */}
        {featured.length > 0 ? (
          <section>
            <div
              className="text-[9.5px] uppercase tracking-[0.15em] font-semibold mb-1.5 px-1"
              style={{ color: "#fbbf24" }}
            >
              ★ Priority tools
            </div>
            {featured.map((t) => (
              <DraggableCard
                key={t.kind}
                accent="#fbbf24"
                payload={{ nodeKind: "tool", toolKind: t.kind }}
              >
                <div className="px-2 py-1.5 flex items-start gap-2">
                  <span className="text-base shrink-0 leading-none mt-0.5">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11.5px] font-semibold text-amber-100">{t.label}</div>
                    <div className="text-[9.5px] text-slate-400 leading-snug line-clamp-3">
                      {t.description}
                    </div>
                  </div>
                </div>
              </DraggableCard>
            ))}
          </section>
        ) : null}

        {/* OTHER TOOLS by family */}
        {["trigger", "condition", "action", "ai"].map((family) => {
          const tools = rest.filter((t) => t.type === family);
          if (tools.length === 0) return null;
          const meta = NODE_FAMILY_META[family];
          return (
            <section key={family}>
              <div
                className="text-[9.5px] uppercase tracking-[0.15em] font-semibold mb-1.5 px-1"
                style={{ color: meta.color }}
              >
                {meta.icon} {meta.label}
              </div>
              {tools.map((t) => (
                <DraggableCard
                  key={t.kind}
                  accent={meta.color}
                  payload={{ nodeKind: "tool", toolKind: t.kind }}
                >
                  <div className="px-2 py-1.5 flex items-start gap-2">
                    <span className="text-base shrink-0 leading-none mt-0.5">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11.5px] font-semibold text-slate-100">{t.label}</div>
                      <div className="text-[9.5px] text-slate-500 leading-snug line-clamp-2">
                        {t.description}
                      </div>
                    </div>
                  </div>
                </DraggableCard>
              ))}
            </section>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-slate-800 text-[9.5px] text-slate-600 leading-relaxed">
        Tip: click the + on a node's right edge then click another node to connect them.
      </div>
    </aside>
  );
}

// Native HTML5 draggable card — same payload format the FlowCanvas drop
// handler expects.
function DraggableCard({ payload, children, accent }) {
  function handleDragStart(e) {
    try {
      e.dataTransfer.setData("application/x-icase-node", JSON.stringify(payload));
      e.dataTransfer.effectAllowed = "copy";
    } catch {/* ignore */}
  }
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="cursor-grab active:cursor-grabbing rounded-md border bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900 transition mb-1 select-none"
      style={{ borderColor: accent ? `${accent}55` : "#334155" }}
      title="Drag onto the canvas"
    >
      {children}
    </div>
  );
}
