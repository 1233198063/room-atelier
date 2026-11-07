import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { ExtrudeGeometry, MathUtils, Path, Shape, Vector2 } from "three";
import { PLAN_CUT_HEIGHT, WALL_T, wallLength, WALLS, wallSegments } from "../lib/openings";
import { useEditor } from "../store/editorStore";
import type { Room, Wall } from "../types";
import { ClippedBox, type CutHeights } from "./ClippedBox";
import { createFloorTexture, createGrassTexture, createPavingTexture, FLOOR_TILE_M, GROUND_TILE_M } from "./floorTexture";
import { useMaterials, useRoomScene } from "./RoomContext";
import { clamp } from "../lib/geometry";
import { roomKind, worldToLocal, type Point2 } from "../lib/rooms";
import { OpeningItem } from "./OpeningItem";
import { useFlaggedIds } from "./useFlaggedIds";

const FLOOR_T = 0.04;
const STUB_H = 0.06; // height a wall drops to when it's cut away
const SKIRTING_H = 0.08;
const SKIRTING_T = 0.012;

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

function selectThisRoom(e: ThreeEvent<PointerEvent>, id: string) {
  if (e.button !== 0 || useEditor.getState().mode !== "edit") return;
  e.stopPropagation();
  useEditor.getState().selectRoom(id);
}

/**
 * Open ground: the plot outline with the courtyards below cut out of it.
 * Sits 1 cm under the room floors standing on it, so they never flicker.
 */
function GardenGround({ room, holes, color, onPointerDown }: {
  room: Room; holes: Point2[][]; color: string; onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const geometry = useMemo(() => {
    // Shape space is (x, −z); rotating −90° about X lays it on the floor with the extrusion pointing up.
    const shape = new Shape([new Vector2(0, 0), new Vector2(room.width, 0), new Vector2(room.width, -room.depth), new Vector2(0, -room.depth)]);
    for (const hole of holes) {
      shape.holes.push(new Path(hole.map(([x, z]) => new Vector2(clamp(x, 0, room.width), -clamp(z, 0, room.depth)))));
    }
    const g = new ExtrudeGeometry(shape, { depth: FLOOR_T, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [room.width, room.depth, holes]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const texture = useMemo(() => {
    const t = createGrassTexture();
    t.repeat.set(1 / GROUND_TILE_M, 1 / GROUND_TILE_M); // extruded UVs are in meters
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh geometry={geometry} position={[0, -FLOOR_T - 0.01, 0]} receiveShadow onPointerDown={onPointerDown}>
    <meshStandardMaterial map={texture} color={color} roughness={0.95} />
  </mesh>;
}

/**
 * Floor, walls and the doors/windows cut into them, all generated from the
 * room's real dimensions. A garden is just its ground; a courtyard is paved.
 *
 * Each wall has an animated "cut height":
 *  - 3D view: full height, or a low stub when the wall stands between the camera
 *    and the room (a dollhouse cutaway, so you can always see inside)
 *  - plan view: 1.2 m, the height architects slice a building at to draw a floor plan
 *  - `closed`: full height from every side, for rooms seen from outside
 */
export function RoomShell({ closed = false, holes = [] }: { closed?: boolean; holes?: Point2[][] }) {
  const { data, placement } = useRoomScene();
  const { room, openings, palette } = data;
  const kind = roomKind(data);
  const materials = useMaterials();
  const view = useEditor((s) => s.view);
  const floorColor = palette.floor;
  const selectedId = useEditor((s) => s.selectedId);
  const flagged = useFlaggedIds();

  const cut = useRef<CutHeights>({ back: room.height, front: room.height, left: room.height, right: room.height });
  const openWalls = data.openWalls;
  const segments = useMemo(
    () => WALLS.filter((wall) => !openWalls?.includes(wall))
      .flatMap((wall) => wallSegments(wall, room, openings).map((seg) => ({ wall, seg }))),
    [room, openings, openWalls],
  );

  // Skirting runs along the foot of every wall piece that stands on the floor, so it
  // stops at doors and floor-length windows; side walls reach past the corners, it doesn't.
  const skirting = useMemo(() => kind !== "indoor" ? [] : segments
    .filter(({ seg }) => seg.y0 === 0)
    .map(({ wall, seg }) => ({ wall, seg: { ...seg, a0: Math.max(seg.a0, 0), a1: Math.min(seg.a1, wallLength(wall, room)) } }))
    .filter(({ seg }) => seg.a1 - seg.a0 > 0.01), [kind, segments, room]);

  const paved = kind === "courtyard";
  const floorTexture = useMemo(() => (paved ? createPavingTexture() : createFloorTexture()), [paved]);
  useEffect(() => () => floorTexture.dispose(), [floorTexture]);
  // Repeat the texture so one tile always covers the same real size, whatever the room size.
  const tile = paved ? GROUND_TILE_M : FLOOR_TILE_M;
  floorTexture.repeat.set(room.width / tile, room.depth / tile);

  // useFrame runs every rendered frame. The cut heights are plain numbers in a
  // ref — animating them through React state 60×/s would be wasteful. Priority
  // −1 makes this run before the wall pieces read the values.
  useFrame(({ camera }, delta) => {
    const [cx, cz] = worldToLocal([camera.position.x, camera.position.z], placement);
    const planCut = Math.min(PLAN_CUT_HEIGHT, room.height);
    for (const wall of WALLS) {
      const target =
        view === "top"
          ? planCut
          : !closed && cameraOutside(wall, cx, cz, room)
            ? STUB_H
            : room.height;
      cut.current[wall] = MathUtils.damp(cut.current[wall], target, 12, delta);
    }
  }, -1);

  const planCut = Math.min(PLAN_CUT_HEIGHT, room.height);
  const onFloorDown = (e: ThreeEvent<PointerEvent>) => selectThisRoom(e, data.id);

  if (kind === "garden") return <GardenGround room={room} holes={holes} color={floorColor} onPointerDown={onFloorDown} />;

  return (
    <group>
      <mesh position={[room.width / 2, -FLOOR_T / 2, room.depth / 2]} receiveShadow onPointerDown={onFloorDown}>
        <boxGeometry args={[room.width, FLOOR_T, room.depth]} />
        {/* Satin-varnished boards: rough enough to stay soft, smooth enough to pick up the window. */}
        <meshStandardMaterial map={floorTexture} color={floorColor} roughness={paved ? 0.9 : 0.6} />
      </mesh>

      {segments.map(({ wall, seg }, i) => (
        <ClippedBox
          key={`${wall}-${i}`}
          wall={wall}
          box={{ ...seg, t0: -WALL_T, t1: 0 }}
          room={room}
          // In plan view, wall that the section plane slices through is drawn solid
          // and dark; what lies below the cut (a window sill) stays light.
          material={view === "top" && seg.y1 > planCut ? materials.wallPlan : materials.wall}
          cut={cut}
          receiveShadow
        />
      ))}

      {skirting.map(({ wall, seg }, i) => (
        <ClippedBox key={`skirting-${wall}-${i}`} wall={wall} box={{ ...seg, y1: SKIRTING_H, t0: 0, t1: SKIRTING_T }}
          room={room} material={materials.trim} cut={cut} receiveShadow />
      ))}

      {openings.filter((o) => !openWalls?.includes(o.wall)).map((o) => (
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
