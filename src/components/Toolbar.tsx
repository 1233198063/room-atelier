import { Check, CircleAlert, Cuboid, Eye, Grid2x2, Languages, Magnet, PencilRuler, Redo2, Ruler, Save, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { setLang, setLengthUnit, useLang, useLength, useName, useT } from "../i18n";
import { LENGTH_UNITS, snapSteps, UNIT_LABELS, type LengthUnit } from "../lib/units";
import { saveNow } from "../store/autosave";
import { useEditor } from "../store/editorStore";
import { Segmented } from "./ui/Segmented";

function ProjectName() {
  const name = useEditor((s) => s.projectName);
  const setName = useEditor((s) => s.setProjectName);
  const [draft, setDraft] = useState<string | null>(null);
  const t = useT();
  const display = useName();
  return (
    <input
      className="project-name"
      aria-label={t.toolbar.projectName}
      value={draft ?? display(name)}
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
  const lang = useLang();
  const t = useT().toolbar;
  const time = at ? new Date(at).toLocaleTimeString(lang === "zh" ? "zh-CN" : "en", { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className="save">
      <span className={`save__status save__status--${status}`} aria-live="polite">
        {status === "saved" && (
          <>
            <Check size={13} strokeWidth={2.2} /> {time ? t.savedAt(time) : t.allSaved}
          </>
        )}
        {status === "unsaved" && t.saving}
        {status === "error" && (
          <>
            <CircleAlert size={13} strokeWidth={2.2} /> {t.saveError}
          </>
        )}
      </span>
      <button type="button" className="btn btn--primary" onClick={saveNow} title={t.saveHint}>
        <Save size={15} strokeWidth={1.8} />
        <span>{t.save}</span>
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
  const lang = useLang();
  const text = useT();
  const t = text.toolbar;
  const len = useLength();
  const steps = useMemo(() => snapSteps(len.unit), [len.unit]);
  // Switching between metric and inches moves the grid to the nearest step of the new system.
  useEffect(() => {
    if (snapStep > 0 && !steps.includes(snapStep)) {
      setSnapStep(steps.reduce((best, s) => (Math.abs(s - snapStep) < Math.abs(best - snapStep) ? s : best)));
    }
  }, [snapStep, steps, setSnapStep]);

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
          label={t.mode}
          value={mode}
          onChange={setMode}
          options={[
            { value: "edit", label: t.edit, icon: PencilRuler, hint: t.editHint },
            { value: "preview", label: t.preview, icon: Eye, hint: t.previewHint },
          ]}
        />
        <Segmented
          label={t.view}
          value={view}
          onChange={setView}
          options={[
            { value: "perspective", label: t.perspective, icon: Cuboid, hint: t.perspectiveHint },
            { value: "top", label: t.plan, icon: Grid2x2, hint: t.planHint },
          ]}
        />
      </div>

      <div className="toolbar__group toolbar__actions">
        <button
          type="button"
          className="lang-btn"
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          title={text.language.switchHint}
          lang={lang === "zh" ? "en" : "zh-CN"}
        >
          <Languages size={15} strokeWidth={1.8} />
          <span>{text.language.switchTo}</span>
        </button>
        <label className="unit-select" title={t.unit}>
          <Ruler size={15} strokeWidth={1.8} />
          <span className="sr-only">{t.unit}</span>
          <select value={len.unit} onChange={(e) => setLengthUnit(e.target.value as LengthUnit)}>
            {LENGTH_UNITS.map((u) => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
          </select>
        </label>
        <span className="toolbar__divider" aria-hidden />
        <button type="button" className="icon-btn" onClick={undo} disabled={!canUndo} title={t.undoHint} aria-label={t.undo}>
          <Undo2 size={17} strokeWidth={1.8} />
        </button>
        <button type="button" className="icon-btn" onClick={redo} disabled={!canRedo} title={t.redoHint} aria-label={t.redo}>
          <Redo2 size={17} strokeWidth={1.8} />
        </button>
        <label className={`snap${snapStep > 0 ? " is-on" : ""}`} title={t.snapHint}>
          <Magnet size={15} strokeWidth={1.8} />
          <span className="sr-only">{t.snap}</span>
          <select value={snapStep} onChange={(e) => setSnapStep(Number(e.target.value))}>
            <option value={0}>{t.snapOff}</option>
            {steps.map((step) => (
              <option key={step} value={step}>
                {len.format(step)}
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
