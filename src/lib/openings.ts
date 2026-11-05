import type { Opening, OpeningType, Room, Wall } from "../types";
import { clamp, roundMm } from "./geometry";

/** Wall thickness. Walls are built outward, so the interior is exactly room-sized. */
export const WALL_T = 0.1;

/** In plan view walls are cut horizontally at this height, like an architectural floor plan. */
export const PLAN_CUT_HEIGHT = 1.2;

export interface OpeningCatalogEntry {
  type: OpeningType;
  defaults: { width: number; height: number; elevation: number };
  min: { width: number; height: number };
  max: { width: number; height: number };
}

export const OPENING_CATALOG: Record<OpeningType, OpeningCatalogEntry> = {
  door: {
    type: "door",
    defaults: { width: 0.9, height: 2.1, elevation: 0 },
    min: { width: 0.6, height: 1.8 },
    max: { width: 1.8, height: 2.6 },
  },
  window: {
    type: "window",
    defaults: { width: 1.2, height: 1.3, elevation: 0.9 },
    min: { width: 0.4, height: 0.3 },
    // Tall enough for double-height glazing; the room height still caps it.
    max: { width: 4, height: 6 },
  },
};

export const OPENING_TYPES = Object.keys(OPENING_CATALOG) as OpeningType[];
export const WALLS: Wall[] = ["back", "left", "right", "front"];

/** Back and front walls run along X; the side walls run along Z. */
export const runsAlongX = (wall: Wall) => wall === "back" || wall === "front";

/** Length of a wall's interior face. */
export const wallLength = (wall: Wall, room: Room) => (runsAlongX(wall) ? room.width : room.depth);

/**
 * Wall-local coordinates → world (x, z).
 *  a — distance along the wall: the world X on back/front walls, the world Z on side walls
 *  t — distance from the wall's interior face into the room (negative = inside the wall)
 */
export function wallToWorld(wall: Wall, a: number, t: number, room: Room): [number, number] {
  switch (wall) {
    case "back":
      return [a, t];
    case "front":
      return [a, room.depth - t];
    case "left":
      return [t, a];
    case "right":
      return [room.width - t, a];
  }
}

export function openingSpan(o: Pick<Opening, "offset" | "width">): [number, number] {
  return [o.offset - o.width / 2, o.offset + o.width / 2];
}

/** Enforce the invariants every opening must satisfy: sized within limits, fully on its wall. */
export function constrainOpening(o: Opening, room: Room): Opening {
  const { min, max } = OPENING_CATALOG[o.type];
  const length = wallLength(o.wall, room);
  const width = roundMm(clamp(o.width, min.width, Math.min(max.width, length)));
  const height = roundMm(clamp(o.height, min.height, Math.min(max.height, room.height)));
  const elevation = o.type === "door" ? 0 : roundMm(clamp(o.elevation, 0, room.height - height));
  const offset = roundMm(clamp(o.offset, width / 2, length - width / 2));
  const { opensAway, ...rest } = o;
  return { ...rest, width, height, elevation, offset, ...(o.type === "door" && opensAway ? { opensAway: true } : {}) };
}

export interface WallSegment {
  a0: number;
  a1: number;
  y0: number;
  y1: number;
}

/**
 * The solid parts of a wall once its openings are cut out — no CSG needed.
 *
 * Sweep along the wall: every opening edge is a breakpoint. Between two
 * breakpoints, the wall is solid from the floor to the ceiling minus whatever
 * openings cover that stretch. Overlapping openings just work.
 *
 *     ┌────┬──────────┬────┐       ┌────┐          ┌────┐   lintel
 *     │    │  window  │    │  →    │    │──────────│    │
 *     │    └──────────┘    │       │    │──────────│    │   sill
 *     └────────────────────┘       └────┘          └────┘
 */
export function wallSegments(wall: Wall, room: Room, openings: Opening[]): WallSegment[] {
  // Side walls run past the corners by one wall thickness to close them.
  const ext = runsAlongX(wall) ? 0 : WALL_T;
  const start = -ext;
  const end = wallLength(wall, room) + ext;
  const own = openings.filter((o) => o.wall === wall);

  const breaks = new Set([start, end]);
  for (const o of own) {
    const [a0, a1] = openingSpan(o);
    breaks.add(clamp(a0, start, end));
    breaks.add(clamp(a1, start, end));
  }
  const xs = [...breaks].sort((p, q) => p - q);

  const pieces: WallSegment[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a0 = xs[i];
    const a1 = xs[i + 1];
    if (a1 - a0 < 1e-6) continue;
    const mid = (a0 + a1) / 2;
    const holes = own
      .filter((o) => {
        const [s, e] = openingSpan(o);
        return s < mid && mid < e;
      })
      .map((o) => [o.elevation, o.elevation + o.height])
      .sort((p, q) => p[0] - q[0]);

    let y = 0;
    for (const [h0, h1] of holes) {
      if (h0 > y) pieces.push({ a0, a1, y0: y, y1: h0 });
      y = Math.max(y, h1);
    }
    if (y < room.height) pieces.push({ a0, a1, y0: y, y1: room.height });
  }

  // Merge neighbours with the same vertical extent so a plain wall stays one box.
  pieces.sort((p, q) => p.y0 - q.y0 || p.y1 - q.y1 || p.a0 - q.a0);
  const merged: WallSegment[] = [];
  for (const p of pieces) {
    const last = merged.at(-1);
    if (last && last.y0 === p.y0 && last.y1 === p.y1 && Math.abs(last.a1 - p.a0) < 1e-6) last.a1 = p.a1;
    else merged.push({ ...p });
  }
  return merged;
}

/** Keep openings this far from corners and from each other when placing new ones. */
const PLACEMENT_GAP = 0.1;

/**
 * Pick a wall and a position for a new opening that doesn't collide with
 * existing ones. Doors prefer the front wall, windows the back wall (or
 * `preferWall` if given); within a wall we search outward from the middle.
 */
export function findOpeningSpot(
  type: OpeningType,
  width: number,
  room: Room,
  openings: Opening[],
  preferWall?: Wall,
): { wall: Wall; offset: number } {
  const defaults: Wall[] = type === "door" ? ["front", "left", "right", "back"] : ["back", "left", "right", "front"];
  const order = preferWall ? [preferWall, ...defaults.filter((w) => w !== preferWall)] : defaults;
  const step = 0.05;
  for (const wall of order) {
    const length = wallLength(wall, room);
    const taken = openings.filter((o) => o.wall === wall).map(openingSpan);
    for (let k = 0; k * step <= length / 2; k++) {
      for (const sign of [1, -1]) {
        const c = length / 2 + sign * k * step;
        const s = c - width / 2;
        const e = c + width / 2;
        if (s < PLACEMENT_GAP || e > length - PLACEMENT_GAP) continue;
        if (taken.some(([ts, te]) => s < te + PLACEMENT_GAP && e > ts - PLACEMENT_GAP)) continue;
        return { wall, offset: roundMm(c) };
      }
    }
  }
  return { wall: order[0], offset: roundMm(wallLength(order[0], room) / 2) };
}

/** Distance from each end of the opening to the corner at that end of its wall. */
export function openingClearances(o: Opening, room: Room): { start: number; end: number } {
  const [a0, a1] = openingSpan(o);
  return { start: a0, end: wallLength(o.wall, room) - a1 };
}

/** The walls at the two ends of a wall, in the app's absolute room directions. */
export function wallEnds(wall: Wall): { start: Wall; end: Wall } {
  return runsAlongX(wall) ? { start: "left", end: "right" } : { start: "back", end: "front" };
}
