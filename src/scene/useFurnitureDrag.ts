import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback } from "react";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import { snapPosition } from "../lib/geometry";
import { useEditor } from "../store/editorStore";

/** The floor: the plane y = 0, with its normal pointing up. */
const FLOOR = new Plane(new Vector3(0, 1, 0), 0);
/** Pixels the pointer must travel before a press becomes a drag (so a click never nudges). */
const DRAG_THRESHOLD_PX = 4;

/**
 * Click-and-drag a piece of furniture across the floor.
 *
 * How it works — the core trick of most 3D editors:
 *  1. On pointer-down, shoot a ray from the camera through the cursor and find
 *     where it hits the floor plane. Remember the offset between that point
 *     and the furniture's center (so the piece doesn't jump to the cursor).
 *  2. On every pointer-move, cast a new ray, intersect the floor again, apply
 *     the offset, snap, and write the result into the store.
 *  3. The store is the source of truth; the mesh re-renders from it.
 *
 * Listeners are attached to `window` so the drag continues even if the cursor
 * leaves the canvas.
 */
export function useFurnitureDrag(id: string) {
  const get = useThree((s) => s.get);

  return useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const editor = useEditor.getState();
      if (editor.mode !== "edit" || e.button !== 0) return;
      e.stopPropagation(); // don't let the event reach pieces behind this one
      editor.select(id);

      const piece = editor.furniture.find((f) => f.id === id);
      const hit = new Vector3();
      if (!piece || !e.ray.intersectPlane(FLOOR, hit)) return;

      const { gl, controls } = get();
      // Stop OrbitControls from rotating the camera while we drag furniture.
      // R3F's handler runs before the controls' own pointerdown listener, so this takes effect immediately.
      const orbit = controls as unknown as { enabled: boolean } | null;
      if (orbit) orbit.enabled = false;

      const offsetX = piece.position[0] - hit.x;
      const offsetZ = piece.position[2] - hit.z;
      const startX = e.nativeEvent.clientX;
      const startY = e.nativeEvent.clientY;
      let dragging = false;

      const raycaster = new Raycaster();
      const ndc = new Vector2();
      const point = new Vector3();

      const onMove = (ev: PointerEvent) => {
        if (!dragging) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD_PX) return;
          dragging = true;
          useEditor.getState().beginGesture();
          gl.domElement.style.cursor = "grabbing";
        }
        // Screen pixels → normalized device coordinates (−1…1), then a ray into the scene.
        const rect = gl.domElement.getBoundingClientRect();
        ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, get().camera);
        if (!raycaster.ray.intersectPlane(FLOOR, point)) return;

        const s = useEditor.getState();
        const current = s.furniture.find((f) => f.id === id);
        if (!current) return;
        let x = point.x + offsetX;
        let z = point.z + offsetZ;
        // Hold Alt for free movement.
        if (s.snapStep > 0 && !ev.altKey) {
          [x, z] = snapPosition(x, z, current.dimensions, current.rotation, s.room, s.snapStep);
        }
        s.updateFurniture(id, { position: [x, current.position[1], z] }, { history: false });
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        if (orbit) orbit.enabled = true;
        gl.domElement.style.cursor = "";
        if (dragging) useEditor.getState().endGesture(); // one drag = one undo step
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [get, id],
  );
}
