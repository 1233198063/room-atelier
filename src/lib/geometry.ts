import type { Dimensions, Furniture, Room, Wall } from "../types";
import { DECOR_TYPES, SURFACE_TYPES, WORKTABLE_TOOL_HEIGHT } from "./catalog";
import { pointInPolygon, type Pt } from "./polygon";

// ── Units ────────────────────────────────────────────────────────────────

export const toCm = (m: number) => Math.round(m * 1000) / 10; // keeps 1 mm resolution
export const fromCm = (cm: number) => cm / 100;

/** Round meters to the nearest millimeter, so 0.1 + 0.2 never shows up as 30.000000004 cm. */
export const roundMm = (m: number) => Math.round(m * 1000) / 1000;

export const degToRad = (deg: number) => (deg * Math.PI) / 180;

/** Normalize any angle into [0, 360). */
export function normalizeDeg(deg: number): number {
  const d = Math.round((((deg % 360) + 360) % 360) * 10) / 10;
  return d === 360 ? 0 : d;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const snapTo = (v: number, step: number) => (step > 0 ? Math.round(v / step) * step : v);

// ── Footprints ───────────────────────────────────────────────────────────

/**
 * Half-size of the axis-aligned box that encloses a rotated footprint.
 *
 * A W×D rectangle rotated by θ covers |cos θ|·W + |sin θ|·D along X and
 * |sin θ|·W + |cos θ|·D along Z. At 0° that's W×D, at 90° it's D×W.
 */
export function footprintHalfExtents(dim: Dimensions, rotationDeg: number) {
  const r = degToRad(rotationDeg);
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return {
    hx: (c * dim.width + s * dim.depth) / 2,
    hz: (s * dim.width + c * dim.depth) / 2,
  };
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function footprintBounds(f: Pick<Furniture, "position" | "dimensions" | "rotation">): Bounds {
  const { hx, hz } = footprintHalfExtents(f.dimensions, f.rotation);
  const [x, , z] = f.position;
  return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
}

/**
 * The four floor corners of a (rotated) footprint, in world x/z. Uses the same
 * rotation Three.js applies around +Y: x' = x·cos + z·sin, z' = −x·sin + z·cos.
 */
export function footprintCorners(f: Pick<Furniture, "position" | "dimensions" | "rotation">): Pt[] {
  const { width: w, depth: d } = f.dimensions;
  const r = degToRad(f.rotation);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const [px, , pz] = f.position;
  const local: Pt[] = [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ];
  return local.map(([x, z]) => [px + x * cos + z * sin, pz - x * sin + z * cos]);
}

/** Height of the highest furniture top (desk, dresser…) under a floor point — 0 if it's bare floor. */
export function furnitureSurfaceHeight(f: Furniture): number {
  return f.position[1] + f.dimensions.height - (f.type === "worktable" ? WORKTABLE_TOOL_HEIGHT : 0);
}

export function surfaceHeightAt(x: number, z: number, furniture: Furniture[], excludeId?: string): number {
  let height = 0;
  for (const f of furniture) {
    if (f.id === excludeId || !SURFACE_TYPES.includes(f.type)) continue;
    const top = furnitureSurfaceHeight(f);
    if (pointInPolygon([x, z], footprintCorners(f))) height = Math.max(height, top);
  }
  return height;
}

/** Clearance from each side of the footprint to the corresponding wall. */
export function wallClearances(f: Furniture, room: Room): Record<Wall, number> {
  const b = footprintBounds(f);
  return {
    left: b.minX,
    right: room.width - b.maxX,
    back: b.minZ,
    front: room.depth - b.maxZ,
  };
}

/** Keep an axis-aligned span of half-size `half` inside [0, size]; center it if it can't fit. */
function clampSpan(center: number, half: number, size: number) {
  if (half * 2 >= size) return size / 2;
  return clamp(center, half, size - half);
}

/** Clamp a furniture center so its rotated footprint stays inside the room. */
export function clampToRoom(
  x: number,
  z: number,
  dim: Dimensions,
  rotationDeg: number,
  room: Room,
): [number, number] {
  const { hx, hz } = footprintHalfExtents(dim, rotationDeg);
  return [clampSpan(x, hx, room.width), clampSpan(z, hz, room.depth)];
}

export function clampElevation(y: number, dim: Dimensions, room: Room) {
  return clamp(y, 0, Math.max(0, room.height - dim.height));
}

/**
 * Snap a dragged center: first to the grid, then let footprint edges that
 * land within `magnet` meters of a wall stick flush against it.
 */
export function snapPosition(
  x: number,
  z: number,
  dim: Dimensions,
  rotationDeg: number,
  room: Room,
  gridStep: number,
  magnet = 0.06,
): [number, number] {
  let sx = snapTo(x, gridStep);
  let sz = snapTo(z, gridStep);
  const { hx, hz } = footprintHalfExtents(dim, rotationDeg);

  if (Math.abs(x - hx) < magnet) sx = hx;
  else if (Math.abs(room.width - (x + hx)) < magnet) sx = room.width - hx;

  if (Math.abs(z - hz) < magnet) sz = hz;
  else if (Math.abs(room.depth - (z + hz)) < magnet) sz = room.depth - hz;

  return [sx, sz];
}

/** Move a piece flush against a wall (or centered on an axis) without changing anything else. */
export function alignedPosition(
  f: Furniture,
  room: Room,
  target: Wall | "centerX" | "centerZ",
): [number, number] {
  const { hx, hz } = footprintHalfExtents(f.dimensions, f.rotation);
  let [x, , z] = f.position;
  switch (target) {
    case "left":
      x = hx;
      break;
    case "right":
      x = room.width - hx;
      break;
    case "back":
      z = hz;
      break;
    case "front":
      z = room.depth - hz;
      break;
    case "centerX":
      x = room.width / 2;
      break;
    case "centerZ":
      z = room.depth / 2;
      break;
  }
  return clampToRoom(x, z, f.dimensions, f.rotation, room);
}

// ── Placement ────────────────────────────────────────────────────────────

const overlaps = (a: Bounds, b: Bounds, gap = 0.05) =>
  a.minX < b.maxX + gap && a.maxX > b.minX - gap && a.minZ < b.maxZ + gap && a.maxZ > b.minZ - gap;

/**
 * Find a spot for a new piece that doesn't overlap existing furniture.
 * Searches outward from the room center on a 10 cm grid; falls back to the center.
 */
export function findFreeSpot(dim: Dimensions, room: Room, existing: Furniture[]): [number, number] {
  const cx = room.width / 2;
  const cz = room.depth / 2;
  const step = 0.1;
  const maxRing = Math.ceil(Math.max(room.width, room.depth) / step);

  for (let ring = 0; ring <= maxRing; ring++) {
    for (let i = -ring; i <= ring; i++) {
      for (let j = -ring; j <= ring; j++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue; // only the ring's perimeter
        const [x, z] = clampToRoom(cx + i * step, cz + j * step, dim, 0, room);
        const candidate = footprintBounds({ position: [x, 0, z], dimensions: dim, rotation: 0 });
        if (!existing.some((f) => !DECOR_TYPES.includes(f.type) && overlaps(candidate, footprintBounds(f)))) {
          return [roundMm(x), roundMm(z)];
        }
      }
    }
  }
  return clampToRoom(cx, cz, dim, 0, room);
}

/** Share of the floor covered by furniture footprints (ignores overlaps). */
export function floorCoverage(furniture: Furniture[], room: Room) {
  const used = furniture.filter((f) => !DECOR_TYPES.includes(f.type)).reduce((sum, f) => sum + f.dimensions.width * f.dimensions.depth, 0);
  return used / (room.width * room.depth);
}
