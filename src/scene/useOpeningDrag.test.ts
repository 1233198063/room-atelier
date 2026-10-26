import { describe, expect, it } from "vitest";
import { Ray, Vector3 } from "three";
import { localToWorld } from "../lib/rooms";
import { pickWallPoint, roomLocalRay } from "./useOpeningDrag";

describe("picking openings in assembled rooms", () => {
  it.each([0, 90, 180, 270, 37])("picks the same local wall after %i degree rotation", (rotation) => {
    const placement = { position: [-8, 5] as [number, number], rotation };
    const [x, z] = localToWorld([1.2, 0.04], placement);
    const ray = new Ray(new Vector3(x, 30, z), new Vector3(0, -1, 0));
    const hit = pickWallPoint(roomLocalRay(ray, placement), { width: 4, depth: 3, height: 2.6 }, "top");
    expect(hit?.wall).toBe("back");
    expect(hit?.along).toBeCloseTo(1.2);
  });

  it("transforms both the origin and direction for perspective dragging", () => {
    const placement = { position: [10, -6] as [number, number], rotation: 90 };
    const [x, z] = localToWorld([2, 1.5], placement);
    const ray = new Ray(new Vector3(x, 1, z), new Vector3(-1, 0, 0));
    const hit = pickWallPoint(roomLocalRay(ray, placement), { width: 4, depth: 3, height: 2.6 }, "perspective");
    expect(hit?.wall).toBe("back");
    expect(hit?.along).toBeCloseTo(2);
  });
});
