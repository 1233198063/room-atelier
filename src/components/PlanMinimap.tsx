import { degToRad, toCm } from "../lib/geometry";
import { openingSpan, runsAlongX, wallToWorld } from "../lib/openings";
import { useEditor } from "../store/editorStore";
import type { Furniture, Opening, Room } from "../types";

/** The four floor-plan corners of a rotated piece, in world meters (x, z). */
function corners(f: Furniture): [number, number][] {
  const { width: w, depth: d } = f.dimensions;
  const r = degToRad(f.rotation);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const [px, , pz] = f.position;
  // Same rotation Three.js applies around +Y: x' = x·cos + z·sin, z' = −x·sin + z·cos
  return (
    [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2],
    ] as [number, number][]
  ).map(([x, z]) => [px + x * cos + z * sin, pz - x * sin + z * cos]);
}

const pts = (c: [number, number][]) => c.map(([x, z]) => `${toCm(x)},${toCm(z)}`).join(" ");

/** Drawn wall thickness in the minimap, in cm — exaggerated a little so openings read at this size. */
const BAND = 8;

/** An opening as a rectangle across the wall band, plus a door's swing arc on the floor. */
function OpeningMark({ o, room, selected, onSelect }: { o: Opening; room: Room; selected: boolean; onSelect: () => void }) {
  const [a0, a1] = openingSpan(o);
  const along = runsAlongX(o.wall);
  const [x0, z0] = wallToWorld(o.wall, a0, 0, room).map(toCm);
  const [x1, z1] = wallToWorld(o.wall, a1, 0, room).map(toCm);
  // Push the rectangle outward from the interior face, across the wall band.
  const out = o.wall === "back" || o.wall === "left" ? -BAND : 0;
  const rect = along
    ? { x: Math.min(x0, x1), y: o.wall === "back" ? out : toCm(room.depth), width: Math.abs(x1 - x0), height: BAND }
    : { x: o.wall === "left" ? out : toCm(room.width), y: Math.min(z0, z1), width: BAND, height: Math.abs(z1 - z0) };

  let swing: string | null = null;
  if (o.type === "door") {
    const hingeA = o.hinge === "start" ? a0 : a1;
    const dir = o.hinge === "start" ? 1 : -1;
    const w = a1 - a0;
    const arc: [number, number][] = [wallToWorld(o.wall, hingeA, w, room)];
    for (let i = 0; i <= 12; i++) {
      const θ = ((12 - i) / 12) * (Math.PI / 2);
      arc.push(wallToWorld(o.wall, hingeA + dir * w * Math.cos(θ), w * Math.sin(θ), room));
    }
    swing = pts([wallToWorld(o.wall, hingeA, 0, room), ...arc]);
  }

  return (
    <g className={`minimap__opening minimap__opening--${o.type}${selected ? " is-selected" : ""}`} onClick={onSelect}>
      <rect {...rect} />
      {swing && <polyline points={swing} className="minimap__swing" />}
    </g>
  );
}

/**
 * A 2D floor plan rendered with plain SVG from the same store data as the 3D
 * scene — a nice demonstration that the data, not the meshes, is the truth.
 */
export function PlanMinimap() {
  const room = useEditor((s) => s.room);
  const furniture = useEditor((s) => s.furniture);
  const openings = useEditor((s) => s.openings);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const pad = 14;
  const W = toCm(room.width);
  const D = toCm(room.depth);

  return (
    <svg
      className="minimap"
      viewBox={`${-pad} ${-pad} ${W + pad * 2} ${D + pad * 2}`}
      role="img"
      aria-label={`Floor plan, ${W} by ${D} centimeters`}
    >
      <rect x={-BAND} y={-BAND} width={W + BAND * 2} height={D + BAND * 2} className="minimap__wall" />
      <rect x={0} y={0} width={W} height={D} className="minimap__floor" />
      {furniture.map((f) => {
        const c = corners(f);
        const selected = f.id === selectedId;
        return (
          <g key={f.id} className={`minimap__piece${selected ? " is-selected" : ""}`} onClick={() => select(f.id)}>
            <polygon points={pts(c)} />
            {/* Front edge (local +Z), so orientation is readable at a glance */}
            <polyline points={pts([c[2], c[3]])} className="minimap__front" />
          </g>
        );
      })}
      {openings.map((o) => (
        <OpeningMark key={o.id} o={o} room={room} selected={o.id === selectedId} onSelect={() => select(o.id)} />
      ))}
    </svg>
  );
}
