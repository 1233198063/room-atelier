import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import { BoxGeometry, type Material, type Mesh } from "three";
import type { Room, Wall } from "../types";
import { boxTransform, type WallBox } from "./wallParts";

/** One 1×1×1 cube shared by every wall piece; each mesh scales it to size. */
const UNIT_BOX = new BoxGeometry(1, 1, 1);
const noRaycast = () => null;

export type CutHeights = Record<Wall, number>;

interface ClippedBoxProps {
  wall: Wall;
  box: WallBox;
  room: Room;
  material: Material;
  /** Current (animated) height of each wall — anything above it is clipped off. */
  cut: RefObject<CutHeights>;
  hideWhenCut?: boolean;
  /** Only the openings' hit boxes respond to the pointer. */
  interactive?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/**
 * A wall piece that respects the wall's cut height.
 *
 * Walls drop to a stub when they're between the camera and the room, and are
 * sliced at 1.2 m in plan view. Rather than rebuilding geometry, every piece
 * clips itself each frame: its top becomes min(top, cut). A door opening
 * therefore stays a gap even in a 6 cm stub, and a window sill below the
 * plan cut still shows.
 */
export function ClippedBox({
  wall,
  box,
  room,
  material,
  cut,
  hideWhenCut,
  interactive = false,
  castShadow,
  receiveShadow,
}: ClippedBoxProps) {
  const ref = useRef<Mesh>(null);
  const { position, scale } = boxTransform(wall, box, room);

  useFrame(() => {
    const mesh = ref.current;
    const h = cut.current?.[wall];
    if (!mesh || h === undefined) return;
    const top = Math.min(box.y1, h);
    mesh.visible = top - box.y0 > 0.002 && !(hideWhenCut && h < box.y1 - 0.002);
    // Keep the geometry squashed even when hidden: raycasts ignore `visible`.
    const height = Math.max(top - box.y0, 1e-4);
    mesh.scale.y = height;
    mesh.position.y = box.y0 + height / 2;
  });

  return (
    <mesh
      ref={ref}
      geometry={UNIT_BOX}
      material={material}
      position={position}
      scale={scale}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      {...(interactive ? {} : { raycast: noRaycast })}
    />
  );
}
