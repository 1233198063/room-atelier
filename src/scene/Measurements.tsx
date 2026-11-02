import { useRoomScene } from "./RoomContext";
import { worldToLocal } from "../lib/rooms";
import { selectActiveRoom } from "../store/editorStore";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useState } from "react";
import { useLength } from "../i18n";
import { footprintBounds } from "../lib/geometry";
import { openingSpan, wallLength, wallToWorld } from "../lib/openings";
import { selectSelected, selectSelectedOpening, useEditor } from "../store/editorStore";
import { ACCENT, INK_MUTED } from "./materials";
import { ScreenLabel } from "./ScreenLabel";

type P3 = [number, number, number];

const Y = 0.012; // just above the floor, to avoid z-fighting
const TICK = 0.08;

interface DimensionLineProps {
  from: P3;
  to: P3;
  color: string;
  muted?: boolean;
}

/** A CAD-style dimension: a line with perpendicular end ticks and a length label. */
function DimensionLine({ from, to, color, muted }: DimensionLineProps) {
  const len = useLength();
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dz);
  if (length < 0.005) return null;
  // Half a tick, perpendicular to the line on the floor plane.
  const px = (-dz / length) * (TICK / 2);
  const pz = (dx / length) * (TICK / 2);
  const tick = (p: P3): P3[] => [
    [p[0] - px, p[1], p[2] - pz],
    [p[0] + px, p[1], p[2] + pz],
  ];
  const mid: P3 = [(from[0] + to[0]) / 2, from[1], (from[2] + to[2]) / 2];

  return (
    <group>
      <Line points={[from, to]} color={color} lineWidth={1.25} />
      <Line points={tick(from)} color={color} lineWidth={1.25} />
      <Line points={tick(to)} color={color} lineWidth={1.25} />
      <ScreenLabel
        position={mid}
        text={len.format(length)}
        className={muted ? "dim-label dim-label--muted" : "dim-label"}
      />
    </group>
  );
}

/**
 * "Edit with precision": when a piece is selected, draw its clearance to all
 * four walls, measured from the edges of its (rotated) footprint. For a door
 * or window, draw a chain dimension along its wall: corner → opening → corner.
 */
export function SelectionMeasurements() {
  const f = useEditor(selectSelected);
  const opening = useEditor(selectSelectedOpening);
  const room = useEditor((s) => selectActiveRoom(s).room);

  if (opening) {
    const [a0, a1] = openingSpan(opening);
    const at = (a: number): P3 => {
      const [x, z] = wallToWorld(opening.wall, a, 0.35, room); // 35 cm out from the wall, on the floor
      return [x, Y, z];
    };
    const end = wallLength(opening.wall, room);
    return (
      <group>
        <DimensionLine from={at(0)} to={at(a0)} color={ACCENT} />
        <DimensionLine from={at(a0)} to={at(a1)} color={ACCENT} />
        <DimensionLine from={at(a1)} to={at(end)} color={ACCENT} />
      </group>
    );
  }
  if (!f) return null;

  const b = footprintBounds(f);
  const [x, , z] = f.position;

  return (
    <group>
      <DimensionLine from={[0, Y, z]} to={[b.minX, Y, z]} color={ACCENT} />
      <DimensionLine from={[b.maxX, Y, z]} to={[room.width, Y, z]} color={ACCENT} />
      <DimensionLine from={[x, Y, 0]} to={[x, Y, b.minZ]} color={ACCENT} />
      <DimensionLine from={[x, Y, b.maxZ]} to={[x, Y, room.depth]} color={ACCENT} />
    </group>
  );
}

/**
 * Overall room width and depth, drawn just outside the walls nearest the
 * camera — so they stay readable as you orbit instead of hiding behind a wall.
 */
export function RoomDimensions() {
  const { placement } = useRoomScene();
  const room = useEditor((s) => selectActiveRoom(s).room);
  const [near, setNear] = useState({ front: true, right: false });

  useFrame(({ camera }) => {
    // Ties (camera dead-center above the plan) resolve to front + left, like a drawing.
    const [cx, cz] = worldToLocal([camera.position.x, camera.position.z], placement);
    const front = cz > room.depth / 2 - 0.01;
    const right = cx > room.width / 2 + 0.01;
    if (front !== near.front || right !== near.right) setNear({ front, right });
  });

  const off = 0.45;
  const zLine = near.front ? room.depth + off : -off;
  const xLine = near.right ? room.width + off : -off;
  return (
    <group>
      <DimensionLine from={[0, Y, zLine]} to={[room.width, Y, zLine]} color={INK_MUTED} muted />
      <DimensionLine from={[xLine, Y, 0]} to={[xLine, Y, room.depth]} color={INK_MUTED} muted />
    </group>
  );
}
