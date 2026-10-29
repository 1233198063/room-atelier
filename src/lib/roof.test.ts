import { describe, expect, it } from "vitest";
import { hipRoof, roofTriangles, ROOF_PITCH_DEG } from "./roof";

describe("hip roof", () => {
  it("runs the ridge along the longer side and keeps every slope facing up", () => {
    const roof = hipRoof(10, 6, ROOF_PITCH_DEG, 0);
    expect(roof.faces).toHaveLength(4);
    expect(roof.rise).toBeCloseTo(3 * Math.tan((ROOF_PITCH_DEG * Math.PI) / 180));
    const ridge = roof.edges.at(-1)!;
    expect(ridge[0][2]).toBeCloseTo(3);
    expect(ridge[1][0] - ridge[0][0]).toBeCloseTo(4);
    const { positions, uvs } = roofTriangles(roof);
    expect(positions.length / 9).toBe(6); // two quads + two triangles
    for (let i = 0; i < positions.length; i += 9) {
      const [ax, , az, bx, , bz, cx, , cz] = positions.slice(i, i + 9);
      expect((bz - az) * (cx - ax) - (bx - ax) * (cz - az)).toBeGreaterThan(0);
    }
    expect(uvs.length / 2).toBe(positions.length / 3);
  });

  it("becomes a pyramid on a square plan, with the overhang past the walls", () => {
    const roof = hipRoof(6, 6, 30, 0.5);
    expect(roof.edges).toHaveLength(4);
    const xs = roof.faces.flatMap((f) => f.points.map((p) => p[0]));
    expect(Math.min(...xs)).toBeCloseTo(-0.5);
    expect(Math.max(...xs)).toBeCloseTo(6.5);
  });
});
