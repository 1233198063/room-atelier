import { describe, expect, it } from "vitest";
import { planToProject, roomOpenings, wallMap, type PixelRect } from "./floorPlan";
import { parseSizeLabel, planScale, readingOpenings, readingToRooms, type FloorPlanReading } from "./floorPlanAi";

/** The 400 × 300 test plan from floorPlan.test.ts: room A on the left, B and C on the right, 8 px walls. */
function plan() {
  const W = 400, H = 300;
  const data = new Uint8ClampedArray(W * H * 4).fill(255);
  const paint = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data.set([40, 40, 40, 255], (y * W + x) * 4);
  };
  paint(20, 20, 380, 28); paint(20, 272, 380, 280); paint(20, 20, 28, 280); paint(372, 20, 380, 280);
  paint(200, 28, 208, 180); paint(200, 215, 208, 272);
  paint(208, 120, 280, 128); paint(300, 120, 372, 128);
  return wallMap(data, W, H);
}

const A: PixelRect = { x0: 28, y0: 28, x1: 200, y1: 272 };
const B: PixelRect = { x0: 208, y0: 28, x1: 372, y1: 120 };
const C: PixelRect = { x0: 208, y0: 128, x1: 372, y1: 272 };
/** Pixels → Claude's 0–1000 coordinates, nudged by `off` to stand in for its imprecision. */
const box = (r: PixelRect, off = 0) => ({
  left: Math.round((r.x0 / 400) * 1000) + off, right: Math.round((r.x1 / 400) * 1000) - off,
  top: Math.round((r.y0 / 300) * 1000) - off, bottom: Math.round((r.y1 / 300) * 1000) + off,
});

const reading = (rooms: FloorPlanReading["rooms"], extra: Partial<FloorPlanReading> = {}): FloorPlanReading =>
  ({ units: "metric", rooms, dimensionLines: [], openings: [], ...extra });

describe("reading a floor plan with Claude", () => {
  const map = plan();

  it("moves approximate boxes onto the wall faces", () => {
    const rooms = readingToRooms(reading([
      { name: "LIVING", kind: "living", box: box(A, 12), sizeLabel: null },
      { name: "BED", kind: "bedroom", box: box(B, -9), sizeLabel: null },
      { name: null, kind: "bathroom", box: box(C, 7), sizeLabel: null },
    ]), map);
    expect(rooms.map((r) => r.rect)).toEqual([A, B, C]);
    expect(rooms.every((r) => Object.values(r.open).every((o) => !o))).toBe(true);
    expect(rooms.every((r) => r.openWalls.length === 0)).toBe(true);
  });

  it("lets open-plan zones meet where no wall divides them", () => {
    // Room A labeled as two zones, split at y = 150 where the plan has no wall.
    const top = { ...A, y1: 150 }, bottom = { ...A, y0: 150 };
    const rooms = readingToRooms(reading([
      { name: "LOUNGE", kind: "living", box: { ...box(top, 5), bottom: 490 }, sizeLabel: null },
      { name: "DINE", kind: "dining", box: { ...box(bottom, 5), top: 515 }, sizeLabel: null },
    ]), map);
    expect(rooms[0].open.y1).toBe(true);
    expect(rooms[0].rect.y1).toBe(rooms[1].rect.y0);
    expect(rooms[0].openWalls).toEqual(["front"]);
    expect(rooms[1].openWalls).toEqual(["back"]);
    const project = planToProject(rooms.map((r) => ({ name: r.name!, rect: r.rect, openWalls: r.openWalls })), 0.025, 2.8, "Plan");
    expect(project.rooms.map((r) => r.openWalls)).toEqual([["front"], ["back"]]);
    expect(rooms[0].rect).toMatchObject({ x0: 28, x1: 200, y0: 28 });
    expect(rooms[1].rect).toMatchObject({ x0: 28, x1: 200, y1: 272 });
  });

  it("reads printed room sizes", () => {
    expect(parseSizeLabel("11'X11'", "imperial")).toEqual([0.3048 * 11, 0.3048 * 11].map((v) => expect.closeTo(v, 6)));
    expect(parseSizeLabel(`12'6" x 10'`, "imperial")).toEqual([expect.closeTo(3.81, 6), expect.closeTo(3.048, 6)]);
    expect(parseSizeLabel("11X13", "imperial")).toEqual([expect.closeTo(3.3528, 6), expect.closeTo(3.9624, 6)]);
    expect(parseSizeLabel("3600×4200", "metric")).toEqual([3.6, 4.2]);
    expect(parseSizeLabel("3.6m*4.2m", "unknown")).toEqual([expect.closeTo(3.6, 6), expect.closeTo(4.2, 6)]);
    expect(parseSizeLabel("MASTER", "imperial")).toBeNull();
  });

  it("sets the scale from printed sizes, either way round, skipping sizes that don't fit", () => {
    const rooms = readingToRooms(reading([
      { name: "A", kind: "living", box: box(A), sizeLabel: "6100×4300" }, // printed depth-first
      { name: "B", kind: "bedroom", box: box(B), sizeLabel: "4100 x 2300" },
      { name: "C", kind: "bathroom", box: box(C), sizeLabel: "9000×1000" }, // a misprint
    ]), map);
    const scale = planScale(rooms, reading([]), map)!;
    expect(scale.source).toBe("labels");
    expect(scale.metersPerPixel).toBeCloseTo(0.025, 4);
    expect(scale.used).toEqual(["A 6100×4300", "B 4100 x 2300"]);
  });

  it("falls back to dimension lines", () => {
    const withLines = reading([], { dimensionLines: [{ text: "9000", from: { x: 50, y: 30 }, to: { x: 950, y: 30 } }] });
    expect(planScale([], withLines, map)?.metersPerPixel).toBeCloseTo(9 / 360, 4);
    expect(planScale([], reading([]), map)).toBeNull();
  });

  it("puts a door in the walls of both rooms it joins", () => {
    const door = readingOpenings(reading([], {
      openings: [{ kind: "door", from: { x: 510, y: 600 }, to: { x: 510, y: 717 } }],
    }), map);
    expect(door[0]).toEqual({ kind: "door", a: [204, 180], b: [204, 215] });
    expect(roomOpenings(A, door, 0.025, 2.8)).toEqual([expect.objectContaining({ wall: "right", offset: 4.238, width: 0.875, type: "door" })]);
    expect(roomOpenings(C, door, 0.025, 2.8)).toEqual([expect.objectContaining({ wall: "left", offset: 1.738, width: 0.875 })]);
    expect(roomOpenings(B, door, 0.025, 2.8)).toEqual([]);
    const project = planToProject([{ name: "A", rect: A }], 0.025, 2.8, "Plan", door);
    expect(project.rooms[0].openings).toHaveLength(1);
  });
});
