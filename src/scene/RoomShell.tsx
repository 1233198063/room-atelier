import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MathUtils } from "three";
import { PLAN_CUT_HEIGHT, WALL_T, WALLS, wallSegments } from "../lib/openings";
import { useEditor } from "../store/editorStore";
import type { Room, Wall } from "../types";
import { ClippedBox, type CutHeights } from "./ClippedBox";
import { createFloorTexture, FLOOR_TILE_M } from "./floorTexture";
import { MATERIALS } from "./materials";
import { OpeningItem } from "./OpeningItem";
import { useFlaggedIds } from "./useFlaggedIds";

const FLOOR_T = 0.04;
const STUB_H = 0.06; // height a wall drops to when it's cut away

/** True when the camera is on the outside of this wall. */
function cameraOutside(wall: Wall, x: number, z: number, room: Room) {
  switch (wall) {
    case "back":
      return z < 0;
    case "front":
      return z > room.depth;
    case "left":
      return x < 0;
    case "right":
      return x > room.width;
  }
}

/**
 * Floor, walls and the doors/windows cut into them, all generated from the
 * room's real dimensions.
 *
 * Each wall has an animated "cut height":
 *  - 3D view: full height, or a low stub when the wall stands between the camera
 *    and the room (a dollhouse cutaway, so you can always see inside)
 *  - plan view: 1.2 m, the height architects slice a building at to draw a floor plan
 */
export function RoomShell() {
  const room = useEditor((s) => s.room);
  const view = useEditor((s) => s.view);
  const openings = useEditor((s) => s.openings);
  const floorColor = useEditor((s) => s.palette.floor);
  const selectedId = useEditor((s) => s.selectedId);
  const flagged = useFlaggedIds();

  const cut = useRef<CutHeights>({ back: room.height, front: room.height, left: room.height, right: room.height });
  const segments = useMemo(
    () => WALLS.flatMap((wall) => wallSegments(wall, room, openings).map((seg) => ({ wall, seg }))),
    [room, openings],
  );

  const floorTexture = useMemo(createFloorTexture, []);
  useEffect(() => () => floorTexture.dispose(), [floorTexture]);
  // Repeat the texture so one tile always covers 1.2 real meters, whatever the room size.
  floorTexture.repeat.set(room.width / FLOOR_TILE_M, room.depth / FLOOR_TILE_M);

  // useFrame runs every rendered frame. The cut heights are plain numbers in a
  // ref — animating them through React state 60×/s would be wasteful. Priority
  // −1 makes this run before the wall pieces read the values.
  useFrame(({ camera }, delta) => {
    const planCut = Math.min(PLAN_CUT_HEIGHT, room.height);
    for (const wall of WALLS) {
      const target =
        view === "top"
          ? planCut
          : cameraOutside(wall, camera.position.x, camera.position.z, room)
            ? STUB_H
            : room.height;
      cut.current[wall] = MathUtils.damp(cut.current[wall], target, 12, delta);
    }
  }, -1);

  const planCut = Math.min(PLAN_CUT_HEIGHT, room.height);

  return (
    <group>
      <mesh position={[room.width / 2, -FLOOR_T / 2, room.depth / 2]} receiveShadow>
        <boxGeometry args={[room.width, FLOOR_T, room.depth]} />
        <meshStandardMaterial map={floorTexture} color={floorColor} roughness={0.78} />
      </mesh>

      {segments.map(({ wall, seg }, i) => (
        <ClippedBox
          key={`${wall}-${i}`}
          wall={wall}
          box={{ ...seg, t0: -WALL_T, t1: 0 }}
          room={room}
          // In plan view, wall that the section plane slices through is drawn solid
          // and dark; what lies below the cut (a window sill) stays light.
          material={view === "top" && seg.y1 > planCut ? MATERIALS.wallPlan : MATERIALS.wall}
          cut={cut}
          receiveShadow
        />
      ))}

      {openings.map((o) => (
        <OpeningItem
          key={o.id}
          opening={o}
          room={room}
          cut={cut}
          selected={o.id === selectedId}
          flagged={flagged.has(o.id)}
        />
      ))}
    </group>
  );
}
