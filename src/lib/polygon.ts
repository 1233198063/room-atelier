/**
 * Small 2D helpers on the floor plane (x, z). Every footprint, door swing and
 * clearance zone in the layout checks is a convex polygon, so these few
 * functions cover all the geometry they need.
 */

export type Pt = [number, number];

const cross = (ax: number, az: number, bx: number, bz: number) => ax * bz - az * bx;

/**
 * Separating Axis Theorem: two convex polygons are disjoint if some edge
 * normal of either one separates their projections. Shapes that merely touch
 * (within `eps`) don't count as overlapping — flush furniture is fine.
 */
export function polygonsOverlap(a: Pt[], b: Pt[], eps = 0.005): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, z1] = poly[i];
      const [x2, z2] = poly[(i + 1) % poly.length];
      const nx = z1 - z2; // edge normal
      const nz = x2 - x1;
      const len = Math.hypot(nx, nz);
      if (len < 1e-12) continue;
      const project = (p: Pt[]) => {
        let min = Infinity;
        let max = -Infinity;
        for (const [x, z] of p) {
          const d = (x * nx + z * nz) / len;
          min = Math.min(min, d);
          max = Math.max(max, d);
        }
        return [min, max];
      };
      const [minA, maxA] = project(a);
      const [minB, maxB] = project(b);
      if (maxA <= minB + eps || maxB <= minA + eps) return false;
    }
  }
  return true;
}

/** Is the point inside the convex polygon (either winding)? */
export function pointInPolygon([px, pz]: Pt, poly: Pt[]): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % poly.length];
    const c = cross(x2 - x1, z2 - z1, px - x1, pz - z1);
    if (Math.abs(c) < 1e-12) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}

/**
 * Distance along a ray (origin `o`, unit direction `d`) to the first edge of
 * the polygon, or Infinity if it misses. 0 if the origin is already inside.
 */
export function rayToPolygon(o: Pt, d: Pt, poly: Pt[]): number {
  if (pointInPolygon(o, poly)) return 0;
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % poly.length];
    const ex = x2 - x1;
    const ez = z2 - z1;
    const denom = cross(d[0], d[1], ex, ez);
    if (Math.abs(denom) < 1e-12) continue; // parallel
    const wx = x1 - o[0];
    const wz = z1 - o[1];
    const t = cross(wx, wz, ex, ez) / denom;
    const s = cross(wx, wz, d[0], d[1]) / denom;
    if (t >= 0 && s >= 0 && s <= 1) best = Math.min(best, t);
  }
  return best;
}

/** Distance from a point inside the rectangle [0, w] × [0, d] to its boundary along a unit direction. */
export function rayToRoomEdge(o: Pt, dir: Pt, w: number, d: number): number {
  let t = Infinity;
  if (dir[0] > 1e-9) t = Math.min(t, (w - o[0]) / dir[0]);
  if (dir[0] < -1e-9) t = Math.min(t, -o[0] / dir[0]);
  if (dir[1] > 1e-9) t = Math.min(t, (d - o[1]) / dir[1]);
  if (dir[1] < -1e-9) t = Math.min(t, -o[1] / dir[1]);
  return Math.max(0, t);
}
