import { useEffect, useMemo } from "react";
import { BoxGeometry, type BufferGeometry, type Material } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

interface BoxProps {
  /** [width, height, depth] in meters. */
  size: [number, number, number];
  /** Center of the box, relative to the furniture's origin (footprint center, floor level). */
  position: [number, number, number];
  material: Material;
}

/** Real furniture has no knife edges: a few millimeters of round catches a highlight. */
const EDGE_RADIUS = 0.008;

/**
 * Texture coordinates in meters, so a texture keeps its real size on every
 * box, with u along the longer side of each face: wood grain runs the length
 * of a shelf, up a wardrobe door and across a tabletop. A per-size offset
 * keeps neighboring boards from repeating the same figure.
 */
function projectUVs(geometry: BufferGeometry, [w, h, d]: [number, number, number]) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  // Box geometries list their faces in the order +x, −x, +y, −y, +z, −z.
  const perFace = pos.count / 6;
  const shift = ((w * 7.31 + h * 3.17 + d * 5.13) % 1) * 4;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const axis = Math.floor(i / perFace) >> 1; // 0: x faces, 1: y faces, 2: z faces
    const [a, b, along] = axis === 0 ? [z, y, d >= h] : axis === 1 ? [x, z, w >= d] : [x, y, w >= h];
    uv.setXY(i, (along ? a : b) + shift, (along ? b : a) + shift * 0.37);
  }
  uv.needsUpdate = true;
}

export function createBoxGeometry(size: [number, number, number]): BufferGeometry {
  const radius = Math.min(EDGE_RADIUS, Math.min(...size) * 0.3);
  const geometry = radius > 0.0015 ? new RoundedBoxGeometry(...size, 2, radius) : new BoxGeometry(...size);
  projectUVs(geometry, size);
  return geometry;
}

/** The building block of every furniture model: a shadow-casting box with softened edges. */
export function Box({ size: [w, h, d], position, material }: BoxProps) {
  const geometry = useMemo(() => createBoxGeometry([w, h, d]), [w, h, d]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh position={position} geometry={geometry} material={material} castShadow receiveShadow />;
}
