"use client";

// Common Projects view — a workspace for collaborative jobs that span more
// than one agent (e.g. a shared listing campaign, a developer's launch where
// several agents are pulling leads together). MVP placeholder: explains the
// concept and gives a single CTA to create a project (no backend yet).

import { useEffect, useState } from "react";

const STORAGE_KEY = "abox.agent.commonProjects.v1";

function loadProjects() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveProjects(projects) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); } catch {}
}

export default function CommonProjectsView({ zones = [], profile }) {
  const [projects, setProjects] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { setProjects(loadProjects()); setHydrated(true); }, []);

  function handleCreate(payload) {
    const next = [
      ...projects,
      {
        ...payload,
        id: `proj_${Date.now()}`,
        createdAt: Date.now(),
        ownerName: profile?.name || "You",
      },
    ];
    saveProjects(next);
    setProjects(next);
    setShowCreate(false);
  }
  function handleRemove(id) {
    if (!confirm("Delete this common project?")) return;
    const next = projects.filter((p) => p.id !== id);
    saveProjects(next);
    setProjects(next);
  }

  if (!hydrated) {
    return <div className="h-full flex items-center justify-center text-sm text-slate-500">Loading…</div>;
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin px-8 py-7">
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-1">
          Workspace
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Common Project</h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Shared workspaces for collaborations that span more than one agent — joint
          listings, developer launches, area campaigns. Each project bundles the
          working zones and properties involved so the team works against the same
          dataset.
        </p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-slate-300 font-semibold">
          My Projects · {projects.length}
        </h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-[11px] px-3 py-1.5 rounded border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 font-semibold transition"
        >
          + New project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center">
          <div className="text-3xl mb-2">🤝</div>
          <div className="text-sm font-semibold text-slate-200">No common projects yet</div>
          <div className="text-[12px] text-slate-400 mt-1 leading-relaxed max-w-lg mx-auto">
            Spin up a project to share a set of zones / properties / customers with
            a collaborator. (The collaboration handshake is on the roadmap; for now
            projects live in your browser and act as a folder.)
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm transition"
          >
            Create your first project →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              zones={zones}
              onRemove={() => handleRemove(p.id)}
            />
          ))}
        </div>
      )}

      {showCreate ? (
        <CreateProjectModal
          zones={zones}
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      ) : null}
    </div>
  );
}

function ProjectCard({ project, zones, onRemove }) {
  const linkedZones = zones.filter((z) => project.zoneIds?.includes(z.id));
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 hover:border-slate-500 transition p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold">
            {project.kind || "Joint listing"}
          </div>
          <div className="text-sm font-semibold text-slate-100 truncate mt-1">{project.name}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Owner · {project.ownerName} · {new Date(project.createdAt).toLocaleDateString()}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-slate-500 hover:text-red-400 transition text-sm px-1.5"
          title="Delete project"
        >
          ✕
        </button>
      </div>

      {project.description ? (
        <div className="text-[12px] text-slate-300 leading-relaxed mt-2">{project.description}</div>
      ) : null}

      {linkedZones.length > 0 ? (
        <div className="mt-3 pt-2 border-t border-slate-800">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
            Linked zones
          </div>
          <div className="flex flex-wrap gap-1">
            {linkedZones.map((z) => (
              <span key={z.id} className="text-[10.5px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                📍 {z.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {project.collaborators?.length ? (
        <div className="mt-2 text-[11px] text-slate-400">
          With {project.collaborators.join(", ")}
        </div>
      ) : null}
    </div>
  );
}

function CreateProjectModal({ zones, onClose, onSave }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("Joint listing");
  const [description, setDescription] = useState("");
  const [zoneIds, setZoneIds] = useState([]);
  const [collaborators, setCollaborators] = useState("");

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function toggleZone(id) {
    setZoneIds((curr) => curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]);
  }
  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      kind,
      description: description.trim(),
      zoneIds,
      collaborators: collaborators.split(",").map((s) => s.trim()).filter(Boolean),
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="max-w-lg w-full max-h-[90vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-slate-800 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">New common project</h2>
            <div className="text-[11px] text-slate-500 mt-0.5">A shared workspace across zones and agents.</div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-100 text-lg w-7 h-7 rounded hover:bg-slate-800">✕</button>
        </header>

        <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto scrollbar-thin">
          <Field label="Project name *">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={80}
              placeholder="e.g. Marina Heights launch — Q4"
              className="input"
            />
          </Field>
          <Field label="Kind">
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="input">
              <option>Joint listing</option>
              <option>Developer launch</option>
              <option>Area campaign</option>
              <option>Investor portfolio</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder="What's the goal of this project?"
              className="input resize-y"
            />
          </Field>
          <Field label={`Linked zones · ${zoneIds.length}`}>
            {zones.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic">No zones yet. Create one in Working Areas first.</div>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
                {zones.map((z, i) => (
                  <label key={z.id} className="flex items-center gap-2 text-[11.5px] text-slate-200 cursor-pointer py-1 px-1.5 hover:bg-slate-800 rounded">
                    <input type="checkbox" checked={zoneIds.includes(z.id)} onChange={() => toggleZone(z.id)} />
                    <span>📍 Zone {i + 1} · {z.label}</span>
                  </label>
                ))}
              </div>
            )}
          </Field>
          <Field label="Collaborators (comma-separated names)">
            <input
              type="text"
              value={collaborators}
              onChange={(e) => setCollaborators(e.target.value)}
              maxLength={200}
              placeholder="e.g. Aisha, Omar"
              className="input"
            />
          </Field>
        </div>

        <footer className="px-5 py-3 border-t border-slate-800 flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs transition">Cancel</button>
          <button type="submit" disabled={!name.trim()} className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed">Create project</button>
        </footer>

        <style jsx>{`
          .input {
            width: 100%;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 12.5px;
            color: #f1f5f9;
            outline: none;
          }
          .input:focus { border-color: #f59e0b; }
        `}</style>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">{label}</div>
      {children}
    </label>
  );
}
