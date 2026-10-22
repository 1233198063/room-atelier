import { Focus, Pause, PencilRuler, Play } from "lucide-react";
import { toCm } from "../lib/geometry";
import { useEditor } from "../store/editorStore";

const HINTS = {
  perspective: "Drag to orbit · Right-drag to pan · Scroll to zoom",
  top: "Drag to pan · Scroll to zoom",
};

/** HTML laid over the canvas: hints, camera controls, and the preview-mode placard. */
export function StageOverlay() {
  const mode = useEditor((s) => s.mode);
  const view = useEditor((s) => s.view);
  const room = useEditor((s) => s.room);
  const count = useEditor((s) => s.furniture.length);
  const projectName = useEditor((s) => s.projectName);
  const autoRotate = useEditor((s) => s.autoRotate);
  const setAutoRotate = useEditor((s) => s.setAutoRotate);
  const setMode = useEditor((s) => s.setMode);
  const resetCamera = useEditor((s) => s.resetCamera);

  return (
    <div className="overlay">
      {mode === "preview" && (
        <div className="placard">
          <span className="placard__eyebrow">Room Atelier · Preview</span>
          <h1 className="placard__title">{projectName}</h1>
          <span className="placard__meta">
            {toCm(room.width)} × {toCm(room.depth)} cm · {(room.width * room.depth).toFixed(1)} m² · {count}{" "}
            {count === 1 ? "piece" : "pieces"}
          </span>
        </div>
      )}

      <div className="overlay__bottom">
        <span className="hint">{mode === "edit" ? HINTS[view] : "Design with warmth."}</span>
        <div className="overlay__actions">
          {mode === "preview" && view === "perspective" && (
            <button type="button" className="chip" onClick={() => setAutoRotate(!autoRotate)}>
              {autoRotate ? <Pause size={14} strokeWidth={1.8} /> : <Play size={14} strokeWidth={1.8} />}
              {autoRotate ? "Pause" : "Turntable"}
            </button>
          )}
          <button type="button" className="chip" onClick={resetCamera} title="Frame the whole room (F)">
            <Focus size={14} strokeWidth={1.8} /> Frame room
          </button>
          {mode === "preview" && (
            <button type="button" className="chip chip--dark" onClick={() => setMode("edit")} title="Back to editing (Esc)">
              <PencilRuler size={14} strokeWidth={1.8} /> Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
