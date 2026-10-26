import { describe, expect, it } from "vitest";
import type { Furniture, Room } from "../types";
import { furnitureSurfaceHeight } from "./geometry";
import { plantPositionOnSurface, plantPotRadius, plantSurfaceRegion, supportingSurface } from "./plantPlacement";

const room: Room = { width: 6, depth: 6, height: 3 };
const plant: Furniture = { id: "plant", name: "Small plant", type: "plant", position: [1, 0, 1], rotation: 0,
  dimensions: { width: 0.3, depth: 0.3, height: 0.32 } };
const cabinet: Furniture = { id: "cabinet", name: "Cabinet", type: "cabinet", position: [2, 0, 2], rotation: 0,
  dimensions: { width: 1.2, depth: 0.5, height: 1.8 } };

describe("plant placement on furniture", () => {
  it("supports tall cabinets and full-height bookcases when the plant fits below the ceiling", () => {
    expect(plantPositionOnSurface(plant, cabinet, room, [2, 2])).toEqual([2, 1.8, 2]);
    const shelf: Furniture = { ...cabinet, type: "bookcase", dimensions: { ...cabinet.dimensions, height: 2.65 } };
    expect(plantPositionOnSurface(plant, shelf, room, [2, 2])).toEqual([2, 2.65, 2]);
    expect(plantSurfaceRegion(plant, shelf, { ...room, height: 2.9 })).toBeNull();
  });

  it("keeps the entire pot on the edge while allowing foliage to overhang", () => {
    const position = plantPositionOnSurface(plant, cabinet, room, [4, 2])!;
    expect(position[0]).toBeCloseTo(2.6 - plantPotRadius(plant) - 0.005);
    expect(position[1]).toBe(1.8);
    expect(supportingSurface({ ...plant, position }, [cabinet], room)?.id).toBe(cabinet.id);
    expect(supportingSurface({ ...plant, position: [2.6, 1.8, 2] }, [cabinet], room)).toBeNull();
  });

  it("clips against a rotated cabinet top and the room wall together", () => {
    const rotated = { ...cabinet, position: [0.4, 0, 0.4] as [number, number, number], rotation: 37 };
    const position = plantPositionOnSurface(plant, rotated, room, [-2, -2])!;
    expect(position[0]).toBeGreaterThanOrEqual(plant.dimensions.width / 2 - 1e-6);
    expect(position[2]).toBeGreaterThanOrEqual(plant.dimensions.depth / 2 - 1e-6);
    const a = 37 * Math.PI / 180, x = position[0] - 0.4, z = position[2] - 0.4;
    const radius = plantPotRadius(plant) + 0.005;
    expect(Math.abs(x * Math.cos(a) - z * Math.sin(a)) + radius).toBeLessThanOrEqual(0.6 + 1e-6);
    expect(Math.abs(x * Math.sin(a) + z * Math.cos(a)) + radius).toBeLessThanOrEqual(0.25 + 1e-6);
  });

  it("rejects narrow tops, low ceilings, non-surfaces and placements outside the room", () => {
    expect(plantSurfaceRegion(plant, { ...cabinet, dimensions: { ...cabinet.dimensions, depth: 0.2 } }, room)).toBeNull();
    expect(plantSurfaceRegion(plant, cabinet, { ...room, height: 2 })).toBeNull();
    expect(plantSurfaceRegion(plant, { ...cabinet, type: "chair" }, room)).toBeNull();
    expect(plantSurfaceRegion(plant, { ...cabinet, position: [-2, 0, -2] }, room)).toBeNull();
  });

  it("uses the craft table's actual worktop and includes elevated supports", () => {
    const worktable: Furniture = { ...cabinet, type: "worktable", position: [2, 0.1, 2],
      dimensions: { ...cabinet.dimensions, height: 0.94 } };
    const position = plantPositionOnSurface(plant, worktable, room, [2, 2])!;
    expect(position[1]).toBeCloseTo(0.88);
    expect(position[1]).toBe(furnitureSurfaceHeight(worktable));
  });
});
