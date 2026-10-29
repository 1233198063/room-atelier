import { useLayoutEffect, useMemo, useRef } from "react";
import type { DirectionalLight } from "three";
import { selectSceneBounds, useEditor } from "../store/editorStore";

// Since three r155 light intensities are physically based, so "1" is dimmer than
// it used to be — these values are tuned by eye for a bright, airy interior.
const PRESETS = {
  // Neutral, even light for reading shapes and dimensions.
  edit: { sky: "#fffaf2", ground: "#d8c6ac", hemi: 2.4, sun: "#fff4e4", sunIntensity: 2.2 },
  // Lower, warmer "late afternoon" light for enjoying the room.
  preview: { sky: "#fff3e3", ground: "#d2b48f", hemi: 2.1, sun: "#ffe0b8", sunIntensity: 2.7 },
} as const;

/**
 * Two lights are enough for a clean, warm look:
 *  - a hemisphere light: soft fill whose color blends from "sky" (above) to "ground" (below)
 *  - a directional light: parallel rays like sunlight through a window, casting shadows
 *
 * The sun comes in from the front-right — over the walls that the default
 * camera cuts away — so the walls you're looking at are the lit ones.
 */
export function Lights() {
  const rooms = useEditor((s) => s.rooms);
  const activeId = useEditor((s) => s.activeRoomId);
  const display = useEditor((s) => s.roomDisplay);
  const mode = useEditor((s) => s.mode);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const room = useMemo(() => selectSceneBounds(useEditor.getState()), [rooms, activeId, display, mode]);
  const plan = useEditor((s) => s.view === "top");
  const sun = useRef<DirectionalLight>(null);
  const p = PRESETS[mode];

  const cx = (room.minX + room.maxX) / 2;
  const cz = (room.minZ + room.maxZ) / 2;
  const span = Math.max(room.width, room.depth);

  // A directional light shines toward its `target`. The target isn't part of the
  // scene graph, so we place it and refresh its matrix ourselves.
  useLayoutEffect(() => {
    const light = sun.current;
    if (!light) return;
    light.target.position.set(cx, 0, cz);
    light.target.updateMatrixWorld();
    const cam = light.shadow.camera;
    const extent = span * 0.85 + 0.5;
    cam.left = -extent;
    cam.right = extent;
    cam.top = extent;
    cam.bottom = -extent;
    cam.updateProjectionMatrix();
  }, [cx, cz, span]);

  return (
    <>
      <hemisphereLight args={[p.sky, p.ground, p.hemi]} />
      <directionalLight
        ref={sun}
        // In plan view the sun goes (almost) overhead so shadows tuck under the furniture
        // instead of smearing across the drawing.
        position={plan ? [cx + 0.4, room.maxY + 12, cz + 0.8] : [cx + span * 0.8, room.maxY + span * 1.2, cz + span * 0.45]}
        color={p.sun}
        intensity={p.sunIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={3}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={span * 4 + room.height + 10}
      />
    </>
  );
}
