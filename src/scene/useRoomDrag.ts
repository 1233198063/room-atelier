import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import { roomElevation, snapRoomsDelta, type Point2 } from "../lib/rooms";
import { movingUnit, useEditor } from "../store/editorStore";

const UP = new Vector3(0, 1, 0);
/** Pixels the pointer must travel before a press becomes a drag (so a click only selects). */
const DRAG_THRESHOLD_PX = 4;

/**
 * Drag a room around the combined view by its name label, together with every
 * room ticked with it. The grabbed point stays under the cursor on the room's
 * own floor level, and snapping matches the Arrange rooms plan: the grid, then
 * nearby room edges; Alt moves freely. One drag is one undo step.
 *
 * The label is HTML over the canvas, so the handler takes a native event and
 * stops it there: neither the camera controls nor the scene see the press.
 */
export function useRoomDrag(id: string) {
  const get = useThree((s) => s.get);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  return useCallback((e: PointerEvent) => {
    const editor = useEditor.getState();
    if (editor.mode !== "edit" || e.button !== 0) return;
    const room = editor.rooms.find((r) => r.id === id);
    if (!room) return;
    e.preventDefault();
    e.stopPropagation();
    cleanup.current?.();
    editor.selectRoom(id);

    const { gl } = get();
    const floor = new Plane(UP, -roomElevation(room));
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const hit = new Vector3();
    const floorPoint = (ev: PointerEvent): Point2 | null => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, get().camera);
      return raycaster.ray.intersectPlane(floor, hit) ? [hit.x, hit.z] : null;
    };
    const start = floorPoint(e);
    if (!start) return;
    const from = room.position;
    const unit = movingUnit(useEditor.getState(), id);
    let dragging = false;

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const s = useEditor.getState();
      const anchor = s.rooms.find((r) => r.id === id);
      if (!anchor || s.mode !== "edit" || s.view !== editor.view || s.roomDisplay !== editor.roomDisplay) { onUp(); return; }
      if (!dragging) {
        if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < DRAG_THRESHOLD_PX) return;
        dragging = true;
        s.beginGesture();
        document.body.classList.add("is-dragging-room");
      }
      const p = floorPoint(ev);
      if (!p) return;
      const position: Point2 = [from[0] + p[0] - start[0], from[1] + p[1] - start[1]];
      const moving = s.rooms.filter((r) => unit.includes(r.id));
      s.moveRooms(unit, snapRoomsDelta(moving, anchor, position, s.rooms, ev.altKey ? 0 : s.snapStep), { history: false });
    };

    const onUp = (ev?: PointerEvent) => {
      if (ev && ev.pointerId !== e.pointerId) return;
      cleanup.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onBlur);
      document.body.classList.remove("is-dragging-room");
      if (dragging) useEditor.getState().endGesture();
    };
    const onBlur = () => onUp();

    cleanup.current = onUp;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", onBlur);
  }, [get, id]);
}
