import { Box, CircleCheck, Focus, House, Lightbulb, Pause, PencilRuler, Play, TriangleAlert } from "lucide-react";
import { useLength, useName, useT } from "../i18n";
import { selectActiveRoom, selectIssues, useEditor } from "../store/editorStore";
import { RoomDisplayControl } from "./RoomManager";

/** Live layout-check summary; clicking it deselects so the room panel shows the full list. */
function CheckChip() {
  const issues = useEditor(selectIssues);
  const select = useEditor((s) => s.select);
  const t = useT().stage;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const tips = issues.length - warnings;

  return (
    <button
      type="button"
      className={`chip check-chip${warnings ? " check-chip--warn" : ""}`}
      onClick={() => select(null)}
      title={t.showCheck}
    >
      {issues.length === 0 ? (
        <>
          <CircleCheck size={14} strokeWidth={1.9} /> {t.layoutGood}
        </>
      ) : (
        <>
          {warnings > 0 && (
            <span className="check-chip__part check-chip__part--warn">
              <TriangleAlert size={14} strokeWidth={1.9} /> {t.warnings(warnings)}
            </span>
          )}
          {tips > 0 && (
            <span className="check-chip__part">
              <Lightbulb size={14} strokeWidth={1.9} /> {t.tips(tips)}
            </span>
          )}
        </>
      )}
    </button>
  );
}

/** HTML laid over the canvas: hints, camera controls, and the preview-mode placard. */
export function StageOverlay() {
  const rooms = useEditor((s) => s.rooms);
  const active = useEditor(selectActiveRoom);
  const combined = useEditor((s) => s.roomDisplay === "all");
  const selectRoom = useEditor((s) => s.selectRoom);
  const mode = useEditor((s) => s.mode);
  const view = useEditor((s) => s.view);
  const room = useEditor((s) => selectActiveRoom(s).room);
  const count = useEditor((s) => selectActiveRoom(s).furniture.length);
  const projectName = useEditor((s) => s.projectName);
  const autoRotate = useEditor((s) => s.autoRotate);
  const setAutoRotate = useEditor((s) => s.setAutoRotate);
  const setMode = useEditor((s) => s.setMode);
  const resetCamera = useEditor((s) => s.resetCamera);
  const wallView = useEditor((s) => s.wallView);
  const setWallView = useEditor((s) => s.setWallView);
  const t = useT().stage;
  const name = useName();
  const len = useLength();

  return (
    <div className="overlay">
      <div className="room-viewbar">
        <select aria-label={t.currentRoom} value={active.id} onChange={(e) => selectRoom(e.target.value)}>
          {rooms.map((r) => <option key={r.id} value={r.id}>{name(r.name)}</option>)}
        </select>
        <RoomDisplayControl />
      </div>
      {mode === "edit" && (
        <div className="overlay__top">
          <CheckChip />
        </div>
      )}
      {mode === "preview" && (
        <div className="placard">
          <span className="placard__eyebrow">{t.eyebrow}</span>
          <h1 className="placard__title">{name(combined ? projectName : active.name)}</h1>
          <span className="placard__meta">
            {combined ? t.projectMeta(rooms.length, len.area(rooms.reduce((sum, r) => sum + r.room.width * r.room.depth, 0)))
              : t.roomMeta(len.size(room.width, room.depth), len.area(room.width * room.depth), count)}
          </span>
        </div>
      )}

      <div className="overlay__bottom">
        <span className="hint">{mode === "edit" ? (view === "top" ? t.hintTop : t.hintPerspective) : t.previewHint}</span>
        <div className="overlay__actions">
          {mode === "preview" && view === "perspective" && (
            <button type="button" className="chip" onClick={() => setAutoRotate(!autoRotate)}>
              {autoRotate ? <Pause size={14} strokeWidth={1.8} /> : <Play size={14} strokeWidth={1.8} />}
              {autoRotate ? t.pause : t.turntable}
            </button>
          )}
          {combined && view === "perspective" && (
            <button type="button" className="chip" aria-pressed={wallView === "exterior"}
              onClick={() => setWallView(wallView === "exterior" ? "cutaway" : "exterior")}
              title={wallView === "exterior" ? t.cutawayHint : t.exteriorHint}>
              {wallView === "exterior" ? <Box size={14} strokeWidth={1.8} /> : <House size={14} strokeWidth={1.8} />}
              {wallView === "exterior" ? t.cutaway : t.exterior}
            </button>
          )}
          <button type="button" className="chip" onClick={resetCamera} title={t.frameHint}>
            <Focus size={14} strokeWidth={1.8} /> {combined ? t.frameAll : t.frameRoom}
          </button>
          {mode === "preview" && (
            <button type="button" className="chip chip--dark" onClick={() => setMode("edit")} title={t.backToEditHint}>
              <PencilRuler size={14} strokeWidth={1.8} /> {t.backToEdit}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
