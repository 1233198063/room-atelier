import { SURFACE_TYPES } from "./catalog";
import { clamp, footprintCorners, footprintHalfExtents, furnitureSurfaceHeight } from "./geometry";
import { pointInPolygon, type Pt } from "./polygon";
import type { Furniture, Room, Vec3 } from "../types";

/** Match the pot rim in Plant.tsx. Foliage may overhang a surface; the pot may not. */
export function plantPotRadius(plant: Furniture): number {
  const { width, depth, height } = plant.dimensions;
  return Math.min(width, depth) * (height >= 0.7 ? 0.3 : 0.4) * 1.06;
}

/** Clip a convex polygon to one axis-aligned half-plane. */
function clip(poly: Pt[], axis: 0 | 1, limit: number, keepGreater: boolean): Pt[] {
  const result: Pt[] = [];
  const inside = (p: Pt) => keepGreater ? p[axis] >= limit : p[axis] <= limit;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ai = inside(a), bi = inside(b);
    if (ai) result.push(a);
    if (ai !== bi) {
      const t = (limit - a[axis]) / (b[axis] - a[axis]);
      result.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return result;
}

/** Feasible centers: keep the whole pot on the top, foliage inside the room, and leaves below the ceiling. */
export function plantSurfaceRegion(plant: Furniture, surface: Furniture, room: Room): Pt[] | null {
  if (plant.type !== "plant" || surface.id === plant.id || !SURFACE_TYPES.includes(surface.type)) return null;
  const height = furnitureSurfaceHeight(surface);
  if (height <= 0 || height + plant.dimensions.height > room.height + 1e-6) return null;
  const rim = plantPotRadius(plant) + 0.005;
  const width = surface.dimensions.width - rim * 2, depth = surface.dimensions.depth - rim * 2;
  if (width <= 0 || depth <= 0) return null;
  let region = footprintCorners({ ...surface, dimensions: { width, depth, height: 0 } });
  const { hx, hz } = footprintHalfExtents(plant.dimensions, plant.rotation);
  if (hx * 2 > room.width || hz * 2 > room.depth) return null;
  region = clip(clip(region, 0, hx, true), 0, room.width - hx, false);
  region = clip(clip(region, 1, hz, true), 1, room.depth - hz, false);
  return region.length >= 3 ? region : null;
}

export function closestPolygonPoint(point: Pt, poly: Pt[]): Pt {
  if (pointInPolygon(point, poly)) return point;
  let best = poly[0], distance = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const t = clamp(((point[0] - a[0]) * dx + (point[1] - a[1]) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    const p: Pt = [a[0] + dx * t, a[1] + dz * t];
    const d = Math.hypot(p[0] - point[0], p[1] - point[1]);
    if (d < distance) { best = p; distance = d; }
  }
  return best;
}

export function distanceToFootprint(point: Pt, surface: Furniture): number {
  const nearest = closestPolygonPoint(point, footprintCorners(surface));
  return Math.hypot(point[0] - nearest[0], point[1] - nearest[1]);
}

export function plantPositionOnSurface(plant: Furniture, surface: Furniture, room: Room, desired: Pt): Vec3 | null {
  const region = plantSurfaceRegion(plant, surface, room);
  if (!region) return null;
  const [x, z] = closestPolygonPoint(desired, region);
  return [x, furnitureSurfaceHeight(surface), z];
}

export function supportingSurface(plant: Furniture, furniture: Furniture[], room: Room): Furniture | null {
  return furniture.find((f) => {
    if (Math.abs(furnitureSurfaceHeight(f) - plant.position[1]) > 0.005) return false;
    const region = plantSurfaceRegion(plant, f, room);
    if (!region) return false;
    const p: Pt = [plant.position[0], plant.position[2]];
    const q = closestPolygonPoint(p, region);
    return Math.hypot(p[0] - q[0], p[1] - q[1]) <= 0.002;
  }) ?? null;
}
