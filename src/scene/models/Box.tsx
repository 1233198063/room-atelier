import type { Material } from "three";

interface BoxProps {
  /** [width, height, depth] in meters. */
  size: [number, number, number];
  /** Center of the box, relative to the furniture's origin (footprint center, floor level). */
  position: [number, number, number];
  material: Material;
}

/** The building block of every furniture model: a shadow-casting box. */
export function Box({ size, position, material }: BoxProps) {
  return (
    <mesh position={position} material={material} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}
