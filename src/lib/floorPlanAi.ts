import type { FloorPlanReading, RoomKindName } from "../../server/floorPlanSchema";
import type { Wall } from "../types";
import type { PixelRect, PlanOpening, WallMap } from "./floorPlan";
import { parseFieldInput } from "./units";

/**
 * Turning Claude's reading of a floor plan into rooms the editor can build.
 *
 * Claude knows what the rooms are, what they're called and what sizes are
 * printed, but its coordinates are approximate. The wall map knows exactly
 * where the walls are. So each room's box is moved onto the nearest wall face
 * on each side; a side with no wall nearby (an open-plan boundary) keeps
 * Claude's line, and neighbors sharing one meet exactly.
 *
 * The printed sizes then give the scale: a room labeled 11'X11' whose snapped
 * box is 300 px square means 11 ft = 300 px.
 */

export type { FloorPlanReading, RoomKindName };
type Side = "x0" | "x1" | "y0" | "y1";

export interface ReadRoom {
  name: string | null;
  kind: RoomKindName;
  rect: PixelRect;
  sizeLabel: string | null;
  /** Sides that met no wall: open to a neighbor or to the outside. */
  open: Record<Side, boolean>;
  /** Sides that meet an open-plan neighbor: built without a wall. */
  openWalls: Wall[];
}

const SIDE_WALL: Record<Side, Wall> = { y0: "back", y1: "front", x0: "left", x1: "right" };

/** 0–1000 → pixels, clamped to the image. */
const toPx = (v: number, size: number) => Math.round((Math.min(1000, Math.max(0, v)) / 1000) * size);

/** Positions spread across [a, b], skipping the 15% at each end (corners, door swings). */
function samples(a: number, b: number, count: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < count; k++) out.push(Math.round(a + (b - a) * (0.15 + (0.7 * k) / Math.max(1, count - 1))));
  return out;
}

/**
 * The wall face nearest `rect`'s side within `tol` pixels, scored by the
 * share of the side it runs along. A face has wall on the outside and floor
 * on the inside, so the far face of a neighbor's wall never matches.
 */
export function snapSide(map: WallMap, rect: PixelRect, side: Side, tol: number): { at: number; score: number } {
  const { width, height, wall } = map;
  const horizontal = side === "x0" || side === "x1";
  const lanes = horizontal ? samples(rect.y0, rect.y1, 21) : samples(rect.x0, rect.x1, 21);
  const isWall = (along: number, lane: number) => {
    const x = horizontal ? along : lane, y = horizontal ? lane : along;
    return x >= 0 && y >= 0 && x < width && y < height ? wall[y * width + x] === 1 : false;
  };
  const start = rect[side];
  let best = { at: start, score: 0 }, bestRank = -Infinity;
  for (let at = start - tol; at <= start + tol; at++) {
    let hits = 0;
    for (const lane of lanes) {
      // x0/y0: wall just before the face; x1/y1 (exclusive): wall at the face.
      const outside = side === "x0" || side === "y0" ? at - 1 : at;
      const inside = side === "x0" || side === "y0" ? at : at - 1;
      if (isWall(outside, lane) && !isWall(inside, lane)) hits++;
    }
    const score = hits / lanes.length;
    const rank = score - (Math.abs(at - start) / tol) * 0.1; // nearer faces win ties
    if (rank > bestRank) { bestRank = rank; best = { at, score }; }
  }
  return best;
}

/** A face covering under this share of a side doesn't count as that side's wall. */
const MIN_FACE = 0.3;

function join(room: ReadRoom, side: Side) {
  if (!room.openWalls.includes(SIDE_WALL[side])) room.openWalls.push(SIDE_WALL[side]);
}

export function readingToRooms(reading: FloorPlanReading, map: WallMap): ReadRoom[] {
  const { width, height } = map;
  const reach = Math.max(6, Math.round(Math.max(width, height) * 0.035));
  const rooms: ReadRoom[] = reading.rooms.map((r) => {
    let rect: PixelRect = {
      x0: toPx(Math.min(r.box.left, r.box.right), width), x1: toPx(Math.max(r.box.left, r.box.right), width),
      y0: toPx(Math.min(r.box.top, r.box.bottom), height), y1: toPx(Math.max(r.box.top, r.box.bottom), height),
    };
    const open = { x0: true, x1: true, y0: true, y1: true };
    for (const side of ["x0", "x1", "y0", "y1"] as Side[]) {
      const span = side === "x0" || side === "x1" ? rect.x1 - rect.x0 : rect.y1 - rect.y0;
      const hit = snapSide(map, rect, side, Math.max(2, Math.min(reach, Math.round(span * 0.4))));
      if (hit.score >= MIN_FACE) { rect = { ...rect, [side]: hit.at }; open[side] = false; }
    }
    return { name: r.name?.trim() || null, kind: r.kind, rect, sizeLabel: r.sizeLabel?.trim() || null, open, openWalls: [] as Wall[] };
  }).filter((r) => r.rect.x1 - r.rect.x0 >= 4 && r.rect.y1 - r.rect.y0 >= 4);

  // Open-plan neighbors: where both facing sides met no wall, close the gap or overlap on the midline.
  for (const a of rooms) for (const b of rooms) {
    if (a === b) continue;
    const ySpan = Math.min(a.rect.y1, b.rect.y1) - Math.max(a.rect.y0, b.rect.y0);
    if (a.open.x1 && b.open.x0 && ySpan > 0 && Math.abs(a.rect.x1 - b.rect.x0) <= reach) {
      const mid = Math.round((a.rect.x1 + b.rect.x0) / 2);
      a.rect = { ...a.rect, x1: mid };
      b.rect = { ...b.rect, x0: mid };
      join(a, "x1");
      join(b, "x0");
    }
    const xSpan = Math.min(a.rect.x1, b.rect.x1) - Math.max(a.rect.x0, b.rect.x0);
    if (a.open.y1 && b.open.y0 && xSpan > 0 && Math.abs(a.rect.y1 - b.rect.y0) <= reach) {
      const mid = Math.round((a.rect.y1 + b.rect.y0) / 2);
      a.rect = { ...a.rect, y1: mid };
      b.rect = { ...b.rect, y0: mid };
      join(a, "y1");
      join(b, "y0");
    }
  }
  return rooms;
}

const HAS_MARKS = /['"‘’“”′″＇＂]|ft|feet|foot|in\b|inch/i;

/** One printed length in meters: marks and units as written, bare numbers by the plan's system and size. */
function parsePrintedLength(text: string, units: FloorPlanReading["units"]): number | null {
  const t = text.trim();
  if (!t) return null;
  if (HAS_MARKS.test(t) || /\d\s*(mm|cm|m)\b/i.test(t)) {
    const cm = parseFieldInput(t, "length", units === "imperial" ? "ft" : "cm");
    return cm !== null && cm > 0 ? cm / 100 : null;
  }
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (units === "imperial") return n * 0.3048; // "11X11" on an imperial plan is feet
  return n >= 1000 ? n / 1000 : n >= 100 ? n / 100 : n; // 3600 mm, 360 cm, 3.6 m
}

/** A room size as printed ("11'X11'", "12'6\" x 10'", "3600×4200") → its two lengths in meters. */
export function parseSizeLabel(text: string, units: FloorPlanReading["units"]): [number, number] | null {
  const parts = text.split(/\s*[x×X*✕]\s*/).filter(Boolean);
  if (parts.length !== 2) return null;
  const a = parsePrintedLength(parts[0], units), b = parsePrintedLength(parts[1], units);
  return a && b ? [a, b] : null;
}

const median = (values: number[]) => [...values].sort((p, q) => p - q)[Math.floor(values.length / 2)];

export interface PlanScale {
  metersPerPixel: number;
  /** What it came from: room size labels or dimension lines, as printed. */
  source: "labels" | "dimensions";
  used: string[];
}

/**
 * The scale from rooms' printed sizes: each labeled room's snapped box gives
 * one estimate (the label's lengths matched to the box's sides whichever way
 * round fits); labels that fit neither way are skipped. Falls back to the
 * plan's dimension lines.
 */
export function planScale(rooms: ReadRoom[], reading: FloorPlanReading, map: WallMap): PlanScale | null {
  const estimates: number[] = [], used: string[] = [];
  for (const r of rooms) {
    if (!r.sizeLabel) continue;
    const size = parseSizeLabel(r.sizeLabel, reading.units);
    if (!size) continue;
    const w = r.rect.x1 - r.rect.x0, h = r.rect.y1 - r.rect.y0;
    const fits = [[size[0] / w, size[1] / h], [size[1] / w, size[0] / h]]
      .map(([sx, sy]) => ({ s: Math.sqrt(sx * sy), off: Math.abs(Math.log(sx / sy)) }))
      .sort((p, q) => p.off - q.off)[0];
    if (fits.off > Math.log(1.25)) continue; // printed size doesn't match this box's shape
    estimates.push(fits.s);
    used.push(r.name ? `${r.name} ${r.sizeLabel}` : r.sizeLabel);
  }
  if (estimates.length) return { metersPerPixel: median(estimates), source: "labels", used };

  const lines: number[] = [], usedLines: string[] = [];
  for (const d of reading.dimensionLines) {
    const value = parsePrintedLength(d.text, reading.units);
    const length = Math.hypot((d.to.x - d.from.x) / 1000 * map.width, (d.to.y - d.from.y) / 1000 * map.height);
    if (!value || length < Math.max(map.width, map.height) * 0.05) continue;
    lines.push(value / length);
    usedLines.push(d.text);
  }
  return lines.length ? { metersPerPixel: median(lines), source: "dimensions", used: usedLines } : null;
}

/** Doors and windows in pixels. */
export function readingOpenings(reading: FloorPlanReading, map: WallMap): PlanOpening[] {
  return reading.openings.map((o) => ({
    kind: o.kind,
    a: [toPx(o.from.x, map.width), toPx(o.from.y, map.height)],
    b: [toPx(o.to.x, map.width), toPx(o.to.y, map.height)],
  }));
}
