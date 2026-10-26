import { describe, expect, it } from "vitest";
import type { ProjectRoom } from "../types";
import { DEFAULT_PALETTE } from "./palettes";
import { WALL_T } from "./openings";
import { localToWorld, projectBounds, roomBounds, roomsOverlap, snapRoomPosition, worldToLocal } from "./rooms";

const room = (patch: Partial<ProjectRoom> = {}): ProjectRoom => ({
  id: "a", name: "A", position: [0, 0], rotation: 0, room: { width: 4, depth: 3, height: 2.6 },
  furniture: [], openings: [], palette: DEFAULT_PALETTE, ...patch,
});

describe("room assembly geometry", () => {
  it.each([0, 90, 180, 270, 37])("round-trips local coordinates at %i degrees", (rotation) => {
    const r = room({ position: [-5, 7], rotation });
    const local = worldToLocal(localToWorld([1.2, 2.1], r), r);
    expect(local[0]).toBeCloseTo(1.2);
    expect(local[1]).toBeCloseTo(2.1);
  });

  it("rotates around the room origin like Three.js", () => {
    const b = roomBounds(room({ rotation: 90, position: [-2, 1] }));
    expect(b.minX).toBeCloseTo(-2);
    expect(b.maxX).toBeCloseTo(1);
    expect(b.minZ).toBeCloseTo(-3);
    expect(b.maxZ).toBeCloseTo(1);
  });

  it("frames all rooms, including negative positions and walls", () => {
    const bounds = projectBounds([room(), room({ id: "b", position: [-6, -5], rotation: 90 })]);
    expect(bounds.minX).toBeCloseTo(-6 - WALL_T);
    expect(bounds.minZ).toBeCloseTo(-9 - WALL_T);
    expect(bounds.maxX).toBeCloseTo(4 + WALL_T);
    expect(bounds.maxZ).toBeCloseTo(3 + WALL_T);
  });

  it("snaps exterior walls together and aligns their ends", () => {
    const a = room(), b = room({ id: "b" });
    expect(snapRoomPosition(b, [4.26, 0.04], [a, b], 0.05)).toEqual([4 + 2 * WALL_T, 0]);
  });

  it("allows free placement with snapping disabled", () => {
    const a = room(), b = room({ id: "b" });
    expect(snapRoomPosition(b, [4.261, -0.043], [a, b], 0)).toEqual([4.261, -0.043]);
  });

  it("does not snap to a distant room sharing only one coordinate", () => {
    const a = room(), b = room({ id: "b" });
    expect(snapRoomPosition(b, [4.26, 30], [a, b], 0.05)).toEqual([4.25, 30]);
  });

  it("distinguishes touching, overlap and rotated separation", () => {
    const a = room();
    expect(roomsOverlap(a, room({ position: [4, 0] }))).toBe(false);
    expect(roomsOverlap(a, room({ position: [3.9, 0] }))).toBe(true);
    expect(roomsOverlap(a, room({ rotation: 45, position: [3.9, 1] }))).toBe(true);
    expect(roomsOverlap(a, room({ rotation: 45, position: [8, 8] }))).toBe(false);
  });
});
