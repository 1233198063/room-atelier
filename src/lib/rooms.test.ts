import { describe, expect, it } from "vitest";
import type { ProjectRoom } from "../types";
import { DEFAULT_PALETTE } from "./palettes";
import { WALL_T } from "./openings";
import { gardenHoles, hiddenWhileEditing, joinPlacement, localToWorld, moveRigidly, projectBounds, roomBounds, roomCorners, roomsConflict,
  roomsOverlap, rotateRoomsTogether, snapRoomPosition, snapRoomsDelta, worldToLocal } from "./rooms";
import { wallLength, wallToWorld } from "./openings";
import type { Wall } from "../types";

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

describe("levels and room kinds", () => {
  it("lets stacked floors and the garden underneath share a footprint", () => {
    const ground = room({ id: "g", room: { width: 4, depth: 3, height: 3 } });
    const upper = room({ id: "u", elevation: 3 });
    const garden = room({ id: "p", kind: "garden", room: { width: 20, depth: 20, height: 8 }, position: [-5, -5] });
    expect(roomsOverlap(ground, upper)).toBe(true);
    expect(roomsConflict(ground, upper)).toBe(false);
    expect(roomsConflict(ground, garden)).toBe(false);
    expect(roomsConflict(ground, room({ id: "x", elevation: 2 }))).toBe(true);
  });

  it("cuts the lawn above a lower courtyard, walls included, in garden-local coordinates", () => {
    const garden = room({ id: "p", kind: "garden", room: { width: 20, depth: 20, height: 8 }, position: [-5, -5] });
    const court = room({ id: "c", kind: "courtyard", elevation: -3, position: [2, 3] });
    const level = room({ id: "l", kind: "courtyard", position: [8, 8] });
    const holes = gardenHoles(garden, [garden, court, level, room({ id: "b", elevation: -3 })]);
    expect(holes).toHaveLength(1);
    expect(Math.min(...holes[0].map((p) => p[0]))).toBeCloseTo(7 - WALL_T);
    expect(Math.max(...holes[0].map((p) => p[1]))).toBeCloseTo(11 + WALL_T);
  });

  it("hides only overlapping rooms above an enclosed room being edited", () => {
    const basement = room({ id: "b", elevation: -4 });
    const above = room({ id: "a" }), aside = room({ id: "s", position: [10, 0] });
    const garden = room({ id: "p", kind: "garden", room: { width: 20, depth: 20, height: 8 }, position: [-5, -5] });
    const all = [basement, above, aside, garden];
    expect([...hiddenWhileEditing(all, basement)].sort()).toEqual(["a", "p"]);
    expect(hiddenWhileEditing(all, garden).size).toBe(0);
  });
});

describe("moving rooms together", () => {
  it("snaps the outer edge of a group to a room outside it", () => {
    const left = room({ id: "l", position: [0, 0] });
    const a = room({ id: "a", position: [10, 0] }), b = room({ id: "b", position: [10, 3.2] });
    // Dragging the lower room so the group's left edge lands 7 cm from the fixed room's right wall
    const [dx, dz] = snapRoomsDelta([a, b], b, [4 + 2 * WALL_T + 0.07, 3.2], [left, a, b], 0.01);
    expect(dz).toBeCloseTo(0);
    expect(a.position[0] + dx - WALL_T).toBeCloseTo(4 + WALL_T);
    expect(snapRoomsDelta([a, b], b, [4.33, 3.2], [left, a, b], 0)).toEqual([4.33 - 10, 0]);
  });

  it("turns a group about its middle without changing the rooms' places relative to each other", () => {
    const rooms = [room({ id: "a", position: [0, 0] }), room({ id: "b", position: [4.2, 0], rotation: 0 })];
    const before = projectBounds(rooms);
    const turned = rotateRoomsTogether(rooms, 90).map((t, i) => ({ ...rooms[i], ...t }));
    const after = projectBounds(turned);
    expect((after.minX + after.maxX) / 2).toBeCloseTo((before.minX + before.maxX) / 2);
    expect((after.minZ + after.maxZ) / 2).toBeCloseTo((before.minZ + before.maxZ) / 2);
    expect(after.maxX - after.minX).toBeCloseTo(before.maxZ - before.minZ);
    const [p, q] = turned.map((r) => roomCorners(r)[0]), [p0, q0] = rooms.map((r) => roomCorners(r)[0]);
    expect(Math.hypot(p[0] - q[0], p[1] - q[1])).toBeCloseTo(Math.hypot(p0[0] - q0[0], p0[1] - q0[1]));
    expect(snapRoomPosition(rooms[0], [1.234, 5.678], rooms, 0)).toEqual([1.234, 5.678]);
  });
});

describe("joining one wall to another", () => {
  /** A point on a wall's interior face, in world coordinates. */
  const onWall = (r: ProjectRoom, wall: Wall, a: number) => localToWorld(wallToWorld(wall, a, 0, r.room), r);
  const placed = (r: ProjectRoom, j: { position: [number, number]; rotation: number }) => ({ ...r, position: j.position, rotation: j.rotation });
  const target = room({ id: "t", position: [0, 0] });
  const small = room({ id: "m", room: { width: 2, depth: 3, height: 2.6 } });

  it("puts a side wall against a side wall without turning, walls back to back", () => {
    const j = joinPlacement(small, "left", target, "right", "start", 0, 2 * WALL_T);
    expect(j.position).toEqual([4 + 2 * WALL_T, 0]);
    expect(j.rotation).toBe(0);
    expect(j.flush).toBe(true);
    expect(roomsConflict(target, placed(small, j))).toBe(false);
  });

  it("aligns ends or the middle along the target wall, plus an offset", () => {
    expect(joinPlacement(small, "back", target, "front", "start", 0, 0).position).toEqual([0, 3]);
    expect(joinPlacement(small, "back", target, "front", "center", 0, 0).position).toEqual([1, 3]);
    expect(joinPlacement(small, "back", target, "front", "end", -0.5, 0).position).toEqual([1.5, 3]);
    const j = joinPlacement(small, "back", target, "front", "end", 1, 0);
    expect(j.span).toEqual([3, 5]);
    expect(j.shared).toEqual([3, 4]);
    expect(joinPlacement(small, "back", target, "front", "start", 6, 0).shared).toEqual([4, 4]);
  });

  it.each([0, 37, 90, 205])("turns the room so the chosen walls face each other, whatever the target's rotation (%i°)", (rotation) => {
    const t = room({ id: "t", position: [3, -2], rotation });
    for (const wall of ["back", "left", "right", "front"] as Wall[]) for (const targetWall of ["back", "left", "right", "front"] as Wall[]) {
      const j = joinPlacement(small, wall, t, targetWall, "center", 0.3, 2 * WALL_T);
      const m = placed(small, j);
      const lengthT = wallLength(targetWall, t.room);
      // The middle of the target wall, shifted 30 cm, faces the middle of the moving wall across two wall thicknesses.
      const a = onWall(t, targetWall, lengthT / 2 + 0.3), b = onWall(m, wall, wallLength(wall, small.room) / 2);
      expect(Math.hypot(a[0] - b[0], a[1] - b[1]), `${wall}→${targetWall}`).toBeCloseTo(2 * WALL_T);
      expect(roomsConflict(t, m), `${wall}→${targetWall}`).toBe(false);
      // A point along the target wall lands on the same spot of the moving wall.
      const p = onWall(t, targetWall, j.shared[0] + 0.1), q = onWall(m, wall, j.alongMoving(j.shared[0] + 0.1));
      expect(Math.hypot(p[0] - q[0], p[1] - q[1])).toBeCloseTo(2 * WALL_T);
    }
  });

  it("carries other rooms along, keeping their places relative to the one that moves", () => {
    const a = room({ id: "a", position: [10, 0] }), b = room({ id: "b", position: [14.2, 1], rotation: 90 });
    const moved = moveRigidly([a, b], a, { position: [-3, 5], rotation: 90 });
    const [a2, b2] = moved.map((m, i) => ({ ...[a, b][i], ...m }));
    expect(b2.rotation).toBe(180);
    const d = (p: ProjectRoom, q: ProjectRoom) => Math.hypot(roomCorners(p)[2][0] - roomCorners(q)[0][0], roomCorners(p)[2][1] - roomCorners(q)[0][1]);
    expect(d(a2, b2)).toBeCloseTo(d(a, b));
  });
});
