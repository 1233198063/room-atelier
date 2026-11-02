import { describe, expect, it } from "vitest";
import type { Furniture, FurnitureType, Opening, Room } from "../types";
import { surfaceHeightAt } from "./geometry";
import { checkLayout } from "./layoutChecks";
import { pointInPolygon, polygonsOverlap, rayToPolygon, type Pt } from "./polygon";
import { SAMPLE_LAYOUT } from "./sampleLayout";

const room: Room = { width: 4, depth: 3, height: 2.6 };

let n = 0;
const piece = (
  type: FurnitureType,
  position: [number, number, number],
  dimensions: Furniture["dimensions"],
  rotation = 0,
): Furniture => ({ id: `${type}-${++n}`, type, name: type, position, rotation, dimensions });

const opening = (over: Partial<Opening>): Opening => ({
  id: "o",
  type: "window",
  name: "Window",
  wall: "back",
  offset: 2,
  width: 1,
  height: 1.2,
  elevation: 0.9,
  hinge: "start",
  ...over,
});

const window_ = opening({ id: "w" }); // keeps the daylight rule quiet
const keys = <T extends { key: string }>(issues: T[], prefix: string) => issues.filter((i) => i.key.startsWith(prefix));

describe("polygon helpers", () => {
  const square: Pt[] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const shifted = (dx: number, dz: number): Pt[] => square.map(([x, z]) => [x + dx, z + dz]);

  it("detects overlap but not touching", () => {
    expect(polygonsOverlap(square, shifted(0.5, 0.5))).toBe(true);
    expect(polygonsOverlap(square, shifted(1, 0))).toBe(false);
    expect(polygonsOverlap(square, shifted(2, 0))).toBe(false);
  });

  it("casts rays to polygons", () => {
    expect(rayToPolygon([-1, 0.5], [1, 0], square)).toBeCloseTo(1);
    expect(rayToPolygon([-1, 2], [1, 0], square)).toBe(Infinity);
    expect(rayToPolygon([0.5, 0.5], [1, 0], square)).toBe(0);
    expect(pointInPolygon([0.5, 0.5], square)).toBe(true);
  });
});

describe("surfaceHeightAt", () => {
  it("finds the top of a desk or dresser under a point", () => {
    const desk = piece("desk", [1, 0, 1], { width: 1.2, depth: 0.6, height: 0.75 });
    const bed = piece("bed", [3, 0, 1], { width: 1.4, depth: 2, height: 0.9 });
    expect(surfaceHeightAt(1.2, 1, [desk, bed])).toBe(0.75);
    expect(surfaceHeightAt(3, 1, [desk, bed])).toBe(0); // beds aren't shelves
    expect(surfaceHeightAt(2.2, 2.5, [desk, bed])).toBe(0);
  });
});

describe("checkLayout", () => {
  it("finds only the bed-side tip in the sample room", () => {
    const issues = checkLayout(SAMPLE_LAYOUT.room, SAMPLE_LAYOUT.furniture, SAMPLE_LAYOUT.openings);
    expect(issues.map((i) => [i.severity, i.key])).toEqual([["tip", "bed-access:sample-bed"]]);
    expect(issues[0].detail).toContain("50 cm");
  });

  it("flags overlapping furniture", () => {
    const a = piece("dresser", [2, 0, 1.5], { width: 1.2, depth: 0.48, height: 0.8 });
    const b = piece("dresser", [2.5, 0, 1.6], { width: 1.2, depth: 0.48, height: 0.8 });
    const [issue] = keys(checkLayout(room, [a, b], [window_]), "overlap");
    expect(issue.severity).toBe("warning");
    expect(issue.targets.sort()).toEqual([a.id, b.id].sort());
  });

  it("uses true rotated shapes, not bounding boxes", () => {
    // A 45° diamond whose bounding box overlaps the square, but whose shape doesn't.
    const diamond = piece("cabinet", [1, 0, 1], { width: 1, depth: 1, height: 0.8 }, 45);
    const square = piece("cabinet", [2.15, 0, 1.6], { width: 1, depth: 1, height: 0.8 });
    expect(keys(checkLayout(room, [diamond, square], [window_]), "overlap")).toHaveLength(0);
  });

  it("lets chairs tuck under desks and plants sit on top", () => {
    const desk = piece("desk", [2, 0, 1.5], { width: 1.2, depth: 0.6, height: 0.75 });
    const chair = piece("chair", [2, 0, 1.75], { width: 0.48, depth: 0.52, height: 0.85 });
    const plant = piece("plant", [2.3, 0.75, 1.33], { width: 0.22, depth: 0.22, height: 0.32 }); // back of the desk
    expect(keys(checkLayout(room, [desk, chair, plant], [window_]), "overlap")).toHaveLength(0);
  });

  it("flags furniture in a door's swing", () => {
    const door = opening({ id: "d", type: "door", wall: "front", offset: 1, width: 0.9, height: 2.1, elevation: 0 });
    const dresser = piece("dresser", [1.2, 0, 2.6], { width: 1.2, depth: 0.48, height: 0.8 });
    const [issue] = keys(checkLayout(room, [dresser], [door, window_]), "door-swing");
    expect(issue.targets).toEqual([dresser.id, "d"]);
  });

  it("flags tall furniture in front of a window, but not low pieces or plants", () => {
    const wardrobe = piece("cabinet", [2, 0, 0.25], { width: 1, depth: 0.5, height: 1.9 });
    const desk = piece("desk", [2, 0, 0.3], { width: 1.2, depth: 0.6, height: 0.75 });
    const plant = piece("plant", [2, 0, 0.3], { width: 0.5, depth: 0.5, height: 1.3 });
    expect(keys(checkLayout(room, [wardrobe], [window_]), "window-blocked")).toHaveLength(1);
    expect(keys(checkLayout(room, [desk], [window_]), "window-blocked")).toHaveLength(0);
    expect(keys(checkLayout(room, [plant], [window_]), "window-blocked")).toHaveLength(0);
  });

  it("needs room to sit at a desk", () => {
    const desk = piece("desk", [2, 0, 2.6], { width: 1.2, depth: 0.6, height: 0.75 }); // front 10 cm from the wall
    const [issue] = keys(checkLayout(room, [desk], [window_]), "seat-space");
    expect(issue.detail).toContain("10 cm");
  });

  it("notices a dresser facing the wall", () => {
    const dresser = piece("dresser", [2, 0, 0.24], { width: 1.2, depth: 0.48, height: 0.8 }, 180);
    const [issue] = keys(checkLayout(room, [dresser], [opening({ id: "w", wall: "right" })]), "opening-space");
    expect(issue.title).toContain("faces the wall");
  });

  it("warns when a bed is boxed in on both sides", () => {
    const narrow: Room = { width: 1.8, depth: 3, height: 2.6 };
    const bed = piece("bed", [0.9, 0, 1.025], { width: 1.6, depth: 2.05, height: 0.95 });
    const [issue] = keys(checkLayout(narrow, [bed], [window_]), "bed-access");
    expect(issue.severity).toBe("warning");
  });

  it("suggests daylight for desks and plants", () => {
    const desk = piece("desk", [2, 0, 2.5], { width: 1.2, depth: 0.6, height: 0.75 }, 180);
    expect(keys(checkLayout(room, [desk], []), "no-window")).toHaveLength(1);
    const far = opening({ id: "w", wall: "left", offset: 0.6 });
    expect(keys(checkLayout({ ...room, width: 6 }, [{ ...desk, position: [5, 0, 2.5] }], [far]), "daylight")).toHaveLength(1);
  });
});

describe("outdoor rooms", () => {
  it("skips window and daylight tips under the open sky", () => {
    const room = { width: 10, depth: 10, height: 6 };
    const plant = { id: "p", type: "plant" as const, name: "Pot", position: [5, 0, 5] as [number, number, number], rotation: 0,
      dimensions: { width: 0.5, depth: 0.5, height: 1 } };
    expect(checkLayout(room, [plant], []).map((i) => i.key)).toContain("no-window");
    expect(checkLayout(room, [plant], [], { outdoor: true })).toEqual([]);
  });
});
