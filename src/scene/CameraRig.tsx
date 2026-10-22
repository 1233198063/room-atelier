import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import { MOUSE, type OrthographicCamera as OrthoCam } from "three";
import { useEditor } from "../store/editorStore";
import type { Room } from "../types";

type P3 = [number, number, number];
type Size = { width: number; height: number };

/** Where each camera sits when the view is (re)framed. */
function framing(view: "perspective" | "top", room: Room, size: Size, labelMargin = 1) {
  const cx = room.width / 2;
  const cz = room.depth / 2;
  if (view === "top") {
    // Fit the whole room plus a margin for the dimension labels.
    const margin = 1.6;
    const zoom = Math.min(size.width / (room.width + margin), size.height / (room.depth + margin));
    return { position: [cx, 30, cz] as P3, target: [cx, 0, cz] as P3, zoom };
  }
  // Front-right and above, far enough back that the room's bounding sphere fits
  // inside the narrower of the vertical and horizontal fields of view.
  // (labelMargin leaves room for the dimension labels drawn outside the walls in edit mode)
  const radius = 0.5 * Math.hypot(room.width + labelMargin, room.depth + labelMargin, room.height);
  const vFov = (PERSPECTIVE_FOV * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (size.width / size.height));
  const distance = radius / Math.sin(Math.min(vFov, hFov) / 2);
  const azimuth = (35 * Math.PI) / 180; // swing from the front toward the right
  const elevation = (36 * Math.PI) / 180;
  const target: P3 = [cx, 0.5, cz];
  return {
    position: [
      cx + distance * Math.cos(elevation) * Math.sin(azimuth),
      target[1] + distance * Math.sin(elevation),
      cz + distance * Math.cos(elevation) * Math.cos(azimuth),
    ] as P3,
    target,
    zoom: 1,
  };
}

const PERSPECTIVE_FOV = 40;

/**
 * Two cameras, one set of controls:
 *  - "perspective": a normal 3D camera you can orbit (left-drag), pan (right-drag) and zoom (wheel)
 *  - "top": an orthographic camera looking straight down — a true floor plan with no
 *    perspective distortion, like a CAD drawing. Rotation is locked; left-drag pans.
 */
export function CameraRig() {
  const view = useEditor((s) => s.view);
  const resetToken = useEditor((s) => s.cameraResetToken);
  const autoRotate = useEditor((s) => s.mode === "preview" && s.autoRotate);
  const get = useThree((s) => s.get);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  // The pose a freshly mounted camera starts in. Recomputed only when the view
  // switches — following every room/size change would yank the camera mid-edit.
  const initial = useMemo(() => framing(view, useEditor.getState().room, get().size), [view, get]);

  // "Frame room" (button or F key): snap back to the default framing.
  useEffect(() => {
    const c = controls.current;
    if (!c || resetToken === 0) return;
    const { camera, size } = get();
    const { room, mode } = useEditor.getState();
    const f = framing(view, room, size, mode === "preview" ? 0 : 1);
    camera.position.set(...f.position);
    c.target.set(...f.target);
    if (view === "top") {
      (camera as OrthoCam).zoom = f.zoom;
      camera.updateProjectionMatrix();
    }
    c.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  return (
    <>
      {view === "perspective" ? (
        <PerspectiveCamera makeDefault position={initial.position} fov={PERSPECTIVE_FOV} near={0.05} far={200} />
      ) : (
        // up = −Z puts the back wall at the top of the screen.
        <OrthographicCamera
          makeDefault
          position={initial.position}
          up={[0, 0, -1]}
          zoom={initial.zoom}
          near={0.1}
          far={100}
        />
      )}
      <OrbitControls
        ref={controls}
        makeDefault
        target={initial.target}
        enableDamping
        dampingFactor={0.12}
        enableRotate={view === "perspective"}
        mouseButtons={{
          LEFT: view === "perspective" ? MOUSE.ROTATE : MOUSE.PAN,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.PAN,
        }}
        // Never dip below the floor in 3D. (In plan view the camera's "up" is −Z, so a straight-down
        // look counts as 90° from up — clamping there would tilt the plan.)
        maxPolarAngle={view === "perspective" ? Math.PI * 0.48 : Math.PI}
        minDistance={1}
        maxDistance={40}
        minZoom={8}
        maxZoom={800}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
      />
    </>
  );
}
