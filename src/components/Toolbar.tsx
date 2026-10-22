import { Check, CircleAlert, Cuboid, Eye, Grid2x2, Magnet, PencilRuler, Redo2, Save, Undo2 } from "lucide-react";
import { useState } from "react";
import { saveNow } from "../store/autosave";
import { useEditor } from "../store/editorStore";
import { Segmented } from "./ui/Segmented";

const SNAP_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 0.01, label: "1 cm" },
  { value: 0.05, label: "5 cm" },
  { value: 0.1, label: "10 cm" },
];

function ProjectName() {
  const name = useEditor((s) => s.projectName);
  const setName = useEditor((s) => s.setProjectName);
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className="project-name"
      aria-label="Project name"
      value={draft ?? name}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => {
        if (draft !== null) setName(draft);
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(null);
          requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
        }
      }}
    />
  );
}

function SaveIndicator() {
  const status = useEditor((s) => s.saveStatus);
  const at = useEditor((s) => s.lastSavedAt);
  const time = at ? new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className="save">
      <span className={`save__status save__status--${status}`} aria-live="polite">
        {status === "saved" && (
          <>
            <Check size={13} strokeWidth={2.2} /> {time ? `Saved ${time}` : "All changes saved"}
          </>
        )}
        {status === "unsaved" && "Saving…"}
        {status === "error" && (
          <>
            <CircleAlert size={13} strokeWidth={2.2} /> Couldn’t save
          </>
        )}
      </span>
      <button type="button" className="btn btn--primary" onClick={saveNow} title="Save now (Ctrl+S)">
        <Save size={15} strokeWidth={1.8} />
        <span>Save</span>
      </button>
    </div>
  );
}

export function Toolbar() {
  const mode = useEditor((s) => s.mode);
  const view = useEditor((s) => s.view);
  const setMode = useEditor((s) => s.setMode);
  const setView = useEditor((s) => s.setView);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const snapStep = useEditor((s) => s.snapStep);
  const setSnapStep = useEditor((s) => s.setSnapStep);

  return (
    <header className="toolbar">
      <div className="toolbar__group toolbar__brand">
        <svg className="logo" viewBox="0 0 32 32" width="28" height="28" aria-hidden>
          <rect width="32" height="32" rx="8" fill="var(--text)" />
          <path d="M8 22V12l8-4 8 4v10" fill="none" stroke="#e8cfa6" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 22v-5h8v5" fill="none" stroke="#e8cfa6" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <span className="brand-name">Room Atelier</span>
        <span className="toolbar__divider" aria-hidden />
        <ProjectName />
      </div>

      <div className="toolbar__group toolbar__center">
        <Segmented
          label="Mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "edit", label: "Edit", icon: PencilRuler, hint: "Edit with precision (P)" },
            { value: "preview", label: "Preview", icon: Eye, hint: "Design with warmth (P)" },
          ]}
        />
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: "perspective", label: "3D", icon: Cuboid, hint: "Perspective view (1)" },
            { value: "top", label: "Plan", icon: Grid2x2, hint: "Top-down plan (2)" },
          ]}
        />
      </div>

      <div className="toolbar__group toolbar__actions">
        <button type="button" className="icon-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
          <Undo2 size={17} strokeWidth={1.8} />
        </button>
        <button type="button" className="icon-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
          <Redo2 size={17} strokeWidth={1.8} />
        </button>
        <label className={`snap${snapStep > 0 ? " is-on" : ""}`} title="Snap to grid and walls while dragging (hold Alt to move freely)">
          <Magnet size={15} strokeWidth={1.8} />
          <span className="sr-only">Snap</span>
          <select value={snapStep} onChange={(e) => setSnapStep(Number(e.target.value))}>
            {SNAP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <span className="toolbar__divider" aria-hidden />
        <SaveIndicator />
      </div>
    </header>
  );
}
