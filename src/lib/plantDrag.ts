import type { Ray } from "three";
import type { Furniture, Room, Vec3 } from "../types";
import type { Pt } from "./polygon";
import { clampToRoom, furnitureSurfaceHeight, snapTo } from "./geometry";
import { distanceToFootprint, plantPositionOnSurface, supportingSurface } from "./plantPlacement";

export interface PlantDragAnchor {
  grabHeight: number;
  offset: Pt;
  surfaceId: string | null;
  /** A released top must leave the picking zone before it can catch the plant again. */
  releasedSurfaceId: string | null;
}

function atHeight(ray: Ray, height: number): Pt | null {
  if (ray.direction.y >= -1e-6) return null;
  const t = (height - ray.origin.y) / ray.direction.y;
  if (t < 0) return null;
  return [ray.origin.x + t * ray.direction.x, ray.origin.z + t * ray.direction.z];
}

export function beginPlantDrag(ray: Ray, grabHeight: number, plant: Furniture, furniture: Furniture[], room: Room): PlantDragAnchor | null {
  const point = atHeight(ray, plant.position[1] + grabHeight);
  if (!point) return null;
  return { grabHeight, offset: [plant.position[0] - point[0], plant.position[2] - point[1]],
    surfaceId: supportingSurface(plant, furniture, room)?.id ?? null, releasedSurfaceId: null };
}

function surfaceAim(ray: Ray, surface: Furniture, anchor: PlantDragAnchor, margin: number): Pt | null {
  const height = furnitureSurfaceHeight(surface);
  const underCursor = atHeight(ray, height);
  const grabbed = atHeight(ray, height + anchor.grabHeight);
  if (!underCursor || !grabbed) return null;
  const candidate: Pt = [grabbed[0] + anchor.offset[0], grabbed[1] + anchor.offset[1]];
  // Accept either the grabbed point or a direct hit on the visible cabinet top.
  return distanceToFootprint(candidate, surface) <= margin ? candidate
    : distanceToFootprint(underCursor, surface) <= margin ? underCursor : null;
}

/** Room-local ray picking, with a wider release zone to avoid falling off during edge adjustments. */
export function resolvePlantDrag(ray: Ray, plant: Furniture, furniture: Furniture[], room: Room, anchor: PlantDragAnchor, step: number): {
  position: Vec3; anchor: PlantDragAnchor;
} | null {
  const point = atHeight(ray, plant.position[1] + anchor.grabHeight);
  if (!point) return null;
  const desired: Pt = [point[0] + anchor.offset[0], point[1] + anchor.offset[1]];
  const grid = (p: Pt): Pt => step > 0 ? [snapTo(p[0], step), snapTo(p[1], step)] : p;
  const current = furniture.find((f) => f.id === anchor.surfaceId);
  const margin = step > 0 ? 0.06 : 0;
  const released = furniture.find((f) => f.id === anchor.releasedSurfaceId);
  if (released && !surfaceAim(ray, released, anchor, margin)) anchor = { ...anchor, releasedSurfaceId: null };
  let position: Vec3 | null = null;
  let surfaceId: string | null = null;
  let trackingPoint = grid(desired);

  if (current && distanceToFootprint(desired, current) <= 0.14) {
    position = plantPositionOnSurface(plant, current, room, trackingPoint);
    if (position) surfaceId = current.id;
  }

  if (!position) {
    // Nearest top along the ray wins. Exclude the just-left support until the pointer re-enters it.
    const surfaces = [...furniture].sort((a, b) => furnitureSurfaceHeight(b) - furnitureSurfaceHeight(a));
    for (const surface of surfaces) {
      if (surface.id === anchor.surfaceId || surface.id === anchor.releasedSurfaceId) continue;
      const aim = surfaceAim(ray, surface, anchor, margin);
      if (!aim) continue;
      position = plantPositionOnSurface(plant, surface, room, grid(aim));
      if (position) { surfaceId = surface.id; trackingPoint = grid(aim); break; }
    }
  }

  if (!position) {
    const [x, z] = trackingPoint;
    const [cx, cz] = clampToRoom(x, z, plant.dimensions, plant.rotation, room);
    position = [cx, 0, cz];
  }
  // Changing height should lift/drop vertically once; the next move starts from that exact placement.
  if (surfaceId !== anchor.surfaceId || position[1] !== plant.position[1]) {
    const nextPoint = atHeight(ray, position[1] + anchor.grabHeight);
    if (!nextPoint) return null;
    // Preserve the pre-clamp target, so an off-grid edge doesn't move again on the next event.
    anchor = { ...anchor, surfaceId, offset: [trackingPoint[0] - nextPoint[0], trackingPoint[1] - nextPoint[1]] };
    if (current && current.id !== surfaceId) {
      anchor.releasedSurfaceId = surfaceAim(ray, current, anchor, margin) ? current.id : null;
    }
  }
  return { position, anchor };
}
