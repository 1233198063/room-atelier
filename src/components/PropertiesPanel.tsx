import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Copy,
  Eraser,
  FlipHorizontal2,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CATALOG, ROOM_LIMITS } from "../lib/catalog";
import { floorCoverage, fromCm, toCm, wallClearances } from "../lib/geometry";
import { OPENING_CATALOG, openingClearances, runsAlongX, wallEnds, wallLength } from "../lib/openings";
import {
  selectIssues,
  selectSelected,
  selectSelectedOpening,
  useEditor,
  type FurniturePatch,
  type OpeningPatch,
} from "../store/editorStore";
import type { Furniture, Opening, Room, Wall } from "../types";
import { IssueList } from "./IssueList";
import { PlanMinimap } from "./PlanMinimap";
import { StyleSection } from "./StyleSection";
import { FurnitureIcon } from "./ui/FurnitureIcon";
import { NumberField, type ChangeMeta } from "./ui/NumberField";
import { Segmented } from "./ui/Segmented";

/** Translate a field's change metadata into how the store should record history. */
const historyFor = (key: string, meta: ChangeMeta) =>
  meta.transient ? { history: false } : meta.coalesce ? { coalesceKey: key } : {};

export function PropertiesPanel() {
  const furniture = useEditor(selectSelected);
  const opening = useEditor(selectSelectedOpening);
  return (
    <aside className="panel panel--right" aria-label="Properties">
      <div className="panel__inner">
        {furniture ? (
          <FurnitureInspector f={furniture} />
        ) : opening ? (
          <OpeningInspector o={opening} />
        ) : (
          <RoomInspector />
        )}
      </div>
    </aside>
  );
}

// ── Furniture ────────────────────────────────────────────────────────────

const ALIGN_ACTIONS: { target: Wall | "centerX" | "centerZ"; icon: LucideIcon; label: string }[] = [
  { target: "left", icon: ArrowLeftToLine, label: "Against left wall" },
  { target: "centerX", icon: AlignHorizontalJustifyCenter, label: "Center left–right" },
  { target: "right", icon: ArrowRightToLine, label: "Against right wall" },
  { target: "back", icon: ArrowUpToLine, label: "Against back wall" },
  { target: "centerZ", icon: AlignVerticalJustifyCenter, label: "Center back–front" },
  { target: "front", icon: ArrowDownToLine, label: "Against front wall" },
];

function FurnitureInspector({ f }: { f: Furniture }) {
  const room = useEditor((s) => s.room);
  const update = useEditor((s) => s.updateFurniture);
  const align = useEditor((s) => s.alignFurniture);
  const duplicate = useEditor((s) => s.duplicateFurniture);
  const remove = useEditor((s) => s.removeFurniture);
  const beginGesture = useEditor((s) => s.beginGesture);
  const endGesture = useEditor((s) => s.endGesture);
  const entry = CATALOG[f.type];

  /** Wire a NumberField (in cm or °) to one property of the selected piece. */
  const bind = (field: string, toPatch: (current: Furniture, v: number) => FurniturePatch) => ({
    onChange: (v: number, meta: ChangeMeta) => {
      // Read the latest data: during a scrub this callback fires many times between renders.
      const current = useEditor.getState().furniture.find((p) => p.id === f.id);
      if (current) update(f.id, toPatch(current, v), historyFor(`${f.id}:${field}`, meta));
    },
    onScrubStart: beginGesture,
    onScrubEnd: endGesture,
  });

  const clearance = wallClearances(f, room);
  const maxElevation = Math.max(0, toCm(room.height - f.dimensions.height));

  return (
    <>
      <section className="section inspector-head">
        <span className="inspector-head__icon">
          <FurnitureIcon type={f.type} size={34} />
        </span>
        <div className="inspector-head__text">
          <NameInput key={f.id} value={f.name} onCommit={(name) => update(f.id, { name })} />
          <span className="inspector-head__type">{entry.description}</span>
        </div>
      </section>

      <ItemIssues id={f.id} />

      <section className="section">
        <h3 className="section__title">Position</h3>
        <div className="fields fields--2">
          <NumberField
            label="X"
            title="Distance from the left wall to the center"
            unit="cm"
            value={toCm(f.position[0])}
            {...bind("x", (c, v) => ({ position: [fromCm(v), c.position[1], c.position[2]] }))}
          />
          <NumberField
            label="Z"
            title="Distance from the back wall to the center"
            unit="cm"
            value={toCm(f.position[2])}
            {...bind("z", (c, v) => ({ position: [c.position[0], c.position[1], fromCm(v)] }))}
          />
        </div>
        <div className="fields fields--2">
          <NumberField
            label="Elev"
            title="Elevation above the floor"
            unit="cm"
            min={0}
            max={maxElevation}
            value={toCm(f.position[1])}
            {...bind("y", (c, v) => ({ position: [c.position[0], fromCm(v), c.position[2]] }))}
          />
          <NumberField
            label="Rot"
            title="Rotation around the vertical axis (counter-clockwise, seen from above)"
            unit="°"
            step={1}
            value={f.rotation}
            {...bind("rotation", (_, v) => ({ rotation: v }))}
          />
        </div>
        <div className="button-row">
          <button type="button" className="btn btn--ghost" onClick={() => update(f.id, { rotation: f.rotation + 90 })}>
            <RotateCcw size={14} strokeWidth={1.8} /> 90°
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => update(f.id, { rotation: f.rotation - 90 })}>
            <RotateCw size={14} strokeWidth={1.8} /> 90°
          </button>
        </div>
      </section>

      <section className="section">
        <h3 className="section__title">
          Size
          <button
            type="button"
            className="link-btn"
            onClick={() => update(f.id, { dimensions: { ...entry.defaults } })}
            title="Reset to the default size"
          >
            <RefreshCcw size={12} strokeWidth={2} /> Default
          </button>
        </h3>
        <div className="fields fields--3">
          <NumberField
            label="W"
            title={`Width (${toCm(entry.min.width)}–${toCm(entry.max.width)} cm)`}
            unit="cm"
            min={toCm(entry.min.width)}
            max={toCm(entry.max.width)}
            value={toCm(f.dimensions.width)}
            {...bind("w", (_, v) => ({ dimensions: { width: fromCm(v) } }))}
          />
          <NumberField
            label="D"
            title={`Depth (${toCm(entry.min.depth)}–${toCm(entry.max.depth)} cm)`}
            unit="cm"
            min={toCm(entry.min.depth)}
            max={toCm(entry.max.depth)}
            value={toCm(f.dimensions.depth)}
            {...bind("d", (_, v) => ({ dimensions: { depth: fromCm(v) } }))}
          />
          <NumberField
            label="H"
            title={`Height (${toCm(entry.min.height)}–${toCm(entry.max.height)} cm)`}
            unit="cm"
            min={toCm(entry.min.height)}
            max={toCm(entry.max.height)}
            value={toCm(f.dimensions.height)}
            {...bind("h", (_, v) => ({ dimensions: { height: fromCm(v) } }))}
          />
        </div>
      </section>

      <section className="section">
        <h3 className="section__title">Align</h3>
        <div className="align-grid">
          {ALIGN_ACTIONS.map(({ target, icon: Icon, label }) => (
            <button
              key={target}
              type="button"
              className="icon-btn icon-btn--tile"
              onClick={() => align(f.id, target)}
              title={label}
              aria-label={label}
            >
              <Icon size={16} strokeWidth={1.8} />
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h3 className="section__title">Clearance to walls</h3>
        <ClearanceDiagram clearance={clearance} />
        <PlanMinimap />
      </section>

      <section className="section button-row">
        <button type="button" className="btn" onClick={() => duplicate(f.id)} title="Duplicate (Ctrl+D)">
          <Copy size={14} strokeWidth={1.8} /> Duplicate
        </button>
        <button type="button" className="btn btn--danger" onClick={() => remove(f.id)} title="Delete (Del)">
          <Trash2 size={14} strokeWidth={1.8} /> Delete
        </button>
      </section>
    </>
  );
}

function NameInput({ value, onCommit }: { value: string; onCommit: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const name = draft?.trim();
    if (name && name !== value) onCommit(name);
    setDraft(null);
  };
  return (
    <input
      className="inspector-head__name"
      aria-label="Name"
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(null);
      }}
    />
  );
}

function ClearanceDiagram({ clearance }: { clearance: Record<Wall, number> }) {
  const fmt = (m: number) => {
    const cm = toCm(m);
    return cm < 0.5 ? "flush" : `${Number.isInteger(cm) ? cm : cm.toFixed(1)}`;
  };
  return (
    <div className="clearance" aria-label="Clearance to each wall in centimeters">
      <span className="clearance__back">{fmt(clearance.back)}</span>
      <span className="clearance__left">{fmt(clearance.left)}</span>
      <span className="clearance__piece" aria-hidden />
      <span className="clearance__right">{fmt(clearance.right)}</span>
      <span className="clearance__front">{fmt(clearance.front)}</span>
    </div>
  );
}

// ── Doors & windows ──────────────────────────────────────────────────────

const WALL_OPTIONS: { value: Wall; label: string; icon: LucideIcon; hint: string }[] = [
  { value: "back", label: "Back", icon: ArrowUpToLine, hint: "Back wall" },
  { value: "left", label: "Left", icon: ArrowLeftToLine, hint: "Left wall" },
  { value: "right", label: "Right", icon: ArrowRightToLine, hint: "Right wall" },
  { value: "front", label: "Front", icon: ArrowDownToLine, hint: "Front wall" },
];

function OpeningInspector({ o }: { o: Opening }) {
  const room = useEditor((s) => s.room);
  const update = useEditor((s) => s.updateOpening);
  const duplicate = useEditor((s) => s.duplicateOpening);
  const remove = useEditor((s) => s.removeOpening);
  const beginGesture = useEditor((s) => s.beginGesture);
  const endGesture = useEditor((s) => s.endGesture);
  const entry = OPENING_CATALOG[o.type];

  const bind = (field: string, toPatch: (v: number) => OpeningPatch) => ({
    onChange: (v: number, meta: ChangeMeta) => update(o.id, toPatch(v), historyFor(`${o.id}:${field}`, meta)),
    onScrubStart: beginGesture,
    onScrubEnd: endGesture,
  });

  const length = wallLength(o.wall, room);
  const axis = runsAlongX(o.wall) ? "X" : "Z";
  const ends = wallEnds(o.wall);
  const clearance = openingClearances(o, room);
  const maxHeight = Math.min(entry.max.height, room.height);

  return (
    <>
      <section className="section inspector-head">
        <span className="inspector-head__icon">
          <FurnitureIcon type={o.type} size={34} />
        </span>
        <div className="inspector-head__text">
          <NameInput key={o.id} value={o.name} onCommit={(name) => update(o.id, { name })} />
          <span className="inspector-head__type">{entry.description}</span>
        </div>
      </section>

      <ItemIssues id={o.id} />

      <section className="section">
        <h3 className="section__title">Wall</h3>
        <div className="segmented-block">
          <Segmented label="Wall" value={o.wall} options={WALL_OPTIONS} onChange={(wall) => update(o.id, { wall })} />
        </div>
        <div className="fields fields--2" style={{ marginTop: 10 }}>
          <NumberField
            label={axis}
            title={`Center of the opening, measured from the ${ends.start}`}
            unit="cm"
            min={toCm(o.width / 2)}
            max={toCm(length - o.width / 2)}
            value={toCm(o.offset)}
            {...bind("offset", (v) => ({ offset: fromCm(v) }))}
          />
          {o.type === "window" ? (
            <NumberField
              label="Sill"
              title="Height of the bottom edge above the floor"
              unit="cm"
              min={0}
              max={toCm(room.height - o.height)}
              value={toCm(o.elevation)}
              {...bind("elevation", (v) => ({ elevation: fromCm(v) }))}
            />
          ) : (
            <button
              type="button"
              className="btn btn--ghost btn--fill"
              onClick={() => update(o.id, { hinge: o.hinge === "start" ? "end" : "start" })}
              title="Move the hinges to the other side (R)"
            >
              <FlipHorizontal2 size={14} strokeWidth={1.8} /> Flip hinge
            </button>
          )}
        </div>
      </section>

      <section className="section">
        <h3 className="section__title">
          Size
          <button
            type="button"
            className="link-btn"
            onClick={() => update(o.id, { width: entry.defaults.width, height: entry.defaults.height })}
            title="Reset to the default size"
          >
            <RefreshCcw size={12} strokeWidth={2} /> Default
          </button>
        </h3>
        <div className="fields fields--2">
          <NumberField
            label="W"
            title={`Width (${toCm(entry.min.width)}–${toCm(Math.min(entry.max.width, length))} cm)`}
            unit="cm"
            min={toCm(entry.min.width)}
            max={toCm(Math.min(entry.max.width, length))}
            value={toCm(o.width)}
            {...bind("width", (v) => ({ width: fromCm(v) }))}
          />
          <NumberField
            label="H"
            title={`Height (${toCm(entry.min.height)}–${toCm(maxHeight)} cm)`}
            unit="cm"
            min={toCm(entry.min.height)}
            max={toCm(maxHeight)}
            value={toCm(o.height)}
            {...bind("height", (v) => ({ height: fromCm(v) }))}
          />
        </div>
      </section>

      <section className="section">
        <h3 className="section__title">Clearance to corners</h3>
        <dl className="stats stats--2">
          <div>
            <dt>To {ends.start}</dt>
            <dd>{formatCm(clearance.start)} cm</dd>
          </div>
          <div>
            <dt>To {ends.end}</dt>
            <dd>{formatCm(clearance.end)} cm</dd>
          </div>
        </dl>
        <PlanMinimap />
      </section>

      <section className="section button-row">
        <button type="button" className="btn" onClick={() => duplicate(o.id)} title="Duplicate (Ctrl+D)">
          <Copy size={14} strokeWidth={1.8} /> Duplicate
        </button>
        <button type="button" className="btn btn--danger" onClick={() => remove(o.id)} title="Delete (Del)">
          <Trash2 size={14} strokeWidth={1.8} /> Delete
        </button>
      </section>
    </>
  );
}

const formatCm = (m: number) => {
  const cm = toCm(m);
  return Number.isInteger(cm) ? `${cm}` : cm.toFixed(1);
};

/** Layout-check results that involve one item; renders nothing when it's all clear. */
function ItemIssues({ id }: { id: string }) {
  const issues = useEditor(selectIssues);
  const mine = useMemo(() => issues.filter((i) => i.targets.includes(id)), [issues, id]);
  if (mine.length === 0) return null;
  return (
    <section className="section">
      <h3 className="section__title">Layout check</h3>
      <IssueList issues={mine} />
    </section>
  );
}

// ── Room ─────────────────────────────────────────────────────────────────

function RoomInspector() {
  const room = useEditor((s) => s.room);
  const furniture = useEditor((s) => s.furniture);
  const setRoom = useEditor((s) => s.setRoom);
  const clearFurniture = useEditor((s) => s.clearFurniture);
  const loadSample = useEditor((s) => s.loadSample);
  const beginGesture = useEditor((s) => s.beginGesture);
  const endGesture = useEditor((s) => s.endGesture);
  const { min, max } = ROOM_LIMITS;

  const bind = (key: keyof Room) => ({
    onChange: (v: number, meta: ChangeMeta) => setRoom({ [key]: fromCm(v) }, historyFor(`room:${key}`, meta)),
    onScrubStart: beginGesture,
    onScrubEnd: endGesture,
  });

  const issues = useEditor(selectIssues);
  const area = room.width * room.depth;
  const coverage = floorCoverage(furniture, room);

  return (
    <>
      <section className="section">
        <h2 className="inspector-title">Room</h2>
        <p className="inspector-sub">Nothing selected — edit the room itself, or click a piece of furniture.</p>
      </section>

      <section className="section">
        <h3 className="section__title">
          Layout check {issues.length > 0 && <span className="count">{issues.length}</span>}
        </h3>
        <IssueList issues={issues} emptyText="No problems found. Nice layout." />
      </section>

      <section className="section">
        <h3 className="section__title">Dimensions</h3>
        <div className="fields fields--3">
          <NumberField label="W" title="Room width (left → right)" unit="cm" min={toCm(min.width)} max={toCm(max.width)} value={toCm(room.width)} {...bind("width")} />
          <NumberField label="D" title="Room depth (back → front)" unit="cm" min={toCm(min.depth)} max={toCm(max.depth)} value={toCm(room.depth)} {...bind("depth")} />
          <NumberField label="H" title="Ceiling height" unit="cm" min={toCm(min.height)} max={toCm(max.height)} value={toCm(room.height)} {...bind("height")} />
        </div>
        <dl className="stats">
          <div>
            <dt>Floor area</dt>
            <dd>{area.toFixed(1)} m²</dd>
          </div>
          <div>
            <dt>Furniture</dt>
            <dd>{furniture.length} pcs</dd>
          </div>
          <div>
            <dt>Floor used</dt>
            <dd>{Math.round(coverage * 100)}%</dd>
          </div>
        </dl>
      </section>

      <StyleSection />

      <section className="section">
        <h3 className="section__title">Plan</h3>
        <PlanMinimap />
      </section>

      <section className="section">
        <h3 className="section__title">Layout</h3>
        <div className="button-row">
          <button type="button" className="btn" onClick={loadSample} title="Replace with the sample bedroom (undoable)">
            <RefreshCcw size={14} strokeWidth={1.8} /> Sample room
          </button>
          <button type="button" className="btn" onClick={clearFurniture} disabled={furniture.length === 0} title="Remove all furniture (undoable)">
            <Eraser size={14} strokeWidth={1.8} /> Clear
          </button>
        </div>
      </section>

      <section className="section">
        <h3 className="section__title">Shortcuts</h3>
        <dl className="shortcuts">
          <dt>Drag</dt>
          <dd>Move · hold Alt to skip snapping</dd>
          <dt>← ↑ → ↓</dt>
          <dd>Nudge 1 cm · Shift 10 cm</dd>
          <dt>R</dt>
          <dd>Rotate 90° · flip door hinge</dd>
          <dt>Ctrl D</dt>
          <dd>Duplicate</dd>
          <dt>Del</dt>
          <dd>Delete</dd>
          <dt>Ctrl Z</dt>
          <dd>Undo · Ctrl+Shift+Z redo</dd>
          <dt>1 · 2</dt>
          <dd>3D · Plan view</dd>
          <dt>P · F</dt>
          <dd>Preview · Frame room</dd>
          <dt>Labels</dt>
          <dd>Drag a field label to scrub</dd>
        </dl>
      </section>
    </>
  );
}
