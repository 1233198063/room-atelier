import type { ProjectRoom, Wall } from "../types";
import { degToRad, normalizeDeg, roundMm, snapTo } from "./geometry";
import { runsAlongX, WALL_T, wallLength, wallToWorld } from "./openings";

export type Point2 = [number, number];
export interface Bounds { minX: number; minZ: number; maxX: number; maxZ: number }
/** Where a room is drawn. `elevation` lifts it to its level in the combined view. */
export type Placement = Pick<ProjectRoom, "position" | "rotation" | "elevation">;

export function localToWorld([x, z]: Point2, placement: Placement): Point2 {
  const a = degToRad(placement.rotation), c = Math.cos(a), s = Math.sin(a);
  return [placement.position[0] + x * c + z * s, placement.position[1] - x * s + z * c];
}

export function worldToLocal([x, z]: Point2, placement: Placement): Point2 {
  const a = degToRad(placement.rotation), c = Math.cos(a), s = Math.sin(a);
  const dx = x - placement.position[0], dz = z - placement.position[1];
  return [dx * c - dz * s, dx * s + dz * c];
}

export function roomCorners(r: ProjectRoom, outer = false): Point2[] {
  const t = outer ? WALL_T : 0;
  return ([[-t, -t], [r.room.width + t, -t], [r.room.width + t, r.room.depth + t], [-t, r.room.depth + t]] as Point2[])
    .map((p) => localToWorld(p, r));
}

export function roomBounds(r: ProjectRoom, outer = false): Bounds {
  const corners = roomCorners(r, outer);
  return { minX: Math.min(...corners.map((p) => p[0])), maxX: Math.max(...corners.map((p) => p[0])),
    minZ: Math.min(...corners.map((p) => p[1])), maxZ: Math.max(...corners.map((p) => p[1])) };
}

export function projectBounds(rooms: ProjectRoom[]): Bounds {
  if (!rooms.length) return { minX: 0, minZ: 0, maxX: 4, maxZ: 3 };
  const bounds = rooms.map((r) => roomBounds(r, true));
  return { minX: Math.min(...bounds.map((b) => b.minX)), maxX: Math.max(...bounds.map((b) => b.maxX)),
    minZ: Math.min(...bounds.map((b) => b.minZ)), maxZ: Math.max(...bounds.map((b) => b.maxZ)) };
}

/** Grid plus nearby exterior wall edges; Alt in the UI bypasses both. */
export function snapRoomPosition(moving: ProjectRoom, position: Point2, others: ProjectRoom[], step: number): Point2 {
  const [dx, dz] = snapRoomsDelta([moving], moving, position, others, step);
  return [roundMm(moving.position[0] + dx), roundMm(moving.position[1] + dz)];
}

/**
 * Move several rooms as one: `anchor` (one of `moving`) is wanted at
 * `position`. Its position snaps to the grid, then the group's outer edges
 * snap to nearby rooms outside the group. Returns the offset for every room.
 */
export function snapRoomsDelta(moving: ProjectRoom[], anchor: ProjectRoom, position: Point2, others: ProjectRoom[], step: number): Point2 {
  const offset = (p: Point2): Point2 => [roundMm(p[0] - anchor.position[0]), roundMm(p[1] - anchor.position[1])];
  if (step <= 0) return offset(position);
  const grid = position.map((v) => snapTo(v, step)) as Point2;
  const [gx, gz] = [grid[0] - anchor.position[0], grid[1] - anchor.position[1]];
  const all = moving.map((r) => roomBounds({ ...r, position: [r.position[0] + gx, r.position[1] + gz] }, true));
  const b = { minX: Math.min(...all.map((a) => a.minX)), maxX: Math.max(...all.map((a) => a.maxX)),
    minZ: Math.min(...all.map((a) => a.minZ)), maxZ: Math.max(...all.map((a) => a.maxZ)) };
  const ids = new Set(moving.map((r) => r.id));
  let dx = Infinity, dz = Infinity;
  for (const other of others) {
    if (ids.has(other.id)) continue;
    const o = roomBounds(other, true);
    if (b.maxZ >= o.minZ - 0.15 && b.minZ <= o.maxZ + 0.15) {
      for (const d of [o.minX - b.maxX, o.maxX - b.minX, o.minX - b.minX, o.maxX - b.maxX])
        if (Math.abs(d) < Math.abs(dx)) dx = d;
    }
    if (b.maxX >= o.minX - 0.15 && b.minX <= o.maxX + 0.15) {
      for (const d of [o.minZ - b.maxZ, o.maxZ - b.minZ, o.minZ - b.minZ, o.maxZ - b.maxZ])
        if (Math.abs(d) < Math.abs(dz)) dz = d;
    }
  }
  return offset([grid[0] + (Math.abs(dx) <= 0.15 ? dx : 0), grid[1] + (Math.abs(dz) <= 0.15 ? dz : 0)]);
}

/**
 * Turn rooms together by `degrees` (counter-clockwise from above) about the
 * center of their combined footprint, so they keep their places relative to
 * each other. Returns each room's new position and rotation.
 */
export function rotateRoomsTogether(rooms: ProjectRoom[], degrees: number): Pick<ProjectRoom, "id" | "position" | "rotation">[] {
  const b = projectBounds(rooms);
  const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
  const a = degToRad(degrees), c = Math.cos(a), s = Math.sin(a);
  return rooms.map((r) => {
    const x = r.position[0] - cx, z = r.position[1] - cz;
    return { id: r.id, position: [roundMm(cx + x * c + z * s), roundMm(cz - x * s + z * c)], rotation: r.rotation + degrees };
  });
}

/** Exact polygon overlap, including rotated rooms; touching boundaries are OK. */
export function roomsOverlap(a: ProjectRoom, b: ProjectRoom): boolean {
  const p = roomCorners(a), q = roomCorners(b);
  for (const poly of [p, q]) {
    for (let i = 0; i < poly.length; i++) {
      const next = poly[(i + 1) % poly.length];
      const axis: Point2 = [-(next[1] - poly[i][1]), next[0] - poly[i][0]];
      const pp = p.map(([x, z]) => x * axis[0] + z * axis[1]);
      const qq = q.map(([x, z]) => x * axis[0] + z * axis[1]);
      if (Math.max(...pp) <= Math.min(...qq) + 1e-6 || Math.max(...qq) <= Math.min(...pp) + 1e-6) return false;
    }
  }
  return true;
}

// ── Levels and room kinds ────────────────────────────────────────────────

export const roomElevation = (r: Pick<ProjectRoom, "elevation">) => r.elevation ?? 0;
export const roomKind = (r: Pick<ProjectRoom, "kind">) => r.kind ?? "indoor";
/** Gardens and courtyards are open to the sky: no daylight or window rules. */
export const isOutdoor = (r: Pick<ProjectRoom, "kind">) => roomKind(r) !== "indoor";

/**
 * Rooms that genuinely collide. A garden is ground the house stands on, so it
 * never conflicts; stacked floors only conflict where their heights overlap.
 */
export function roomsConflict(a: ProjectRoom, b: ProjectRoom): boolean {
  if (roomKind(a) === "garden" || roomKind(b) === "garden") return false;
  const a0 = roomElevation(a), b0 = roomElevation(b);
  if (a0 + a.room.height <= b0 + 1e-3 || b0 + b.room.height <= a0 + 1e-3) return false;
  return roomsOverlap(a, b);
}

/**
 * Openings a garden's ground must leave for the sunken courtyards below it,
 * as polygons in the garden's local coordinates (walls included).
 */
export function gardenHoles(garden: ProjectRoom, rooms: ProjectRoom[]): Point2[][] {
  if (roomKind(garden) !== "garden") return [];
  return rooms
    .filter((r) => r.id !== garden.id && roomKind(r) === "courtyard" && roomElevation(r) < roomElevation(garden) - 0.05
      && roomsOverlap(garden, r))
    .map((r) => roomCorners(r, true).map((p) => worldToLocal(p, garden)));
}

/**
 * While editing an enclosed room in the combined view, rooms stacked above it
 * would hide it from the camera, so they step out of the way.
 */
export function hiddenWhileEditing(rooms: ProjectRoom[], active: ProjectRoom): Set<string> {
  if (roomKind(active) === "garden") return new Set();
  const level = roomElevation(active) + 0.01;
  return new Set(rooms.filter((r) => r.id !== active.id && roomElevation(r) > level && roomsOverlap(r, active)).map((r) => r.id));
}

// ── Joining one wall to another ──────────────────────────────────────────

export type JoinAlign = "start" | "center" | "end";

/** Each wall's outward direction in its room's own frame. */
const OUTWARD: Record<Wall, Point2> = { back: [0, -1], front: [0, 1], left: [-1, 0], right: [1, 0] };

/** Turn a direction or offset the way a room rotation does (see localToWorld). */
const turn = ([x, z]: Point2, degrees: number): Point2 => {
  const a = degToRad(degrees), c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, -x * s + z * c];
};

export interface JoinPlacement {
  /** Where the moving room goes. */
  position: Point2;
  rotation: number;
  /** The moving wall, and the part both walls share, along the target wall (its interior face, from its start). */
  span: [number, number];
  shared: [number, number];
  /** The two walls line up end to end, so the rooms can open into one space. */
  flush: boolean;
  /** A distance along the target wall → the same point's distance along the moving wall. */
  alongMoving: (a: number) => number;
}

/**
 * Place `moving` so its `wall` faces `targetWall` of `target`, turned as
 * needed (any multiple of 90° from the target's rotation). Along the target
 * wall it lines up its start, center or end with the moving wall's, shifted
 * by `offset`. `gap` is the distance between the two interior faces: two
 * wall thicknesses for walls back to back, 0 for an open join.
 */
export function joinPlacement(moving: ProjectRoom, wall: Wall, target: ProjectRoom, targetWall: Wall,
  align: JoinAlign, offset: number, gap: number): JoinPlacement {
  const [ox, oz] = OUTWARD[targetWall];
  const quarter = [0, 1, 2, 3].find((q) => {
    const [x, z] = turn(OUTWARD[wall], q * 90);
    return Math.abs(x + ox) < 1e-9 && Math.abs(z + oz) < 1e-9;
  })!;
  const length = wallLength(wall, moving.room), targetLength = wallLength(targetWall, target.room);
  // Work in the target's frame: A is the axis along its wall, N the axis across it.
  const A = runsAlongX(targetWall) ? 0 : 1, N = 1 - A;
  const ends = [wallToWorld(wall, 0, 0, moving.room), wallToWorld(wall, length, 0, moving.room)].map((p) => turn(p, quarter * 90));
  const line = wallToWorld(targetWall, 0, -gap, target.room)[N];
  const low = align === "start" ? offset : align === "center" ? (targetLength - length) / 2 + offset : targetLength - length + offset;
  const origin: Point2 = [0, 0];
  origin[N] = line - ends[0][N];
  origin[A] = low - Math.min(ends[0][A], ends[1][A]);
  const span: [number, number] = [low, low + length];
  const shared: [number, number] = [Math.max(0, low), Math.min(targetLength, low + length)];
  return {
    position: localToWorld(origin, target).map(roundMm) as Point2,
    rotation: normalizeDeg(target.rotation + quarter * 90),
    span,
    // No overlap: an empty span at the nearer end of the target wall.
    shared: shared[1] > shared[0] ? shared : [Math.min(Math.max(low, 0), targetLength), Math.min(Math.max(low, 0), targetLength)],
    flush: Math.abs(low) < 0.005 && Math.abs(length - targetLength) < 0.005,
    alongMoving: (a) => {
      const p: Point2 = [0, 0];
      p[A] = a;
      p[N] = line;
      const local = turn([p[0] - origin[0], p[1] - origin[1]], -quarter * 90);
      return runsAlongX(wall) ? local[0] : local[1];
    },
  };
}

/** Where `rooms` go when `anchor` (one of them) moves to `to`, keeping their places relative to it. */
export function moveRigidly(rooms: ProjectRoom[], anchor: ProjectRoom, to: Pick<ProjectRoom, "position" | "rotation">):
  Pick<ProjectRoom, "id" | "position" | "rotation">[] {
  return rooms.map((r) => ({
    id: r.id,
    position: localToWorld(worldToLocal(r.position, anchor), to).map(roundMm) as Point2,
    rotation: normalizeDeg(to.rotation + r.rotation - anchor.rotation),
  }));
}
