import { useRoomScene } from "./RoomContext";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import { clamp, snapPosition } from "../lib/geometry";
import { beginPlantDrag, resolvePlantDrag } from "../lib/plantDrag";
import { selectActiveRoom, useEditor } from "../store/editorStore";
import { roomLocalRay } from "./useOpeningDrag";

const UP = new Vector3(0, 1, 0);
/** Pixels the pointer must travel before a press becomes a drag (so a click never nudges). */
const DRAG_THRESHOLD_PX = 4;

/**
 * Drag furniture on the floor, or plants on the support plane at their grabbed height.
 * Remember the pointer offset so pieces don't jump when grabbed. Plants acquire
 * suitable furniture tops, with a wider release zone for stable edge adjustments.
 *
 * Listeners are attached to `window` so the drag continues even if the cursor
 * leaves the canvas.
 */
export function useFurnitureDrag(id: string) {
  const { data, placement } = useRoomScene();
  const get = useThree((s) => s.get);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  return useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const editor = useEditor.getState();
      if (editor.mode !== "edit" || e.button !== 0) return;
      cleanup.current?.();
      e.stopPropagation(); // don't let the event reach pieces behind this one
      if (editor.activeRoomId !== data.id) editor.selectRoom(data.id);
      editor.select(id);

      const piece = data.furniture.find((f) => f.id === id);
      const hit = new Vector3();
      // Drag in the room's own frame, on the level the piece stands at (a gallery deck, say).
      const support = new Plane(UP, -(piece?.position[1] ?? 0));
      if (!piece || !roomLocalRay(e.ray, placement).intersectPlane(support, hit)) return;
      let plantAnchor = piece.type === "plant" ? beginPlantDrag(roomLocalRay(e.ray, placement),
        clamp(e.point.y - piece.position[1], 0, piece.dimensions.height), piece, data.furniture, data.room) : null;
      if (piece.type === "plant" && !plantAnchor) return;

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
        if (ev.pointerId !== e.pointerId) return;
        const s = useEditor.getState();
        if (s.activeRoomId !== data.id || s.mode !== "edit" || s.view !== editor.view || s.roomDisplay !== editor.roomDisplay) { onUp(); return; }
        const active = selectActiveRoom(s);
        const current = active.furniture.find((f) => f.id === id);
        if (!current) { onUp(); return; }
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
        if (plantAnchor) {
          const result = resolvePlantDrag(roomLocalRay(raycaster.ray, placement), current,
            active.furniture, active.room, plantAnchor, ev.altKey ? 0 : s.snapStep);
          if (!result) return;
          plantAnchor = result.anchor;
          s.setPlantDropTarget(plantAnchor.surfaceId);
          s.updateFurniture(id, { position: result.position }, { history: false });
          return;
        }
        if (!roomLocalRay(raycaster.ray, placement).intersectPlane(support, point)) return;

        let x = point.x + offsetX;
        let z = point.z + offsetZ;
        // Hold Alt for free movement.
        if (s.snapStep > 0 && !ev.altKey) {
          [x, z] = snapPosition(x, z, current.dimensions, current.rotation, selectActiveRoom(s).room, s.snapStep);
        }
        s.updateFurniture(id, { position: [x, current.position[1], z] }, { history: false });
      };

      const onUp = (ev?: PointerEvent) => {
        if (ev && ev.pointerId !== e.pointerId) return;
        cleanup.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.removeEventListener("blur", onBlur);
        if (orbit) orbit.enabled = true;
        gl.domElement.style.cursor = "";
        useEditor.getState().setPlantDropTarget(null);
        if (dragging) useEditor.getState().endGesture(); // one drag = one undo step
      };
      const onBlur = () => onUp();

      cleanup.current = onUp;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      window.addEventListener("blur", onBlur);
    },
    [get, id, data, placement],
  );
}
