import type { Vec3 } from "../types";
import { WALL_T } from "./openings";

export const ROOF_PITCH_DEG = 27;
/** How far the eaves reach past the outer face of the walls. */
export const ROOF_OVERHANG = 0.45;

export interface RoofFace {
  /** Corners in order; the first two are the eave edge. */
  points: Vec3[];
}

export interface HipRoof {
  faces: RoofFace[];
  /** Ridge and hip lines, for the capping tiles. */
  edges: [Vec3, Vec3][];
  rise: number;
}

/**
 * A hip roof over a room, in room-local coordinates with the eaves at y = 0:
 * four slopes at the same pitch, the ridge along the longer side. On a square
 * plan the ridge shrinks to a point and it becomes a pyramid.
 */
export function hipRoof(width: number, depth: number, pitchDeg = ROOF_PITCH_DEG, overhang = WALL_T + ROOF_OVERHANG): HipRoof {
  const x0 = -overhang, z0 = -overhang, L = width + overhang * 2, M = depth + overhang * 2;
  const alongX = L >= M;
  const half = Math.min(L, M) / 2;
  const rise = half * Math.tan((pitchDeg * Math.PI) / 180);
  const a: Vec3 = [x0, 0, z0], b: Vec3 = [x0 + L, 0, z0], c: Vec3 = [x0 + L, 0, z0 + M], d: Vec3 = [x0, 0, z0 + M];
  const r0: Vec3 = [x0 + half, rise, z0 + half];
  const r1: Vec3 = alongX ? [x0 + L - half, rise, z0 + half] : [x0 + half, rise, z0 + M - half];
  const faces: RoofFace[] = alongX
    ? [{ points: [a, b, r1, r0] }, { points: [c, d, r0, r1] }, { points: [d, a, r0] }, { points: [b, c, r1] }]
    : [{ points: [d, a, r0, r1] }, { points: [b, c, r1, r0] }, { points: [a, b, r0] }, { points: [c, d, r1] }];
  const edges: [Vec3, Vec3][] = alongX
    ? [[a, r0], [d, r0], [b, r1], [c, r1]]
    : [[a, r0], [b, r0], [c, r1], [d, r1]];
  if (Math.hypot(r1[0] - r0[0], r1[2] - r0[2]) > 1e-6) edges.push([r0, r1]);
  return { faces, edges, rise };
}

/**
 * Triangles with upward normals, and UVs in meters: u along the eave, v up the
 * slope — so a tile texture's courses run parallel to the eaves on every face.
 */
export function roofTriangles(roof: HipRoof): { positions: number[]; uvs: number[] } {
  const positions: number[] = [], uvs: number[] = [];
  for (const { points } of roof.faces) {
    const [p0, p1] = points;
    const ex = p1[0] - p0[0], ez = p1[2] - p0[2], len = Math.hypot(ex, ez);
    const ux = ex / len, uz = ez / len;
    const uv = (p: Vec3) => {
      const dx = p[0] - p0[0], dz = p[2] - p0[2];
      return [dx * ux + dz * uz, Math.hypot(Math.abs(dx * uz - dz * ux), p[1])];
    };
    for (let i = 1; i < points.length - 1; i++) {
      let tri = [points[0], points[i], points[i + 1]];
      // Keep the normal pointing up and out: (q - p) × (r - p) must have a positive y.
      const [p, q, r] = tri;
      const ny = (q[2] - p[2]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[2] - p[2]);
      if (ny < 0) tri = [p, r, q];
      for (const v of tri) {
        positions.push(...v);
        uvs.push(...uv(v));
      }
    }
  }
  return { positions, uvs };
}
