import { IcosahedronGeometry } from "three";
import type { Dimensions } from "../../types";
import { MATERIALS as M } from "../materials";

/** One low-poly ball, shared by every leaf cluster in the scene and scaled into shape. */
const CLUSTER = new IcosahedronGeometry(1, 1);

/**
 * Leaf clusters on a rough dome, in canopy-relative units:
 * [x, y, z, radius] — x/z as a fraction of the canopy radius, y of its height.
 */
const CLUSTERS: [number, number, number, number][] = [
  [0, 0.45, 0, 0.55],
  [0.5, 0.36, 0.15, 0.42],
  [-0.45, 0.4, -0.2, 0.42],
  [0.1, 0.3, -0.5, 0.4],
  [-0.2, 0.32, 0.5, 0.4],
  [0.25, 0.7, -0.1, 0.38],
  [-0.2, 0.76, 0.15, 0.34],
];

/**
 * A potted plant that adapts to its size: tall ones (≥ 70 cm) grow a trunk
 * with the foliage up top, like a fig tree; short ones are a bushy pot plant.
 * Width/depth set the canopy, height the overall plant.
 */
export function Plant({ width: w, depth: d, height: h }: Dimensions) {
  const tall = h >= 0.7;
  const canopyR = Math.min(w, d) / 2;
  const potR = Math.min(w, d) * (tall ? 0.3 : 0.4);
  const potH = tall ? Math.min(0.42, h * 0.28) : h * 0.42;
  const canopyBottom = tall ? h * 0.42 : potH * 0.85;
  const canopyH = h - canopyBottom;

  return (
    <group>
      <mesh position={[0, potH / 2, 0]} material={M.terracotta} castShadow receiveShadow>
        <cylinderGeometry args={[potR, potR * 0.78, potH, 24]} />
      </mesh>
      {/* The pot's rim and the soil just below it */}
      <mesh position={[0, potH - 0.008, 0]} material={M.terracotta} castShadow>
        <cylinderGeometry args={[potR * 1.06, potR * 1.06, 0.016 + potH * 0.06, 24]} />
      </mesh>
      <mesh position={[0, potH - 0.012, 0]} material={M.soil}>
        <cylinderGeometry args={[potR * 0.94, potR * 0.94, 0.01, 24]} />
      </mesh>

      {tall && (
        <mesh position={[0, (potH + canopyBottom + canopyH * 0.3) / 2, 0]} material={M.oakDark} castShadow>
          <cylinderGeometry args={[0.012, 0.018, canopyBottom + canopyH * 0.3 - potH, 8]} />
        </mesh>
      )}

      {CLUSTERS.map(([x, y, z, r], i) => (
        <mesh
          key={i}
          geometry={CLUSTER}
          material={i % 2 ? M.leafDark : M.leaf}
          position={[x * canopyR * 0.55, canopyBottom + y * canopyH, z * canopyR * 0.55]}
          scale={[r * canopyR, r * canopyH * 0.5, r * canopyR]}
          rotation={[0, i * 0.9, 0]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}
