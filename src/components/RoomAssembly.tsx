import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { fromCm, toCm } from "../lib/geometry";
import { localToWorld, projectBounds, roomCorners, roomsOverlap, snapRoomPosition, type Bounds, type Point2 } from "../lib/rooms";
import { selectActiveRoom, useEditor, type RoomPatch } from "../store/editorStore";
import type { Wall } from "../types";
import { NumberField, type ChangeMeta } from "./ui/NumberField";

function AssemblyPlan() {
  const rooms = useEditor((s) => s.rooms);
  const activeId = useEditor((s) => s.activeRoomId);
  const svg = useRef<SVGSVGElement>(null);
  const [frozenBounds, setFrozenBounds] = useState<Bounds | null>(null);
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
  return <svg ref={svg} className="assembly-plan" aria-label="Room assembly plan. Drag rooms to arrange them."
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
    {rooms.map((r) => {
      const [cx, cz] = localToWorld([r.room.width / 2, r.room.depth / 2], r);
      return <g key={r.id} className={`assembly-plan__room${activeId === r.id ? " is-active" : ""}`}
        role="button" tabIndex={0} aria-label={`Arrange ${r.name}`} aria-pressed={activeId === r.id}
        onKeyDown={(e) => {
          const s = useEditor.getState();
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); s.selectRoom(r.id); }
          const directions: Record<string, Point2> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
          const d = directions[e.key];
          if (!d) return;
          e.preventDefault(); e.stopPropagation();
          if (s.activeRoomId !== r.id) s.selectRoom(r.id);
          const step = e.shiftKey ? 0.1 : 0.01;
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
        <title>{r.name} — {toCm(r.room.width)} × {toCm(r.room.depth)} cm</title>
        <polygon points={roomCorners(r).map((p) => p.join(",")).join(" ")} style={{ fill: r.palette.floor }} />
        <text x={cx} y={cz} textAnchor="middle" dominantBaseline="middle">{r.name.length > 18 ? `${r.name.slice(0, 17)}…` : r.name}</text>
      </g>;
    })}
  </svg>;
}

const SIDES = [
  { side: "left", label: "Left", Icon: ArrowLeft }, { side: "back", label: "Back", Icon: ArrowUp },
  { side: "front", label: "Front", Icon: ArrowDown }, { side: "right", label: "Right", Icon: ArrowRight },
] as const;

export function RoomAssembly() {
  const rooms = useEditor((s) => s.rooms);
  const active = useEditor(selectActiveRoom);
  const update = useEditor((s) => s.updateRoom);
  const attach = useEditor((s) => s.attachRoom);
  const begin = useEditor((s) => s.beginGesture), end = useEditor((s) => s.endGesture);
  const [targetId, setTargetId] = useState("");
  const otherRooms = rooms.filter((r) => r.id !== active.id);
  const target = otherRooms.find((r) => r.id === targetId) ?? otherRooms[0];
  const overlaps = useMemo(() => rooms.filter((r) => r.id !== active.id && roomsOverlap(active, r)), [rooms, active]);
  const bind = (key: string, patch: (v: number) => RoomPatch) => ({
    onChange: (v: number, meta: ChangeMeta) => update(active.id, patch(v), meta.transient ? { history: false } : meta.coalesce ? { coalesceKey: `${active.id}:${key}` } : {}),
    onScrubStart: begin, onScrubEnd: end,
  });
  return <section className="section room-assembly">
    <h3 className="section__title">Arrange rooms <span className="unit-tag">cm</span></h3>
    <AssemblyPlan />
    <p className="library-hint">Drag rooms in the plan to join them. Edges snap together. Hold Alt to move freely.</p>
    {overlaps.length > 0 && <p className="assembly-warning" role="status">Overlaps {overlaps.map((r) => r.name).join(", ")}. Move this room to an open area.</p>}
    <div className="fields fields--2" key={`${active.id}:position`}>
      <NumberField label="X" title="Room X position in the overall layout" unit="cm" value={toCm(active.position[0])}
        {...bind("x", (v) => ({ position: [fromCm(v), selectActiveRoom(useEditor.getState()).position[1]] }))} />
      <NumberField label="Z" title="Room Z position in the overall layout" unit="cm" value={toCm(active.position[1])}
        {...bind("z", (v) => ({ position: [selectActiveRoom(useEditor.getState()).position[0], fromCm(v)] }))} />
    </div>
    <div className="fields fields--2" key={`${active.id}:rotation`}>
      <NumberField label="Rot" title="Room rotation in the overall layout" unit="°" value={active.rotation} {...bind("rotation", (rotation) => ({ rotation }))} />
      <button className="btn btn--ghost" type="button" onClick={() => update(active.id, { rotation: active.rotation + 90 })}><RotateCcw size={14} /> Rotate 90°</button>
    </div>
    {target && <div className="attach-room">
      <label>Join next to <select aria-label="Join next to room" value={target.id} onChange={(e) => setTargetId(e.target.value)}>
        {otherRooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select></label>
      <div className="attach-room__sides">{SIDES.map(({ side, label, Icon }) => <button key={side} type="button" className="btn"
        title={`Place against the ${label.toLowerCase()} side of ${target.name}`} onClick={() => attach(active.id, target.id, side as Wall)}><Icon size={13} />{label}</button>)}</div>
    </div>}
  </section>;
}

export function RemoveRoomButton() {
  const activeId = useEditor((s) => s.activeRoomId), count = useEditor((s) => s.rooms.length);
  const remove = useEditor((s) => s.removeRoom);
  return <button type="button" className="btn btn--danger" disabled={count <= 1} onClick={() => remove(activeId)}
    title={count <= 1 ? "Keep at least one room" : "Delete this room and its contents (undoable)"}><Trash2 size={14} /> Delete room</button>;
}
