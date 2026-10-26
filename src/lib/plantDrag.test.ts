import { describe, expect, it } from "vitest";
import { Ray, Vector3 } from "three";
import type { Furniture, Room, Vec3 } from "../types";
import { beginPlantDrag, resolvePlantDrag } from "./plantDrag";
import { localToWorld } from "./rooms";
import { roomLocalRay } from "../scene/useOpeningDrag";

const room: Room = { width: 6, depth: 6, height: 3 };
const plant: Furniture = { id: "plant", name: "Small plant", type: "plant", position: [1, 0, 1], rotation: 0,
  dimensions: { width: 0.3, depth: 0.3, height: 0.32 } };
const cabinet: Furniture = { id: "cabinet", name: "Cabinet", type: "cabinet", position: [2, 0, 2], rotation: 0,
  dimensions: { width: 1.2, depth: 0.6, height: 1.8 } };
const grab = 0.2;
const aim = (target: Vec3, origin: Vec3 = [6, 6, 8]) => {
  const eye = new Vector3(...origin);
  return new Ray(eye, new Vector3(...target).sub(eye).normalize());
};
const overhead = (x: number, z: number) => new Ray(new Vector3(x, 10, z), new Vector3(0, -1, 0));

describe("dragging plants onto surfaces", () => {
  it("targets the visible top of a tall cabinet, without floor-plane parallax", () => {
    const anchor = beginPlantDrag(aim([1, grab, 1]), grab, plant, [plant, cabinet], room)!;
    const ray = aim([2, 1.8, 2]);
    const placed = resolvePlantDrag(ray, plant, [plant, cabinet], room, anchor, 0.05)!;
    expect(placed.anchor.surfaceId).toBe(cabinet.id);
    expect(placed.position[1]).toBe(1.8);
    const repeat = resolvePlantDrag(ray, { ...plant, position: placed.position }, [cabinet], room, placed.anchor, 0.05)!;
    repeat.position.forEach((v, i) => expect(v).toBeCloseTo(placed.position[i]));
  });

  it("tracks small movements on the cabinet at the grabbed height", () => {
    const elevated = { ...plant, position: [2, 1.8, 2] as Vec3 };
    const anchor = beginPlantDrag(aim([2, 2, 2]), grab, elevated, [cabinet], room)!;
    const moved = resolvePlantDrag(aim([2.08, 2, 2.06]), elevated, [cabinet], room, anchor, 0)!;
    expect(moved.position[0]).toBeCloseTo(2.08);
    expect(moved.position[1]).toBe(1.8);
    expect(moved.position[2]).toBeCloseTo(2.06);
  });

  it("preserves the grabbed offset when picking the side of a pot on a high bookcase", () => {
    const shelf = { ...cabinet, dimensions: { ...cabinet.dimensions, height: 2.65 } };
    const elevated = { ...plant, position: [2, 2.65, 2] as Vec3 };
    const ray = aim([2.08, 2.85, 2.05]);
    const anchor = beginPlantDrag(ray, grab, elevated, [shelf], room)!;
    expect(anchor.surfaceId).toBe(shelf.id);
    const same = resolvePlantDrag(ray, elevated, [shelf], room, anchor, 0)!;
    same.position.forEach((v, i) => expect(v).toBeCloseTo(elevated.position[i]));
    const moved = resolvePlantDrag(aim([2.13, 2.85, 2.09]), elevated, [shelf], room, anchor, 0)!;
    expect(moved.position[0]).toBeCloseTo(2.05);
    expect(moved.position[1]).toBe(2.65);
    expect(moved.position[2]).toBeCloseTo(2.04);
  });

  it("holds at the edge, drops deliberately and allows re-entry", () => {
    let current = { ...plant, position: [2, 1.8, 2] as Vec3 };
    let anchor = beginPlantDrag(overhead(2, 2), grab, current, [cabinet], room)!;
    const edge = resolvePlantDrag(overhead(2.7, 2), current, [cabinet], room, anchor, 0.05)!;
    expect(edge.position[1]).toBe(1.8);
    expect(edge.position[0]).toBeLessThan(2.6);
    const dropped = resolvePlantDrag(overhead(2.8, 2), { ...current, position: edge.position }, [cabinet], room, edge.anchor, 0.05)!;
    expect(dropped.position[0]).toBeCloseTo(2.8);
    expect(dropped.position.slice(1)).toEqual([0, 2]);
    current = { ...current, position: dropped.position }; anchor = dropped.anchor;
    const back = resolvePlantDrag(overhead(2, 2), current, [cabinet], room, anchor, 0.05)!;
    expect(back.position).toEqual([2, 1.8, 2]);
  });

  it.each([1.2, 2.8])("does not reattach or jitter after dropping off the %s side", (x) => {
    let current = { ...plant, position: [2, 1.8, 2] as Vec3 };
    let anchor = beginPlantDrag(aim([2, 2, 2]), grab, current, [cabinet], room)!;
    const ray = aim([x, 2, 2]);
    const dropped = resolvePlantDrag(ray, current, [cabinet], room, anchor, 0.05)!;
    expect(dropped.position[1]).toBe(0);
    current = { ...current, position: dropped.position }; anchor = dropped.anchor;
    for (let i = 0; i < 5; i++) {
      const next = resolvePlantDrag(ray, current, [cabinet], room, anchor, 0.05)!;
      next.position.forEach((v, j) => expect(v).toBeCloseTo(dropped.position[j]));
      current = { ...current, position: next.position }; anchor = next.anchor;
    }
  });

  it("keeps grid snapping optional and refuses a cabinet with insufficient ceiling clearance", () => {
    const anchor = beginPlantDrag(overhead(1, 1), grab, plant, [cabinet], room)!;
    const snapped = resolvePlantDrag(overhead(2.02, 2.02), plant, [cabinet], room, anchor, 0.05)!;
    const free = resolvePlantDrag(overhead(2.02, 2.02), plant, [cabinet], room, anchor, 0)!;
    expect(snapped.position).toEqual([2, 1.8, 2]);
    expect(free.position).toEqual([2.02, 1.8, 2.02]);
    expect(resolvePlantDrag(overhead(2, 2), plant, [cabinet], { ...room, height: 2 }, anchor, 0.05)?.position[1]).toBe(0);
  });

  it.each([0, 90, 180, 270, 37])("places correctly in an assembled room rotated %s degrees", (rotation) => {
    const placement = { position: [-8, 5] as [number, number], rotation };
    const worldRay = (local: Ray) => {
      const [x, z] = localToWorld([local.origin.x, local.origin.z], placement);
      return new Ray(new Vector3(x, local.origin.y, z), local.direction.clone().applyAxisAngle(new Vector3(0, 1, 0), rotation * Math.PI / 180));
    };
    const start = roomLocalRay(worldRay(aim([1, grab, 1])), placement);
    const anchor = beginPlantDrag(start, grab, plant, [cabinet], room)!;
    const ray = roomLocalRay(worldRay(aim([2, 1.8, 2])), placement);
    const result = resolvePlantDrag(ray, plant, [cabinet], room, anchor, 0.05)!;
    expect(result.anchor.surfaceId).toBe(cabinet.id);
    expect(result.position[1]).toBe(1.8);
  });
});
