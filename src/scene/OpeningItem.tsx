import { useMaterials } from "./RoomContext";
import { Edges, Line } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { memo, useMemo, useState, type RefObject } from "react";
import { openingSpan, PLAN_CUT_HEIGHT, WALL_T, wallToWorld } from "../lib/openings";
import { useEditor } from "../store/editorStore";
import type { Opening, Room } from "../types";
import { ClippedBox, type CutHeights } from "./ClippedBox";
import { ACCENT, ACCENT_SOFT, HIT_MATERIAL, INK_MUTED, WARN } from "./materials";
import { useOpeningDrag } from "./useOpeningDrag";
import { boxTransform, openingBounds, openingParts } from "./wallParts";

type P3 = [number, number, number];
const noRaycast = () => null;
const FLOOR_Y = 0.013;

/**
 * The classic door symbol from architectural plans: the leaf drawn fully open
 * plus the quarter-circle it sweeps. Handy in 3D too — it's the floor area
 * you must keep clear of furniture.
 */
function DoorSwing({ o, room, color }: { o: Opening; room: Room; color: string }) {
  const points = useMemo(() => {
    const [a0, a1] = openingSpan(o);
    const hingeA = o.hinge === "start" ? a0 : a1;
    const dir = o.hinge === "start" ? 1 : -1; // the closed leaf extends from the hinge toward the other jamb
    const w = a1 - a0;
    const at = (a: number, t: number): P3 => {
      const [x, z] = wallToWorld(o.wall, a, t, room);
      return [x, FLOOR_Y, z];
    };
    const arc: P3[] = [];
    for (let i = 0; i <= 24; i++) {
      const θ = (i / 24) * (Math.PI / 2);
      arc.push(at(hingeA + dir * w * Math.cos(θ), w * Math.sin(θ)));
    }
    return { arc, leaf: [at(hingeA, 0), at(hingeA, w)] };
  }, [o, room]);

  return (
    <>
      <Line points={points.arc} color={color} lineWidth={1} dashed dashSize={0.05} gapSize={0.035} raycast={noRaycast} />
      <Line points={points.leaf} color={color} lineWidth={1.5} raycast={noRaycast} />
    </>
  );
}

/** Plan-view window symbol: two thin lines across the opening, inside the wall thickness. */
function WindowSymbol({ o, room, color }: { o: Opening; room: Room; color: string }) {
  const [a0, a1] = openingSpan(o);
  const y = Math.min(PLAN_CUT_HEIGHT, room.height) + 0.01;
  const line = (t: number): P3[] =>
    [a0, a1].map((a) => {
      const [x, z] = wallToWorld(o.wall, a, t, room);
      return [x, y, z] as P3;
    });
  return (
    <>
      <Line points={line(-WALL_T * 0.35)} color={color} lineWidth={1.25} raycast={noRaycast} />
      <Line points={line(-WALL_T * 0.65)} color={color} lineWidth={1.25} raycast={noRaycast} />
    </>
  );
}

interface Props {
  opening: Opening;
  room: Room;
  cut: RefObject<CutHeights>;
  selected: boolean;
  /** Involved in a layout-check warning (e.g. a blocked door swing). */
  flagged: boolean;
}

export const OpeningItem = memo(function OpeningItem({ opening: o, room, cut, selected, flagged }: Props) {
  const editing = useEditor((s) => s.mode === "edit");
  const plan = useEditor((s) => s.view === "top");
  const gl = useThree((s) => s.gl);
  const [hovered, setHovered] = useState(false);
  const onPointerDown = useOpeningDrag(o.id);
  const materials = useMaterials();
  const parts = useMemo(() => openingParts(o, materials), [o, materials]);
  const bounds = openingBounds(o);
  const outline = boxTransform(o.wall, { ...bounds, t0: bounds.t0 - 0.005 }, room);

  return (
    <group
      onPointerDown={onPointerDown}
      onPointerOver={(e) => {
        if (!editing) return;
        e.stopPropagation();
        setHovered(true);
        if (!gl.domElement.style.cursor) gl.domElement.style.cursor = "grab";
      }}
      onPointerOut={() => {
        setHovered(false);
        if (gl.domElement.style.cursor === "grab") gl.domElement.style.cursor = "";
      }}
    >
      {parts.map((p, i) => (
        <ClippedBox
          key={i}
          wall={o.wall}
          box={p}
          room={room}
          material={p.material}
          cut={cut}
          hideWhenCut={p.hideWhenCut}
          castShadow
          receiveShadow
        />
      ))}
      {/* An invisible box filling the opening: the thing you actually click. */}
      <ClippedBox wall={o.wall} box={bounds} room={room} material={HIT_MATERIAL} cut={cut} interactive />

      {editing && (selected || hovered || flagged) && (
        <mesh position={outline.position} scale={outline.scale} raycast={noRaycast}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial visible={false} />
          <Edges color={selected ? ACCENT : flagged ? WARN : ACCENT_SOFT} lineWidth={selected || flagged ? 1.6 : 1} />
        </mesh>
      )}
      {editing && o.type === "door" && !o.opensAway && (
        <DoorSwing o={o} room={room} color={selected ? ACCENT : flagged ? WARN : INK_MUTED} />
      )}
      {plan && o.type === "window" && <WindowSymbol o={o} room={room} color={selected ? ACCENT : "#5d86b3"} />}
    </group>
  );
});
