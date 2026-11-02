import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Building2, Combine, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { getLengthUnit, useLength, useName, useT } from "../i18n";
import { nudgeSteps, UNIT_LABELS } from "../lib/units";
import { fromCm, toCm } from "../lib/geometry";
import { joinPlacement, localToWorld, moveRigidly, projectBounds, roomCorners, roomElevation, roomKind, roomsConflict, snapRoomsDelta,
  type Bounds, type JoinAlign, type Point2 } from "../lib/rooms";
import { OPENING_CATALOG, runsAlongX, WALL_T, wallLength, wallToWorld } from "../lib/openings";
import { JOIN_DOOR_MARGIN, movingUnit, selectActiveRoom, selectShownRooms, useEditor, type JoinConnection, type JoinSpec,
  type RoomPatch } from "../store/editorStore";
import { useShallow } from "zustand/react/shallow";
import type { Wall } from "../types";
import { NumberField, type ChangeMeta } from "./ui/NumberField";

/** Where a custom join would put the rooms, drawn over the plan. */
interface JoinPreview {
  ghosts: Point2[][];
  /** The two walls being joined, along their interior faces. */
  targetWall: Point2[];
  ownWall: Point2[];
}

function AssemblyPlan({ preview }: { preview: JoinPreview | null }) {
  const rooms = useEditor((s) => s.rooms);
  const buildings = useEditor((s) => s.buildings);
  const checked = useEditor((s) => s.checkedRoomIds);
  const activeId = useEditor((s) => s.activeRoomId);
  const shown = useEditor(useShallow((s) => selectShownRooms(s).map((r) => r.id)));
  const svg = useRef<SVGSVGElement>(null);
  const [frozenBounds, setFrozenBounds] = useState<Bounds | null>(null);
  const t = useT().assembly;
  const name = useName();
  const len = useLength();
  const drag = useRef<{ id: string; unit: string[]; start: Point2; position: Point2; client: Point2; moved: boolean } | null>(null);
  useEffect(() => () => {
    if (drag.current?.moved) useEditor.getState().endGesture();
    drag.current = null;
  }, []);
  const bounds = frozenBounds ?? projectBounds(rooms);
  const pad = Math.max(1, Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) * 0.15);
  const world = (e: PointerEvent): Point2 | null => {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    return [p.x, p.y];
  };
  const finish = () => {
    if (drag.current?.moved) {
      useEditor.getState().endGesture();
      useEditor.getState().resetCamera();
    }
    drag.current = null;
    setFrozenBounds(null);
  };
  return <svg ref={svg} className="assembly-plan" aria-label={t.planAria}
    viewBox={`${bounds.minX - pad} ${bounds.minZ - pad} ${bounds.maxX - bounds.minX + pad * 2} ${bounds.maxZ - bounds.minZ + pad * 2}`}
    onPointerMove={(e) => {
      const d = drag.current, p = world(e);
      if (!d || !p) return;
      if (!d.moved) {
        if (Math.hypot(e.clientX - d.client[0], e.clientY - d.client[1]) < 3) return;
        useEditor.getState().beginGesture();
        d.moved = true;
      }
      const s = useEditor.getState(), r = s.rooms.find((r) => r.id === d.id);
      if (!r) return;
      const position: Point2 = [d.position[0] + p[0] - d.start[0], d.position[1] + p[1] - d.start[1]];
      const moving = s.rooms.filter((room) => d.unit.includes(room.id));
      s.moveRooms(d.unit, snapRoomsDelta(moving, r, position, s.rooms, e.altKey ? 0 : s.snapStep), { history: false });
    }}
    onPointerUp={(e) => { finish(); if (svg.current?.hasPointerCapture(e.pointerId)) svg.current.releasePointerCapture(e.pointerId); }}
    onPointerCancel={finish} onLostPointerCapture={finish}>
    {/* Each building's outline, under its rooms */}
    {buildings.map((b) => {
      const members = rooms.filter((r) => r.buildingId === b.id);
      if (!members.length) return null;
      const box = projectBounds(members), m = 0.25;
      return <g key={b.id} className="assembly-plan__building">
        <rect x={box.minX - m} y={box.minZ - m} width={box.maxX - box.minX + m * 2} height={box.maxZ - box.minZ + m * 2} />
        <text x={box.minX - m} y={box.minZ - m - 0.1}>{name(b.name)}</text>
      </g>;
    })}
    {/* Gardens underneath, then lower levels before upper ones, so what's on top stays clickable. */}
    {[...rooms].sort((a, b) => Number(roomKind(b) === "garden") - Number(roomKind(a) === "garden")
      || roomElevation(a) - roomElevation(b)).map((r) => {
      const [cx, cz] = localToWorld([r.room.width / 2, r.room.depth / 2], r);
      const label = name(r.name);
      return <g key={r.id} className={`assembly-plan__room${activeId === r.id ? " is-active" : ""}${checked.includes(r.id) ? " is-checked" : ""}${shown.includes(r.id) ? "" : " is-dimmed"}`}
        role="button" tabIndex={0} aria-label={t.arrange(label)} aria-pressed={activeId === r.id}
        onKeyDown={(e) => {
          const s = useEditor.getState();
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); s.selectRoom(r.id); }
          const directions: Record<string, Point2> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
          const d = directions[e.key];
          if (!d) return;
          e.preventDefault(); e.stopPropagation();
          if (s.activeRoomId !== r.id) s.selectRoom(r.id);
          const step = nudgeSteps(getLengthUnit())[e.shiftKey ? 1 : 0];
          const unit = movingUnit(s, r.id);
          s.moveRooms(unit, [d[0] * step, d[1] * step], { coalesceKey: `room-nudge:${unit.join(",")}` });
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const p = world(e);
          if (!p) return;
          e.preventDefault();
          useEditor.getState().selectRoom(r.id);
          setFrozenBounds(projectBounds(rooms));
          drag.current = { id: r.id, unit: movingUnit(useEditor.getState(), r.id), start: p, position: r.position,
            client: [e.clientX, e.clientY], moved: false };
          svg.current?.setPointerCapture(e.pointerId);
        }}>
        <title>{label} — {len.size(r.room.width, r.room.depth)}</title>
        <polygon points={roomCorners(r).map((p) => p.join(",")).join(" ")} style={{ fill: r.palette.floor }} />
        <text x={cx} y={cz} textAnchor="middle" dominantBaseline="middle">{label.length > 18 ? `${label.slice(0, 17)}…` : label}</text>
      </g>;
    })}
    {preview && <g className="assembly-plan__preview">
      {preview.ghosts.map((corners, i) => <polygon key={i} className="assembly-plan__ghost" points={corners.map((p) => p.join(",")).join(" ")} />)}
      <polyline className="assembly-plan__wall is-own" points={preview.ownWall.map((p) => p.join(",")).join(" ")} />
      <polyline className="assembly-plan__wall" points={preview.targetWall.map((p) => p.join(",")).join(" ")} />
    </g>}
  </svg>;
}

type JoinForm = Omit<JoinSpec, "roomId" | "together"> & { doorWidth: number };
const WALL_ORDER: Wall[] = ["back", "left", "right", "front"];

/** A row of mutually exclusive small buttons. */
function Choice<T extends string>({ label, value, options, onChange, hint }: {
  label: string; value: T; hint?: string;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}) {
  return <div className="choice">
    <span className="choice__label" title={hint}>{label}</span>
    <div className="choice__options" role="radiogroup" aria-label={label}>
      {options.map((o) => <button key={o.value} type="button" role="radio" aria-checked={o.value === value} title={o.hint}
        className={`choice__option${o.value === value ? " is-active" : ""}`} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  </div>;
}

const SIDES = [
  { side: "left", Icon: ArrowLeft }, { side: "back", Icon: ArrowUp },
  { side: "front", Icon: ArrowDown }, { side: "right", Icon: ArrowRight },
] as const;

export function RoomAssembly() {
  const rooms = useEditor((s) => s.rooms);
  const buildings = useEditor((s) => s.buildings);
  const checked = useEditor((s) => s.checkedRoomIds);
  const active = useEditor(selectActiveRoom);
  const update = useEditor((s) => s.updateRoom);
  const attach = useEditor((s) => s.attachRoom);
  const moveRooms = useEditor((s) => s.moveRooms);
  const begin = useEditor((s) => s.beginGesture), end = useEditor((s) => s.endGesture);
  const [targetId, setTargetId] = useState("");
  const [form, setForm] = useState<JoinForm | null>(null);
  const text = useT();
  const t = text.assembly;
  const name = useName();
  const len = useLength();
  const unit = movingUnit({ checkedRoomIds: checked }, active.id);
  const building = buildings.find((b) => b.id === active.buildingId);
  const buildingRooms = building ? rooms.filter((r) => r.buildingId === building.id).map((r) => r.id) : [];
  const wholeBuildingTicked = buildingRooms.every((id) => unit.includes(id));
  const otherRooms = rooms.filter((r) => !unit.includes(r.id));
  const target = otherRooms.find((r) => r.id === targetId) ?? otherRooms[0];
  const overlaps = useMemo(() => rooms.filter((r) => r.id !== active.id && roomsConflict(active, r)), [rooms, active]);
  const joinTarget = form ? otherRooms.find((r) => r.id === form.targetId) ?? otherRooms[0] : undefined;
  const join = form && joinTarget
    ? joinPlacement(active, form.wall, joinTarget, form.targetWall, form.align, form.offset, form.connection === "open" ? 0 : 2 * WALL_T) : null;
  const landed = join ? moveRigidly(rooms.filter((r) => unit.includes(r.id)), active, join)
    .map((p) => ({ ...rooms.find((r) => r.id === p.id)!, ...p })) : [];
  const clashes = rooms.filter((o) => !unit.includes(o.id) && landed.some((r) => roomsConflict(r, o)));
  const preview: JoinPreview | null = form && joinTarget && join ? {
    ghosts: landed.map((r) => roomCorners(r)),
    targetWall: [0, wallLength(form.targetWall, joinTarget.room)].map((a) => localToWorld(wallToWorld(form.targetWall, a, 0, joinTarget.room), joinTarget)),
    ownWall: [0, wallLength(form.wall, active.room)].map((a) => localToWorld(wallToWorld(form.wall, a, 0, active.room), active)),
  } : null;
  const shared = join ? join.shared[1] - join.shared[0] : 0;
  const doorNeeds = OPENING_CATALOG.door.min.width + JOIN_DOOR_MARGIN;
  const blocker = !form || !join ? null : form.connection === "door" && shared < doorNeeds ? t.doorTooNarrow(len.format(doorNeeds))
    : form.connection === "open" && !join.flush ? t.notFlush : null;
  const status = blocker ?? (shared > 0 ? t.shared(len.format(shared)) : t.noShared);
  const patchForm = (patch: Partial<JoinForm>) => setForm((f) => f && { ...f, ...patch });
  const alongX = form ? runsAlongX(form.targetWall) : true;
  const bind = (key: string, patch: (v: number) => RoomPatch) => ({
    onChange: (v: number, meta: ChangeMeta) => update(active.id, patch(v), meta.transient ? { history: false } : meta.coalesce ? { coalesceKey: `${active.id}:${key}` } : {}),
    onScrubStart: begin, onScrubEnd: end,
  });
  // Typing a coordinate moves the whole unit by the change, so the rooms keep their places relative to each other.
  const bindMove = (axis: 0 | 1) => ({
    onChange: (v: number, meta: ChangeMeta) => {
      const current = selectActiveRoom(useEditor.getState()).position[axis];
      const delta: [number, number] = axis === 0 ? [fromCm(v) - current, 0] : [0, fromCm(v) - current];
      moveRooms(unit, delta, meta.transient ? { history: false } : meta.coalesce ? { coalesceKey: `${unit.join(",")}:${axis}` } : {});
    },
    onScrubStart: begin, onScrubEnd: end,
  });
  return <section className="section room-assembly">
    <h3 className="section__title">{t.title} <span className="unit-tag">{UNIT_LABELS[len.unit]}</span></h3>
    <AssemblyPlan preview={preview} />
    <p className="library-hint">{t.hint}</p>
    {overlaps.length > 0 && <p className="assembly-warning" role="status">{t.overlaps(overlaps.map((r) => name(r.name)).join(text.listSeparator))}</p>}
    {unit.length > 1 && <p className="assembly-together" role="status"><strong>{t.together(unit.length)}</strong> {t.togetherHint}</p>}
    {building && buildingRooms.length > 1 && !wholeBuildingTicked && <div className="button-row">
      <button className="btn btn--ghost" type="button" title={t.selectBuildingHint}
        onClick={() => useEditor.getState().setCheckedRooms([...new Set([...checked, ...buildingRooms])])}>
        <Building2 size={14} /> {t.selectBuilding(name(building.name))}</button>
    </div>}
    <div className="fields fields--2" key={`${active.id}:position`}>
      <NumberField label="X" title={t.xTitle} unit="length" value={toCm(active.position[0])} {...bindMove(0)} />
      <NumberField label="Z" title={t.zTitle} unit="length" value={toCm(active.position[1])} {...bindMove(1)} />
    </div>
    <div className="fields fields--2" key={`${active.id}:rotation`}>
      <NumberField label={text.inspector.rot} title={t.rotTitle} unit="°" value={active.rotation} {...bind("rotation", (rotation) => ({ rotation }))} />
      <NumberField label={t.lvl} title={t.lvlTitle} unit="length"
        min={-2000} max={2000} value={toCm(roomElevation(active))} {...bind("elevation", (v) => ({ elevation: fromCm(v) }))} />
    </div>
    <div className="button-row">
      <button className="btn btn--ghost" type="button" onClick={() => useEditor.getState().rotateRooms(unit, 90)}><RotateCcw size={14} /> {t.rotate90}</button>
    </div>
    {target && <div className="attach-room">
      <label>{t.joinNext} <select aria-label={t.joinAria} value={target.id} onChange={(e) => setTargetId(e.target.value)}>
        {otherRooms.map((r) => <option key={r.id} value={r.id}>{name(r.name)}</option>)}
      </select></label>
      <div className="attach-room__sides">{SIDES.map(({ side, Icon }) => <button key={side} type="button" className="btn"
        title={t.placeAgainst(text.walls[side], name(target.name))} onClick={() => attach(active.id, target.id, side as Wall, unit)}><Icon size={13} />{text.walls[side]}</button>)}</div>
    </div>}
    {target && !form && <div className="button-row">
      <button className="btn btn--ghost" type="button" title={t.customJoinHint} onClick={() => setForm({ wall: "left", targetId: target.id,
        targetWall: "right", align: "start", offset: 0, connection: "wall", doorWidth: OPENING_CATALOG.door.defaults.width })}>
        <Combine size={14} /> {t.customJoin}</button>
    </div>}
    {form && joinTarget && <div className="custom-join">
      <div className="custom-join__head">
        <strong>{t.customJoin}</strong>
        <button type="button" className="icon-btn" title={t.closeJoin} aria-label={t.closeJoin} onClick={() => setForm(null)}><X size={14} /></button>
      </div>
      <p className="library-hint">{t.customJoinHint}</p>
      <Choice label={t.thisWall} value={form.wall} onChange={(wall) => patchForm({ wall })}
        options={WALL_ORDER.map((w) => ({ value: w, label: text.walls[w], hint: text.wallHints[w] }))} />
      <label className="choice">
        <span className="choice__label">{t.targetRoom}</span>
        <select value={joinTarget.id} onChange={(e) => patchForm({ targetId: e.target.value })}>
          {otherRooms.map((r) => <option key={r.id} value={r.id}>{name(r.name)}</option>)}
        </select>
      </label>
      <Choice label={t.targetWall} value={form.targetWall} onChange={(targetWall) => patchForm({ targetWall })}
        options={WALL_ORDER.map((w) => ({ value: w, label: text.walls[w], hint: text.wallHints[w] }))} />
      <Choice<JoinAlign> label={t.align} hint={t.alignHint} value={form.align} onChange={(align) => patchForm({ align })} options={[
        { value: "start", label: alongX ? t.alignStartX : t.alignStartZ },
        { value: "center", label: t.alignCenter },
        { value: "end", label: alongX ? t.alignEndX : t.alignEndZ },
      ]} />
      <Choice<JoinConnection> label={t.connection} value={form.connection} onChange={(connection) => patchForm({ connection })} options={[
        { value: "wall", label: t.connectWall, hint: t.connectWallHint },
        { value: "door", label: t.connectDoor, hint: t.connectDoorHint },
        { value: "open", label: t.connectOpen, hint: t.connectOpenHint },
      ]} />
      <div className="fields fields--2">
        <NumberField label={t.offset} title={t.offsetTitle} unit="length" min={-5000} max={5000} value={toCm(form.offset)}
          onChange={(v) => patchForm({ offset: fromCm(v) })} />
        {form.connection === "door" && <NumberField label={t.doorWidth} title={t.doorWidthTitle} unit="length"
          min={toCm(OPENING_CATALOG.door.min.width)} max={toCm(OPENING_CATALOG.door.max.width)} value={toCm(form.doorWidth)}
          onChange={(v) => patchForm({ doorWidth: fromCm(v) })} />}
      </div>
      <p className={`custom-join__status${blocker ? " is-problem" : ""}`} role="status">{status}</p>
      {clashes.length > 0 && <p className="custom-join__status is-problem">{t.wouldOverlap(clashes.map((r) => name(r.name)).join(text.listSeparator))}</p>}
      <div className="button-row">
        <button className="btn btn--primary" type="button" disabled={!!blocker} title={t.joinHint} onClick={() => {
          if (useEditor.getState().joinRooms({ ...form, roomId: active.id, targetId: joinTarget.id, together: unit })) setForm(null);
        }}><Combine size={14} /> {t.join}</button>
      </div>
    </div>}
  </section>;
}

export function RemoveRoomButton() {
  const activeId = useEditor((s) => s.activeRoomId), count = useEditor((s) => s.rooms.length);
  const remove = useEditor((s) => s.removeRoom);
  const t = useT().assembly;
  return <button type="button" className="btn btn--danger" disabled={count <= 1} onClick={() => remove(activeId)}
    title={count <= 1 ? t.keepOne : t.deleteRoomHint}><Trash2 size={14} /> {t.deleteRoom}</button>;
}
