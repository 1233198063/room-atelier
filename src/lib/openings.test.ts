import { describe, expect, it } from "vitest";
import type { Opening, Room } from "../types";
import { constrainOpening, findOpeningSpot, openingClearances, WALL_T, wallSegments, wallToWorld } from "./openings";

const room: Room = { width: 4, depth: 3, height: 2.5 };

const opening = (over: Partial<Opening> = {}): Opening => ({
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

describe("wallToWorld", () => {
  it("maps along/inward coordinates onto each wall", () => {
    expect(wallToWorld("back", 1, 0.5, room)).toEqual([1, 0.5]);
    expect(wallToWorld("front", 1, 0.5, room)).toEqual([1, 2.5]);
    expect(wallToWorld("left", 1, 0.5, room)).toEqual([0.5, 1]);
    expect(wallToWorld("right", 1, 0.5, room)).toEqual([3.5, 1]);
  });
});

describe("wallSegments", () => {
  it("is a single box for a plain wall", () => {
    expect(wallSegments("back", room, [])).toEqual([{ a0: 0, a1: 4, y0: 0, y1: 2.5 }]);
  });

  it("extends side walls past the corners", () => {
    expect(wallSegments("left", room, [])).toEqual([{ a0: -WALL_T, a1: 3 + WALL_T, y0: 0, y1: 2.5 }]);
  });

  it("leaves a sill and lintel around a window", () => {
    const segs = wallSegments("back", room, [opening()]);
    expect(segs).toContainEqual({ a0: 1.5, a1: 2.5, y0: 0, y1: 0.9 }); // sill
    expect(segs).toContainEqual({ a0: 1.5, a1: 2.5, y0: 2.1, y1: 2.5 }); // lintel
    expect(segs).toContainEqual({ a0: 0, a1: 1.5, y0: 0, y1: 2.5 });
    expect(segs).toContainEqual({ a0: 2.5, a1: 4, y0: 0, y1: 2.5 });
    expect(segs).toHaveLength(4);
  });

  it("leaves a gap down to the floor for a door", () => {
    const segs = wallSegments("back", room, [opening({ type: "door", elevation: 0, height: 2.1 })]);
    expect(segs.some((s) => s.a0 >= 1.5 && s.a1 <= 2.5 && s.y0 === 0)).toBe(false);
  });

  it("handles overlapping openings", () => {
    const segs = wallSegments("back", room, [opening({ offset: 1.8 }), opening({ id: "p", offset: 2.3 })]);
    // the overlapped stretch has one sill and one lintel, no slivers
    const inside = segs.filter((s) => s.a0 >= 1.3 - 1e-9 && s.a1 <= 2.8 + 1e-9);
    expect(inside.every((s) => s.y1 <= 0.9 + 1e-9 || s.y0 >= 2.1 - 1e-9)).toBe(true);
  });

  it("ignores openings on other walls", () => {
    expect(wallSegments("front", room, [opening()])).toHaveLength(1);
  });
});

describe("constrainOpening", () => {
  it("keeps the opening on its wall", () => {
    const o = constrainOpening(opening({ offset: 99 }), room);
    expect(o.offset).toBe(3.5);
    expect(openingClearances(o, room).end).toBeCloseTo(0);
  });

  it("keeps windows below the ceiling and doors on the floor", () => {
    expect(constrainOpening(opening({ elevation: 2 }), room).elevation).toBeCloseTo(1.3);
    expect(constrainOpening(opening({ type: "door", elevation: 1, height: 2.1 }), room).elevation).toBe(0);
  });

  it("never makes an opening wider than its wall", () => {
    expect(constrainOpening(opening({ width: 4, wall: "left" }), room).width).toBe(3);
  });
});

describe("findOpeningSpot", () => {
  it("puts doors on the front wall and windows on the back wall by default", () => {
    expect(findOpeningSpot("door", 0.9, room, []).wall).toBe("front");
    expect(findOpeningSpot("window", 1.2, room, [])).toEqual({ wall: "back", offset: 2 });
  });

  it("avoids existing openings on the wall", () => {
    const spot = findOpeningSpot("window", 1, room, [opening()]);
    expect(spot.wall).toBe("back");
    expect(Math.abs(spot.offset - 2)).toBeGreaterThanOrEqual(1.1 - 1e-9);
  });

  it("honors a preferred wall", () => {
    expect(findOpeningSpot("window", 1, room, [], "right").wall).toBe("right");
  });
});
