import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { getLengthUnit, useLength, useName, useT } from "../i18n";
import { nudgeSteps, UNIT_LABELS } from "../lib/units";
import { fromCm, toCm } from "../lib/geometry";
import { localToWorld, projectBounds, roomCorners, roomElevation, roomKind, roomsConflict, snapRoomPosition, type Bounds, type Point2 } from "../lib/rooms";
import { selectActiveRoom, useEditor, type RoomPatch } from "../store/editorStore";
import type { Wall } from "../types";
import { NumberField, type ChangeMeta } from "./ui/NumberField";

function AssemblyPlan() {
  const rooms = useEditor((s) => s.rooms);
  const activeId = useEditor((s) => s.activeRoomId);
  const svg = useRef<SVGSVGElement>(null);
  const [frozenBounds, setFrozenBounds] = useState<Bounds | null>(null);
  const t = useT().assembly;
  const name = useName();
  const len = useLength();
  const drag = useRef<{ id: string; start: Point2; position: Point2; client: Point2; moved: boolean } | null>(null);
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
      s.updateRoom(d.id, { position: snapRoomPosition(r, position, s.rooms, e.altKey ? 0 : s.snapStep) }, { history: false });
    }}
    onPointerUp={(e) => { finish(); if (svg.current?.hasPointerCapture(e.pointerId)) svg.current.releasePointerCapture(e.pointerId); }}
    onPointerCancel={finish} onLostPointerCapture={finish}>
    {/* Gardens underneath, then lower levels before upper ones, so what's on top stays clickable. */}
    {[...rooms].sort((a, b) => Number(roomKind(b) === "garden") - Number(roomKind(a) === "garden")
      || roomElevation(a) - roomElevation(b)).map((r) => {
      const [cx, cz] = localToWorld([r.room.width / 2, r.room.depth / 2], r);
      const label = name(r.name);
      return <g key={r.id} className={`assembly-plan__room${activeId === r.id ? " is-active" : ""}`}
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
          s.updateRoom(r.id, { position: [r.position[0] + d[0] * step, r.position[1] + d[1] * step] }, { coalesceKey: `room-nudge:${r.id}` });
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const p = world(e);
          if (!p) return;
          e.preventDefault();
          useEditor.getState().selectRoom(r.id);
          setFrozenBounds(projectBounds(rooms));
          drag.current = { id: r.id, start: p, position: r.position, client: [e.clientX, e.clientY], moved: false };
          svg.current?.setPointerCapture(e.pointerId);
        }}>
        <title>{label} — {len.size(r.room.width, r.room.depth)}</title>
        <polygon points={roomCorners(r).map((p) => p.join(",")).join(" ")} style={{ fill: r.palette.floor }} />
        <text x={cx} y={cz} textAnchor="middle" dominantBaseline="middle">{label.length > 18 ? `${label.slice(0, 17)}…` : label}</text>
      </g>;
    })}
  </svg>;
}

const SIDES = [
  { side: "left", Icon: ArrowLeft }, { side: "back", Icon: ArrowUp },
  { side: "front", Icon: ArrowDown }, { side: "right", Icon: ArrowRight },
] as const;

export function RoomAssembly() {
  const rooms = useEditor((s) => s.rooms);
  const active = useEditor(selectActiveRoom);
  const update = useEditor((s) => s.updateRoom);
  const attach = useEditor((s) => s.attachRoom);
  const begin = useEditor((s) => s.beginGesture), end = useEditor((s) => s.endGesture);
  const [targetId, setTargetId] = useState("");
  const text = useT();
  const t = text.assembly;
  const name = useName();
  const len = useLength();
  const otherRooms = rooms.filter((r) => r.id !== active.id);
  const target = otherRooms.find((r) => r.id === targetId) ?? otherRooms[0];
  const overlaps = useMemo(() => rooms.filter((r) => r.id !== active.id && roomsConflict(active, r)), [rooms, active]);
  const bind = (key: string, patch: (v: number) => RoomPatch) => ({
    onChange: (v: number, meta: ChangeMeta) => update(active.id, patch(v), meta.transient ? { history: false } : meta.coalesce ? { coalesceKey: `${active.id}:${key}` } : {}),
    onScrubStart: begin, onScrubEnd: end,
  });
  return <section className="section room-assembly">
    <h3 className="section__title">{t.title} <span className="unit-tag">{UNIT_LABELS[len.unit]}</span></h3>
    <AssemblyPlan />
    <p className="library-hint">{t.hint}</p>
    {overlaps.length > 0 && <p className="assembly-warning" role="status">{t.overlaps(overlaps.map((r) => name(r.name)).join(text.listSeparator))}</p>}
    <div className="fields fields--2" key={`${active.id}:position`}>
      <NumberField label="X" title={t.xTitle} unit="length" value={toCm(active.position[0])}
        {...bind("x", (v) => ({ position: [fromCm(v), selectActiveRoom(useEditor.getState()).position[1]] }))} />
      <NumberField label="Z" title={t.zTitle} unit="length" value={toCm(active.position[1])}
        {...bind("z", (v) => ({ position: [selectActiveRoom(useEditor.getState()).position[0], fromCm(v)] }))} />
    </div>
    <div className="fields fields--2" key={`${active.id}:rotation`}>
      <NumberField label={text.inspector.rot} title={t.rotTitle} unit="°" value={active.rotation} {...bind("rotation", (rotation) => ({ rotation }))} />
      <NumberField label={t.lvl} title={t.lvlTitle} unit="length"
        min={-2000} max={2000} value={toCm(roomElevation(active))} {...bind("elevation", (v) => ({ elevation: fromCm(v) }))} />
    </div>
    <div className="button-row">
      <button className="btn btn--ghost" type="button" onClick={() => update(active.id, { rotation: active.rotation + 90 })}><RotateCcw size={14} /> {t.rotate90}</button>
    </div>
    {target && <div className="attach-room">
      <label>{t.joinNext} <select aria-label={t.joinAria} value={target.id} onChange={(e) => setTargetId(e.target.value)}>
        {otherRooms.map((r) => <option key={r.id} value={r.id}>{name(r.name)}</option>)}
      </select></label>
      <div className="attach-room__sides">{SIDES.map(({ side, Icon }) => <button key={side} type="button" className="btn"
        title={t.placeAgainst(text.walls[side], name(target.name))} onClick={() => attach(active.id, target.id, side as Wall)}><Icon size={13} />{text.walls[side]}</button>)}</div>
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
