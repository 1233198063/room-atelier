import { useRoomScene } from "./RoomContext";
import { worldToLocal, type Placement } from "../lib/rooms";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback } from "react";
import { Plane, Ray, Raycaster, Vector2, Vector3 } from "three";
import { snapTo } from "../lib/geometry";
import { runsAlongX, WALLS, wallLength } from "../lib/openings";
import { selectActiveRoom, useEditor } from "../store/editorStore";
import type { Room, ViewMode, Wall } from "../types";

/** Transform the picking ray into this room's coordinates. */
export function roomLocalRay(ray: Ray, placement: Placement): Ray {
  const [x, z] = worldToLocal([ray.origin.x, ray.origin.z], placement);
  const a = placement.rotation * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return new Ray(new Vector3(x, ray.origin.y - (placement.elevation ?? 0), z), new Vector3(
    ray.direction.x * c - ray.direction.z * s, ray.direction.y,
    ray.direction.x * s + ray.direction.z * c));
}

const DRAG_THRESHOLD_PX = 4;
const FLOOR = new Plane(new Vector3(0, 1, 0), 0);
const _plane = new Plane();
const _normal = new Vector3();
const _hit = new Vector3();

/** Interior face of each wall as a plane whose normal points into the room. */
function interiorPlane(wall: Wall, room: Room): Plane {
  switch (wall) {
    case "back":
      return _plane.set(_normal.set(0, 0, 1), 0);
    case "front":
      return _plane.set(_normal.set(0, 0, -1), room.depth);
    case "left":
      return _plane.set(_normal.set(1, 0, 0), 0);
    case "right":
      return _plane.set(_normal.set(-1, 0, 0), room.width);
  }
}

/**
 * Which wall is under the cursor, and where along it?
 *
 * In 3D we intersect the ray with each wall's interior face — but only faces
 * the ray approaches from inside the room, so the cut-away walls nearest the
 * camera are skipped. If no wall is hit (cursor over the floor, or in plan
 * view where rays point straight down) we take the floor point and snap to
 * the nearest wall.
 */
export function pickWallPoint(ray: Ray, room: Room, view: ViewMode): { wall: Wall; along: number } | null {
  if (view === "perspective") {
    let best: { wall: Wall; along: number; dist: number } | null = null;
    for (const wall of WALLS) {
      const plane = interiorPlane(wall, room);
      if (plane.normal.dot(ray.direction) >= 0) continue; // seen from behind (outside the room)
      if (!ray.intersectPlane(plane, _hit)) continue;
      const along = runsAlongX(wall) ? _hit.x : _hit.z;
      if (_hit.y < 0 || _hit.y > room.height || along < 0 || along > wallLength(wall, room)) continue;
      const dist = ray.origin.distanceTo(_hit);
      if (!best || dist < best.dist) best = { wall, along, dist };
    }
    if (best) return { wall: best.wall, along: best.along };
  }

  if (!ray.intersectPlane(FLOOR, _hit)) return null;
  const distance: Record<Wall, number> = {
    left: Math.abs(_hit.x),
    right: Math.abs(room.width - _hit.x),
    back: Math.abs(_hit.z),
    front: Math.abs(room.depth - _hit.z),
  };
  const wall = WALLS.reduce((a, b) => (distance[a] <= distance[b] ? a : b));
  return { wall, along: runsAlongX(wall) ? _hit.x : _hit.z };
}

/**
 * Drag a door or window: it slides along its wall and hops to another wall
 * when the cursor moves there. Same pattern as furniture dragging — the store
 * is updated, the meshes follow.
 */
export function useOpeningDrag(id: string) {
  const { data, placement } = useRoomScene();
  const get = useThree((s) => s.get);

  return useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const editor = useEditor.getState();
      if (editor.mode !== "edit" || e.button !== 0) return;
      e.stopPropagation();
      if (editor.activeRoomId !== data.id) editor.selectRoom(data.id);
      editor.select(id);

      const opening = data.openings.find((o) => o.id === id);
      if (!opening) return;
      const start = pickWallPoint(roomLocalRay(e.ray, placement), data.room, editor.view);
      // Keep the grab point under the cursor while sliding along the original wall.
      const grab = start && start.wall === opening.wall ? opening.offset - start.along : 0;

      const { gl, controls } = get();
      const orbit = controls as unknown as { enabled: boolean } | null;
      if (orbit) orbit.enabled = false;

      const startX = e.nativeEvent.clientX;
      const startY = e.nativeEvent.clientY;
      let dragging = false;
      const raycaster = new Raycaster();
      const ndc = new Vector2();

      const onMove = (ev: PointerEvent) => {
        if (!dragging) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD_PX) return;
          dragging = true;
          useEditor.getState().beginGesture();
          gl.domElement.style.cursor = "grabbing";
        }
        const rect = gl.domElement.getBoundingClientRect();
        ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, get().camera);

        const s = useEditor.getState();
        if (s.activeRoomId !== data.id) { onUp(); return; }
        const hit = pickWallPoint(roomLocalRay(raycaster.ray, placement), selectActiveRoom(s).room, s.view);
        if (!hit) return;
        let offset = hit.along + (hit.wall === opening.wall ? grab : 0);
        if (s.snapStep > 0 && !ev.altKey) offset = snapTo(offset, s.snapStep);
        s.updateOpening(id, { wall: hit.wall, offset }, { history: false });
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        if (orbit) orbit.enabled = true;
        gl.domElement.style.cursor = "";
        if (dragging) useEditor.getState().endGesture();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [get, id, data, placement],
  );
}
