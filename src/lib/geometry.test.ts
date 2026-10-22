import { describe, expect, it } from "vitest";
import type { Furniture, Room } from "../types";
import {
  alignedPosition,
  clampToRoom,
  findFreeSpot,
  footprintBounds,
  footprintHalfExtents,
  normalizeDeg,
  snapPosition,
  toCm,
  wallClearances,
} from "./geometry";

const room: Room = { width: 4, depth: 3, height: 2.6 };
const desk = { width: 1.2, depth: 0.6, height: 0.75 };

const piece = (over: Partial<Furniture> = {}): Furniture => ({
  id: "a",
  type: "desk",
  name: "Desk",
  position: [2, 0, 1.5],
  rotation: 0,
  dimensions: desk,
  ...over,
});

describe("units", () => {
  it("converts meters to cm without float noise", () => {
    expect(toCm(0.1 + 0.2)).toBe(30);
    expect(toCm(1.2345)).toBe(123.5);
  });

  it("normalizes angles into [0, 360)", () => {
    expect(normalizeDeg(-90)).toBe(270);
    expect(normalizeDeg(360)).toBe(0);
    expect(normalizeDeg(450)).toBe(90);
    expect(normalizeDeg(-0.01)).toBe(0);
  });
});

describe("footprints", () => {
  it("swaps width and depth at 90°", () => {
    const { hx, hz } = footprintHalfExtents(desk, 90);
    expect(hx).toBeCloseTo(0.3);
    expect(hz).toBeCloseTo(0.6);
  });

  it("grows the bounding box at 45°", () => {
    const { hx } = footprintHalfExtents({ width: 1, depth: 1, height: 1 }, 45);
    expect(hx).toBeCloseTo(Math.SQRT2 / 2);
  });

  it("measures clearance to each wall from the footprint edges", () => {
    const c = wallClearances(piece(), room);
    expect(c.left).toBeCloseTo(1.4);
    expect(c.right).toBeCloseTo(1.4);
    expect(c.back).toBeCloseTo(1.2);
    expect(c.front).toBeCloseTo(1.2);
  });
});

describe("constraints", () => {
  it("keeps the rotated footprint inside the room", () => {
    expect(clampToRoom(-5, 99, desk, 0, room)).toEqual([0.6, 2.7]);
    const [x] = clampToRoom(0, 1, desk, 90, room);
    expect(x).toBeCloseTo(0.3);
  });

  it("centers a piece that is larger than the room", () => {
    expect(clampToRoom(0, 0, { width: 5, depth: 5, height: 1 }, 0, room)).toEqual([2, 1.5]);
  });

  it("snaps to the grid and sticks to nearby walls", () => {
    expect(snapPosition(1.23, 1.52, desk, 0, room, 0.05)).toEqual([1.25, 1.5]);
    // left edge 4 cm from the wall → pulled flush
    const [x] = snapPosition(0.64, 1.5, desk, 0, room, 0.05);
    expect(x).toBeCloseTo(0.6);
  });

  it("aligns flush against a wall", () => {
    const [x, z] = alignedPosition(piece(), room, "right");
    expect(footprintBounds(piece({ position: [x, 0, z] })).maxX).toBeCloseTo(room.width);
  });
});

describe("findFreeSpot", () => {
  it("avoids existing furniture", () => {
    const existing = [piece()];
    const [x, z] = findFreeSpot(desk, room, existing);
    const b = footprintBounds({ position: [x, 0, z], dimensions: desk, rotation: 0 });
    const o = footprintBounds(existing[0]);
    const overlaps = b.minX < o.maxX && b.maxX > o.minX && b.minZ < o.maxZ && b.maxZ > o.minZ;
    expect(overlaps).toBe(false);
  });
});
