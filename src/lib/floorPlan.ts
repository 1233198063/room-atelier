import type { Opening, ProjectTemplate, RoomTemplate, Wall } from "../types";
import { ROOM_LIMITS } from "./catalog";

/**
 * Reading a floor plan image: which pixels are walls, and the rectangle of
 * floor around a point. Plain image processing, no network.
 *
 * Walls in a plan are drawn as thick dark bands; text, dimension lines and
 * furniture symbols are thin. So a pixel counts as wall only when it is dark
 * AND part of a dark run at least `minWall` pixels long both across and
 * along — which thin strokes never are.
 *
 * A room is found by casting rays from a point inside it to the nearest wall
 * on each side, from many positions across the room, and taking the median.
 * A door gap lets a few rays through to a farther wall, but not most of them.
 * Windows are drawn thin, so rays through them run off the image; those don't
 * vote, and a side only counts as open — outside the building — when almost
 * no ray finds a wall there.
 */

export interface PixelRect {
  /** Interior faces in image pixels; x1 and y1 are exclusive. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface WallMap {
  width: number;
  height: number;
  /** 1 where a wall is. */
  wall: Uint8Array;
  /** 1 where the plan is dark at all: walls, and thin lines such as windows and labels. */
  dark?: Uint8Array;
}

const luminance = (data: Uint8ClampedArray, i: number) =>
  data[i + 3] < 128 ? 255 : 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

/** Otsu's threshold over a luminance histogram, kept where walls plausibly sit. */
function darkThreshold(histogram: number[], total: number): number {
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * histogram[t];
  let sumB = 0, wB = 0, best = 0, threshold = 110;
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * histogram[t];
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > best) { best = between; threshold = t; }
  }
  // Colored plans (wood floors, tinted rooms) push Otsu between floor and white; walls are darker than that.
  return Math.min(130, Math.max(60, threshold));
}

/** Smallest wall thickness to accept, in pixels, for an image of this size. */
export const minWallFor = (width: number, height: number) => Math.max(3, Math.round(Math.min(width, height) * 0.004));

export function wallMap(data: Uint8ClampedArray, width: number, height: number, minWall = minWallFor(width, height)): WallMap {
  const n = width * height;
  const lum = new Uint8Array(n);
  const histogram = new Array<number>(256).fill(0);
  for (let p = 0; p < n; p++) {
    const v = Math.round(luminance(data, p * 4));
    lum[p] = v;
    histogram[v]++;
  }
  const t = darkThreshold(histogram, n);
  const dark = new Uint8Array(n);
  for (let p = 0; p < n; p++) dark[p] = lum[p] < t ? 1 : 0;

  // Length of the dark run through each pixel, across and along.
  const runX = new Uint16Array(n), runY = new Uint16Array(n);
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      if (!dark[y * width + x]) { x++; continue; }
      let e = x;
      while (e < width && dark[y * width + e]) e++;
      for (let k = x; k < e; k++) runX[y * width + k] = Math.min(65535, e - x);
      x = e;
    }
  }
  for (let x = 0; x < width; x++) {
    let y = 0;
    while (y < height) {
      if (!dark[y * width + x]) { y++; continue; }
      let e = y;
      while (e < height && dark[e * width + x]) e++;
      for (let k = y; k < e; k++) runY[k * width + x] = Math.min(65535, e - y);
      y = e;
    }
  }
  const wall = new Uint8Array(n);
  for (let p = 0; p < n; p++) wall[p] = dark[p] && Math.min(runX[p], runY[p]) >= minWall ? 1 : 0;
  return { width, height, wall, dark };
}

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

type Side = "x0" | "x1" | "y0" | "y1";

/**
 * Faces on one side, from rays started at (start, a) for each `a` in `lanes`:
 * horizontal rays for x0/x1 (lanes are rows), vertical for y0/y1 (columns).
 * Returns the median face of the rays that met a wall — or the image edge,
 * marked open, when fewer than two did. Null if no ray could start.
 */
function castSide(map: WallMap, side: Side, start: number, lanes: number[]): { face: number; open: boolean } | null {
  const { width, height, wall } = map;
  const horizontal = side === "x0" || side === "x1";
  const step = side === "x0" || side === "y0" ? -1 : 1;
  const limit = horizontal ? width : height;
  const at = (i: number, lane: number) => wall[horizontal ? lane * width + i : i * width + lane];
  const faces: number[] = [];
  let started = 0;
  for (const lane of lanes) {
    if (at(start, lane)) continue; // starts inside a wall or a symbol
    started++;
    let i = start;
    while (i >= 0 && i < limit && !at(i, lane)) i += step;
    if (i >= 0 && i < limit) faces.push(step < 0 ? i + 1 : i);
  }
  if (!started) return null;
  if (faces.length < 2) return { face: step < 0 ? 0 : limit, open: true };
  return { face: median(faces), open: false };
}

/** `count` positions spread across [a, b), inside the image. */
function spread(a: number, b: number, count: number, max: number): number[] {
  const out = new Set<number>();
  for (let k = 0; k < count; k++) out.add(Math.min(max - 1, Math.max(0, Math.round(a + ((b - a) * (k + 0.5)) / count))));
  return [...out];
}

/**
 * The rectangle of floor around (x, y), or null if the point is on a wall,
 * outside the building (rays run off the image), or the area is too small
 * to be a room.
 */
export function roomAt(map: WallMap, x: number, y: number): PixelRect | null {
  const { width, height, wall } = map;
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= width || y >= height || wall[y * width + x]) return null;
  const near = Math.max(2, Math.round(Math.min(width, height) * 0.01));

  // First guess: a narrow bundle of rays through the point. A side seen through a window stays at the image edge for now.
  let rect: PixelRect = { x0: 0, y0: 0, x1: width, y1: height };
  const firstRows = spread(y - 2 * near, y + 2 * near, 5, height);
  const firstCols = spread(x - 2 * near, x + 2 * near, 5, width);
  for (const [side, start, lanes] of [["x0", x, firstRows], ["x1", x, firstRows], ["y0", y, firstCols], ["y1", y, firstCols]] as const) {
    const hit = castSide(map, side, start, lanes);
    if (!hit) return null;
    rect[side] = hit.face;
  }

  // Refine: rays from across the whole room, alternating directions, so a door or window on one side is outvoted.
  let open = true;
  for (let pass = 0; pass < 4; pass++) {
    const next = { ...rect };
    const rows = spread(rect.y0, rect.y1, 11, height), cols = spread(rect.x0, rect.x1, 11, width);
    open = false;
    for (const [side, start, lanes] of [["x0", x, rows], ["x1", x, rows], ["y0", y, cols], ["y1", y, cols]] as const) {
      const hit = castSide(map, side, start, lanes);
      if (!hit || hit.open) { open = true; continue; }
      next[side] = hit.face;
    }
    const settled = next.x0 === rect.x0 && next.x1 === rect.x1 && next.y0 === rect.y0 && next.y1 === rect.y1;
    rect = next;
    if (settled) break;
  }
  if (open) return null;

  const minRoom = Math.max(8, Math.min(width, height) * 0.03);
  if (rect.x1 - rect.x0 < minRoom || rect.y1 - rect.y0 < minRoom) return null;
  return rect;
}

const area = (r: PixelRect) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
function overlapArea(a: PixelRect, b: PixelRect) {
  return area({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });
}

/** Whether a new rectangle mostly repeats one already found. */
export const repeats = (rect: PixelRect, found: PixelRect[]) =>
  found.some((f) => overlapArea(rect, f) > 0.3 * Math.min(area(rect), area(f)));

/**
 * The share of each side of `rect` that is bounded by the plan: dark pixels
 * (a wall, or a window's thin lines) just outside it. A real room scores high
 * on all four sides, broken only by doors; a strip carved out of an open-plan
 * area has a side with nothing along it.
 */
export function enclosure(map: WallMap, rect: PixelRect): number[] {
  const { width, height } = map;
  const ink = map.dark ?? map.wall;
  const dark = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && ink[y * width + x] === 1;
  const reach = Math.max(3, Math.round(Math.min(width, height) * 0.006));
  const side = (count: number, at: (k: number, d: number) => [number, number]) => {
    let hits = 0;
    for (let k = 0; k < count; k++) {
      for (let d = 0; d <= reach; d++) if (dark(...at(k, d))) { hits++; break; }
    }
    return hits / Math.max(1, count);
  };
  const w = rect.x1 - rect.x0, h = rect.y1 - rect.y0;
  return [
    side(w, (k, d) => [rect.x0 + k, rect.y0 - 1 - d]),
    side(w, (k, d) => [rect.x0 + k, rect.y1 + d]),
    side(h, (k, d) => [rect.x0 - 1 - d, rect.y0 + k]),
    side(h, (k, d) => [rect.x1 + d, rect.y0 + k]),
  ];
}

/** Every side at least 40% bounded, and 65% overall: doors break walls, open plans don't have them. */
const enclosed = (map: WallMap, rect: PixelRect) => {
  const sides = enclosure(map, rect);
  return Math.min(...sides) >= 0.4 && sides.reduce((a, b) => a + b, 0) / 4 >= 0.65;
};

/** Overlapping more than a sliver of a room already found. */
const overlapsFound = (rect: PixelRect, found: PixelRect[]) =>
  found.some((f) => overlapArea(rect, f) > 0.1 * Math.min(area(rect), area(f)));

/**
 * Every room-like rectangle in the plan: try points on a grid, skipping
 * points already inside a found room. Largest first.
 */
export function detectRooms(map: WallMap): PixelRect[] {
  const { width, height } = map;
  const step = Math.max(6, Math.round(Math.min(width, height) / 40));
  const found: PixelRect[] = [];
  const minArea = (Math.min(width, height) * 0.06) ** 2;
  for (let y = Math.round(step / 2); y < height; y += step) {
    for (let x = Math.round(step / 2); x < width; x += step) {
      if (found.some((r) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1)) continue;
      const rect = roomAt(map, x, y);
      if (rect && area(rect) >= minArea && !overlapsFound(rect, found) && enclosed(map, rect)) found.push(rect);
    }
  }
  return found.sort((a, b) => area(b) - area(a));
}

/** Smaller than this (m²) and an area is more likely a shaft, a closet or a symbol than a room. */
export const SMALL_ROOM_AREA = 1;

/**
 * How a traced rectangle measures up at this scale: "tooSmall" if a side is
 * under the editor's smallest room (it would be stretched to fit, so it is
 * skipped), "small" if under SMALL_ROOM_AREA, otherwise "ok".
 */
export function roomFit(rect: PixelRect, metersPerPixel: number): "ok" | "small" | "tooSmall" {
  const w = (rect.x1 - rect.x0) * metersPerPixel, d = (rect.y1 - rect.y0) * metersPerPixel;
  if (w < ROOM_LIMITS.min.width - 1e-6 || d < ROOM_LIMITS.min.depth - 1e-6) return "tooSmall";
  return w * d < SMALL_ROOM_AREA ? "small" : "ok";
}

/**
 * Whether the scale is clearly wrong: the largest room's long side under
 * 1.5 m, or the whole plan over 80 m across. Lengths in meters.
 */
export function scaleProblem(rects: PixelRect[], metersPerPixel: number):
  { kind: "tiny"; largest: number } | { kind: "huge"; across: number } | null {
  if (!rects.length) return null;
  const largest = Math.max(...rects.map((r) => Math.max(r.x1 - r.x0, r.y1 - r.y0))) * metersPerPixel;
  if (largest < 1.5) return { kind: "tiny", largest };
  const across = Math.max(Math.max(...rects.map((r) => r.x1)) - Math.min(...rects.map((r) => r.x0)),
    Math.max(...rects.map((r) => r.y1)) - Math.min(...rects.map((r) => r.y0))) * metersPerPixel;
  return across > 80 ? { kind: "huge", across } : null;
}

export interface PlanRoom {
  name: string;
  rect: PixelRect;
  /** Sides that flow into a neighbor with no wall between. */
  openWalls?: Wall[];
}

/** A door or window on the plan: the two ends of its opening, in pixels. */
export interface PlanOpening {
  kind: "door" | "window";
  a: [number, number];
  b: [number, number];
}

/** How far (m) an opening may sit from a room's inner wall face and still be in that wall: about a thick wall. */
const WALL_REACH = 0.35;

/**
 * The openings of one room: each plan opening that runs along one of the
 * room's sides, within a wall's thickness of it, lands in that wall. A door
 * between two rooms lands in both, so both walls have the gap.
 */
export function roomOpenings(rect: PixelRect, openings: PlanOpening[], metersPerPixel: number, height: number): Opening[] {
  const reach = WALL_REACH / metersPerPixel;
  const sides: { wall: Wall; horizontal: boolean; at: number; from: number; to: number }[] = [
    { wall: "back", horizontal: true, at: rect.y0, from: rect.x0, to: rect.x1 },
    { wall: "front", horizontal: true, at: rect.y1, from: rect.x0, to: rect.x1 },
    { wall: "left", horizontal: false, at: rect.x0, from: rect.y0, to: rect.y1 },
    { wall: "right", horizontal: false, at: rect.x1, from: rect.y0, to: rect.y1 },
  ];
  const result: Opening[] = [];
  openings.forEach((o, i) => {
    const horizontal = Math.abs(o.b[0] - o.a[0]) >= Math.abs(o.b[1] - o.a[1]);
    const [p, q] = horizontal ? [o.a[0], o.b[0]] : [o.a[1], o.b[1]];
    const across = horizontal ? (o.a[1] + o.b[1]) / 2 : (o.a[0] + o.b[0]) / 2;
    const lo = Math.min(p, q), hi = Math.max(p, q);
    for (const s of sides) {
      if (s.horizontal !== horizontal || Math.abs(across - s.at) > reach) continue;
      const start = Math.max(lo, s.from), end = Math.min(hi, s.to);
      if (end - start < (hi - lo) * 0.5) continue; // mostly past this room's corner
      const window = o.kind === "window";
      result.push({
        id: `plan-${o.kind}-${i}-${s.wall}`,
        type: o.kind,
        name: window ? "Window" : "Door",
        wall: s.wall,
        offset: Math.round(((start + end) / 2 - s.from) * metersPerPixel * 1000) / 1000,
        width: Math.round((end - start) * metersPerPixel * 1000) / 1000,
        height: window ? Math.min(1.5, height - 1) : Math.min(2.1, height - 0.1),
        elevation: window ? 0.9 : 0,
        hinge: "start",
      });
    }
  });
  return result;
}

/**
 * Rooms for the editor from rectangles traced on the plan. Each room's
 * interior is the traced rectangle; positions keep their places on the
 * plan, with the plan's top edge as the back (−Z). Doors and windows read
 * from the plan go into the walls they sit in.
 */
export function planToProject(rooms: PlanRoom[], metersPerPixel: number, height: number, name: string,
  openings: PlanOpening[] = []): ProjectTemplate {
  const minX = Math.min(...rooms.map((r) => r.rect.x0)), minY = Math.min(...rooms.map((r) => r.rect.y0));
  const mm = (v: number) => Math.round(v * 1000) / 1000;
  return {
    name,
    rooms: rooms.map(({ name: roomName, rect, openWalls }): RoomTemplate & { position: [number, number]; rotation: number } => ({
      name: roomName,
      ...(openWalls?.length ? { openWalls } : {}),
      position: [mm((rect.x0 - minX) * metersPerPixel), mm((rect.y0 - minY) * metersPerPixel)],
      rotation: 0,
      room: { width: mm((rect.x1 - rect.x0) * metersPerPixel), depth: mm((rect.y1 - rect.y0) * metersPerPixel), height },
      furniture: [],
      openings: roomOpenings(rect, openings, metersPerPixel, height),
    })),
  };
}
