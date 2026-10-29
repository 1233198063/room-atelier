import { selectActiveRoom } from "../store/editorStore";
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
import { Fragment, useMemo, useState } from "react";
import { describe, useLang, useLength, useName, useT } from "../i18n";
import { nudgeSteps, UNIT_LABELS } from "../lib/units";
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
import type { Furniture, Opening, RoofType, Room, RoomKind, Wall } from "../types";
import { IssueList } from "./IssueList";
import { PlanMinimap } from "./PlanMinimap";
import { StyleSection } from "./StyleSection";
import { FurnitureIcon } from "./ui/FurnitureIcon";
import { NumberField, type ChangeMeta } from "./ui/NumberField";
import { Segmented } from "./ui/Segmented";
import { RemoveRoomButton, RoomAssembly } from "./RoomAssembly";
import { roomKind } from "../lib/rooms";
import { FurnitureColorSection } from "./FurnitureColorSection";
import { PlantPlacementSection } from "./PlantPlacementSection";

/** Translate a field's change metadata into how the store should record history. */
const historyFor = (key: string, meta: ChangeMeta) =>
  meta.transient ? { history: false } : meta.coalesce ? { coalesceKey: key } : {};

export function PropertiesPanel() {
  const active = useEditor(selectActiveRoom);
  const combined = useEditor((s) => s.roomDisplay === "all");
  const select = useEditor((s) => s.select);
  const furniture = useEditor(selectSelected);
  const opening = useEditor(selectSelectedOpening);
  const t = useT().inspector;
  const name = useName();
  return (
    <aside className="panel panel--right" aria-label={t.label}>
      <div className="panel__inner">
        {(furniture || opening) && <button className="room-breadcrumb" type="button" onClick={() => select(null)}>{t.roomSettings(name(active.name))}</button>}
        {combined && !furniture && !opening && <RoomAssembly />}
        {furniture ? (
          <FurnitureInspector key={furniture.id} f={furniture} />
        ) : opening ? (
          <OpeningInspector key={opening.id} o={opening} />
        ) : (
          <RoomInspector key={active.id} />
        )}
      </div>
    </aside>
  );
}

// ── Furniture ────────────────────────────────────────────────────────────

const ALIGN_ACTIONS: { target: Wall | "centerX" | "centerZ"; icon: LucideIcon }[] = [
  { target: "left", icon: ArrowLeftToLine },
  { target: "centerX", icon: AlignHorizontalJustifyCenter },
  { target: "right", icon: ArrowRightToLine },
  { target: "back", icon: ArrowUpToLine },
  { target: "centerZ", icon: AlignVerticalJustifyCenter },
  { target: "front", icon: ArrowDownToLine },
];

function FurnitureInspector({ f }: { f: Furniture }) {
  const room = useEditor((s) => selectActiveRoom(s).room);
  const update = useEditor((s) => s.updateFurniture);
  const align = useEditor((s) => s.alignFurniture);
  const duplicate = useEditor((s) => s.duplicateFurniture);
  const remove = useEditor((s) => s.removeFurniture);
  const beginGesture = useEditor((s) => s.beginGesture);
  const endGesture = useEditor((s) => s.endGesture);
  const entry = CATALOG[f.type];
  const text = useT();
  const t = text.inspector;
  const name = useName();
  const len = useLength();

  /** Wire a NumberField (in cm or °) to one property of the selected piece. */
  const bind = (field: string, toPatch: (current: Furniture, v: number) => FurniturePatch) => ({
    onChange: (v: number, meta: ChangeMeta) => {
      // Read the latest data: during a scrub this callback fires many times between renders.
      const current = selectActiveRoom(useEditor.getState()).furniture.find((p) => p.id === f.id);
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
          <NameInput key={f.id} value={name(f.name)} label={t.name} onCommit={(value) => update(f.id, { name: value })} />
          <span className="inspector-head__type">{describe(text.furniture[f.type].description, len.format)}</span>
        </div>
      </section>

      <ItemIssues id={f.id} />

      {f.type === "plant" && <PlantPlacementSection plant={f} />}

      <FurnitureColorSection furniture={f} />

      <section className="section">
        <h3 className="section__title">{t.position}</h3>
        <div className="fields fields--2">
          <NumberField
            label="X"
            title={t.xTitle}
            unit="length"
            value={toCm(f.position[0])}
            {...bind("x", (c, v) => ({ position: [fromCm(v), c.position[1], c.position[2]] }))}
          />
          <NumberField
            label="Z"
            title={t.zTitle}
            unit="length"
            value={toCm(f.position[2])}
            {...bind("z", (c, v) => ({ position: [c.position[0], c.position[1], fromCm(v)] }))}
          />
        </div>
        <div className="fields fields--2">
          <NumberField
            label={t.elev}
            title={t.elevTitle}
            unit="length"
            min={0}
            max={maxElevation}
            value={toCm(f.position[1])}
            {...bind("y", (c, v) => ({ position: [c.position[0], fromCm(v), c.position[2]] }))}
          />
          <NumberField
            label={t.rot}
            title={t.rotTitle}
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
          {t.size}
          <button
            type="button"
            className="link-btn"
            onClick={() => update(f.id, { dimensions: { ...entry.defaults } })}
            title={t.defaultHint}
          >
            <RefreshCcw size={12} strokeWidth={2} /> {t.default}
          </button>
        </h3>
        <div className="fields fields--3">
          <NumberField
            label={t.w}
            title={t.widthRange(len.range(entry.min.width, entry.max.width))}
            unit="length"
            min={toCm(entry.min.width)}
            max={toCm(entry.max.width)}
            value={toCm(f.dimensions.width)}
            {...bind("w", (_, v) => ({ dimensions: { width: fromCm(v) } }))}
          />
          <NumberField
            label={t.d}
            title={t.depthRange(len.range(entry.min.depth, entry.max.depth))}
            unit="length"
            min={toCm(entry.min.depth)}
            max={toCm(entry.max.depth)}
            value={toCm(f.dimensions.depth)}
            {...bind("d", (_, v) => ({ dimensions: { depth: fromCm(v) } }))}
          />
          <NumberField
            label={t.h}
            title={t.heightRange(len.range(entry.min.height, entry.max.height))}
            unit="length"
            min={toCm(entry.min.height)}
            max={toCm(entry.max.height)}
            value={toCm(f.dimensions.height)}
            {...bind("h", (_, v) => ({ dimensions: { height: fromCm(v) } }))}
          />
        </div>
      </section>

      <section className="section">
        <h3 className="section__title">{t.align}</h3>
        <div className="align-grid">
          {ALIGN_ACTIONS.map(({ target, icon: Icon }) => (
            <button
              key={target}
              type="button"
              className="icon-btn icon-btn--tile"
              onClick={() => align(f.id, target)}
              title={text.align[target]}
              aria-label={text.align[target]}
            >
              <Icon size={16} strokeWidth={1.8} />
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h3 className="section__title">{t.clearanceWalls}</h3>
        <ClearanceDiagram clearance={clearance} />
        <PlanMinimap />
      </section>

      <section className="section button-row">
        <button type="button" className="btn" onClick={() => duplicate(f.id)} title={t.duplicateHint}>
          <Copy size={14} strokeWidth={1.8} /> {t.duplicate}
        </button>
        <button type="button" className="btn btn--danger" onClick={() => remove(f.id)} title={t.deleteHint}>
          <Trash2 size={14} strokeWidth={1.8} /> {t.delete}
        </button>
      </section>
    </>
  );
}

/** `value` is the name as displayed (already in the interface language); typing replaces it as-is. */
function NameInput({ value, onCommit, label }: { value: string; onCommit: (name: string) => void; label: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const name = draft?.trim();
    if (name && name !== value) onCommit(name);
    setDraft(null);
  };
  return (
    <input
      className="inspector-head__name"
      aria-label={label}
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
  const t = useT().inspector;
  const len = useLength();
  const fmt = (m: number) => (m < 0.005 ? t.flush : len.value(m));
  return (
    <div className="clearance" aria-label={`${t.clearanceAria} (${UNIT_LABELS[len.unit]})`}>
      <span className="clearance__back">{fmt(clearance.back)}</span>
      <span className="clearance__left">{fmt(clearance.left)}</span>
      <span className="clearance__piece" aria-hidden />
      <span className="clearance__right">{fmt(clearance.right)}</span>
      <span className="clearance__front">{fmt(clearance.front)}</span>
    </div>
  );
}

// ── Doors & windows ──────────────────────────────────────────────────────

const WALL_ICONS: { value: Wall; icon: LucideIcon }[] = [
  { value: "back", icon: ArrowUpToLine },
  { value: "left", icon: ArrowLeftToLine },
  { value: "right", icon: ArrowRightToLine },
  { value: "front", icon: ArrowDownToLine },
];

function OpeningInspector({ o }: { o: Opening }) {
  const room = useEditor((s) => selectActiveRoom(s).room);
  const update = useEditor((s) => s.updateOpening);
  const duplicate = useEditor((s) => s.duplicateOpening);
  const remove = useEditor((s) => s.removeOpening);
  const beginGesture = useEditor((s) => s.beginGesture);
  const endGesture = useEditor((s) => s.endGesture);
  const entry = OPENING_CATALOG[o.type];
  const text = useT();
  const t = text.inspector;
  const name = useName();
  const len = useLength();
  const wallOptions = WALL_ICONS.map((w) => ({ ...w, label: text.walls[w.value], hint: text.wallHints[w.value] }));

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
          <NameInput key={o.id} value={name(o.name)} label={t.name} onCommit={(value) => update(o.id, { name: value })} />
          <span className="inspector-head__type">{text.openings[o.type].description}</span>
        </div>
      </section>

      <ItemIssues id={o.id} />

      <section className="section">
        <h3 className="section__title">{t.wall}</h3>
        <div className="segmented-block">
          <Segmented label={t.wall} value={o.wall} options={wallOptions} onChange={(wall) => update(o.id, { wall })} />
        </div>
        <div className="fields fields--2" style={{ marginTop: 10 }}>
          <NumberField
            label={axis}
            title={t.offsetTitle(text.wallNames[ends.start])}
            unit="length"
            min={toCm(o.width / 2)}
            max={toCm(length - o.width / 2)}
            value={toCm(o.offset)}
            {...bind("offset", (v) => ({ offset: fromCm(v) }))}
          />
          {o.type === "window" ? (
            <NumberField
              label={t.sill}
              title={t.sillTitle}
              unit="length"
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
              title={t.flipHingeHint}
            >
              <FlipHorizontal2 size={14} strokeWidth={1.8} /> {t.flipHinge}
            </button>
          )}
        </div>
      </section>

      <section className="section">
        <h3 className="section__title">
          {t.size}
          <button
            type="button"
            className="link-btn"
            onClick={() => update(o.id, { width: entry.defaults.width, height: entry.defaults.height })}
            title={t.defaultHint}
          >
            <RefreshCcw size={12} strokeWidth={2} /> {t.default}
          </button>
        </h3>
        <div className="fields fields--2">
          <NumberField
            label={t.w}
            title={t.widthRange(len.range(entry.min.width, Math.min(entry.max.width, length)))}
            unit="length"
            min={toCm(entry.min.width)}
            max={toCm(Math.min(entry.max.width, length))}
            value={toCm(o.width)}
            {...bind("width", (v) => ({ width: fromCm(v) }))}
          />
          <NumberField
            label={t.h}
            title={t.heightRange(len.range(entry.min.height, maxHeight))}
            unit="length"
            min={toCm(entry.min.height)}
            max={toCm(maxHeight)}
            value={toCm(o.height)}
            {...bind("height", (v) => ({ height: fromCm(v) }))}
          />
        </div>
      </section>

      <section className="section">
        <h3 className="section__title">{t.clearanceCorners}</h3>
        <dl className="stats stats--2">
          <div>
            <dt>{t.to(text.wallNames[ends.start])}</dt>
            <dd>{len.format(clearance.start)}</dd>
          </div>
          <div>
            <dt>{t.to(text.wallNames[ends.end])}</dt>
            <dd>{len.format(clearance.end)}</dd>
          </div>
        </dl>
        <PlanMinimap />
      </section>

      <section className="section button-row">
        <button type="button" className="btn" onClick={() => duplicate(o.id)} title={t.duplicateHint}>
          <Copy size={14} strokeWidth={1.8} /> {t.duplicate}
        </button>
        <button type="button" className="btn btn--danger" onClick={() => remove(o.id)} title={t.deleteHint}>
          <Trash2 size={14} strokeWidth={1.8} /> {t.delete}
        </button>
      </section>
    </>
  );
}

/** Layout-check results that involve one item; renders nothing when it's all clear. */
function ItemIssues({ id }: { id: string }) {
  const lang = useLang();
  const { unit } = useLength();
  const t = useT().inspector;
  const issues = useEditor((s) => selectIssues(s, lang, unit));
  const mine = useMemo(() => issues.filter((i) => i.targets.includes(id)), [issues, id]);
  if (mine.length === 0) return null;
  return (
    <section className="section">
      <h3 className="section__title">{t.layoutCheck}</h3>
      <IssueList issues={mine} />
    </section>
  );
}

// ── Room ─────────────────────────────────────────────────────────────────

function RoomInspector() {
  const active = useEditor(selectActiveRoom);
  const updateRoom = useEditor((s) => s.updateRoom);
  const room = useEditor((s) => selectActiveRoom(s).room);
  const furniture = useEditor((s) => selectActiveRoom(s).furniture);
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

  const lang = useLang();
  const text = useT();
  const t = text.inspector;
  const name = useName();
  const len = useLength();
  const issues = useEditor((s) => selectIssues(s, lang, len.unit));
  const area = room.width * room.depth;
  const coverage = floorCoverage(furniture, room);
  const kinds: RoomKind[] = ["indoor", "garden", "courtyard"];
  const roofs: RoofType[] = ["none", "hip"];

  return (
    <>
      <section className="section">
        <NameInput value={name(active.name)} label={t.roomName} onCommit={(value) => updateRoom(active.id, { name: value })} />
        <p className="inspector-sub">{t.roomSub}</p>
      </section>

      <section className="section">
        <h3 className="section__title">
          {t.layoutCheck} {issues.length > 0 && <span className="count">{issues.length}</span>}
        </h3>
        <IssueList issues={issues} emptyText={t.noProblems} />
      </section>

      <section className="section">
        <h3 className="section__title">{t.dimensions}</h3>
        <div className="fields fields--3">
          <NumberField label={t.w} title={t.roomWidth} unit="length" min={toCm(min.width)} max={toCm(max.width)} value={toCm(room.width)} {...bind("width")} />
          <NumberField label={t.d} title={t.roomDepth} unit="length" min={toCm(min.depth)} max={toCm(max.depth)} value={toCm(room.depth)} {...bind("depth")} />
          <NumberField label={t.h} title={t.ceiling} unit="length" min={toCm(min.height)} max={toCm(max.height)} value={toCm(room.height)} {...bind("height")} />
        </div>
        <div className="structure-fields">
          <label>
            {t.type}
            <select value={roomKind(active)} onChange={(e) => updateRoom(active.id, { kind: e.target.value as RoomKind })}>
              {kinds.map((k) => <option key={k} value={k}>{t.kinds[k]}</option>)}
            </select>
          </label>
          <label>
            {t.roof}
            <select value={active.roof ?? "none"} disabled={roomKind(active) === "garden"}
              title={t.roofHint}
              onChange={(e) => updateRoom(active.id, { roof: e.target.value as RoofType })}>
              {roofs.map((r) => <option key={r} value={r}>{t.roofs[r]}</option>)}
            </select>
          </label>
        </div>
        {roomKind(active) === "indoor" && <div className="open-walls" title={t.openWallsHint}>
          <span>{t.openWalls}</span>
          <div className="open-walls__sides" role="group" aria-label={t.openWalls}>
            {(["back", "left", "right", "front"] as Wall[]).map((wall) => {
              const open = active.openWalls?.includes(wall) ?? false;
              return <button key={wall} type="button" className={`filter-chip${open ? " is-active" : ""}`} aria-pressed={open}
                title={text.wallHints[wall]}
                onClick={() => updateRoom(active.id, { openWalls: open ? (active.openWalls ?? []).filter((w) => w !== wall) : [...(active.openWalls ?? []), wall] })}>
                {text.walls[wall]}
              </button>;
            })}
          </div>
        </div>}
        <dl className="stats">
          <div>
            <dt>{t.floorArea}</dt>
            <dd>{len.area(area)}</dd>
          </div>
          <div>
            <dt>{t.furniture}</dt>
            <dd>{t.pieces(furniture.length)}</dd>
          </div>
          <div>
            <dt>{t.floorUsed}</dt>
            <dd>{Math.round(coverage * 100)}%</dd>
          </div>
        </dl>
      </section>

      <StyleSection />

      <section className="section">
        <h3 className="section__title">{t.plan}</h3>
        <PlanMinimap />
      </section>

      <section className="section">
        <h3 className="section__title">{t.layout}</h3>
        <div className="button-row">
          <button type="button" className="btn" onClick={loadSample} title={t.sampleHint}>
            <RefreshCcw size={14} strokeWidth={1.8} /> {t.sampleRoom}
          </button>
          <button type="button" className="btn" onClick={clearFurniture} disabled={furniture.length === 0} title={t.clearHint}>
            <Eraser size={14} strokeWidth={1.8} /> {t.clear}
          </button>
          <RemoveRoomButton />
        </div>
      </section>

      <section className="section">
        <h3 className="section__title">{t.shortcuts}</h3>
        <dl className="shortcuts">
          {t.shortcutList(len.format(nudgeSteps(len.unit)[0]), len.format(nudgeSteps(len.unit)[1])).map(([keys, action]) => (
            <Fragment key={keys}>
              <dt>{keys}</dt>
              <dd>{action}</dd>
            </Fragment>
          ))}
        </dl>
      </section>
    </>
  );
}
