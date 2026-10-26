import type { Dimensions } from "../../types";
import { useMaterials } from "../RoomContext";
import { Box } from "./Box";

/** Two gathered panels leave the central window open. Rod runs along local X. */
export function Curtains({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const panel = w * 0.18, folds = 10, step = panel / folds;
  return <group>
    <mesh position={[0, h - 0.025, 0]} rotation={[0, 0, Math.PI / 2]} material={M.brass}>
      <cylinderGeometry args={[0.018, 0.018, w, 12]} />
    </mesh>
    {[-1, 1].map((side) => <group key={side}>
      {Array.from({ length: folds }, (_, i) => {
        const x = side * (w / 2 - panel) + side * step * (i + 0.5);
        return <group key={i}>
          <Box size={[step * 1.05, h - 0.07, d * (i % 2 ? 0.55 : 0.85)]}
            position={[x, (h - 0.07) / 2, 0]} material={i % 2 ? M.duvet : M.linen} />
          {Array.from({ length: 9 }, (_, j) => <mesh key={j} position={[x, (j + 0.5) * (h - 0.09) / 9, d * 0.44]}
            material={M.throw} scale={[step * 0.22, 0.027, 0.004]}><sphereGeometry args={[1, 6, 4]} /></mesh>)}
        </group>;
      })}
    </group>)}
  </group>;
}
