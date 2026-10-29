import type { ProjectRoom } from "../types";
import { degToRad, roundMm, snapTo } from "./geometry";
import { WALL_T } from "./openings";

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
  if (step <= 0) return position.map(roundMm) as Point2;
  const grid = position.map((v) => snapTo(v, step)) as Point2;
  const b = roomBounds({ ...moving, position: grid }, true);
  let dx = Infinity, dz = Infinity;
  for (const other of others) {
    if (other.id === moving.id) continue;
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
  return [roundMm(grid[0] + (Math.abs(dx) <= 0.15 ? dx : 0)), roundMm(grid[1] + (Math.abs(dz) <= 0.15 ? dz : 0))];
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
