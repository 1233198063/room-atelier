import type { Dimensions } from "../../types";
import { useMaterials } from "../RoomContext";
import { Box } from "./Box";

/** Geometry-based woven border and repeating medallions; colors stay editable. */
export function Rug({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const border = Math.min(w, d) * 0.07;
  const cols = Math.max(2, Math.round(w / 0.45)), rows = Math.max(2, Math.round(d / 0.45));
  return <group>
    <Box size={[w, h * 0.65, d]} position={[0, h * 0.325, 0]} material={M.linen} />
    {[-1, 1].map((side) => <group key={side}>
      <Box size={[border, h * 0.2, d - border]} position={[side * (w / 2 - border), h * 0.75, 0]} material={M.throw} />
      <Box size={[w - border, h * 0.2, border]} position={[0, h * 0.75, side * (d / 2 - border)]} material={M.throw} />
    </group>)}
    {Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) => {
      const x = (col + 0.5) * (w - border * 4) / cols - (w - border * 4) / 2;
      const z = (row + 0.5) * (d - border * 4) / rows - (d - border * 4) / 2;
      return <mesh key={`${row}:${col}`} position={[x, h * 0.9, z]} rotation={[-Math.PI / 2, 0, Math.PI / 4]} material={M.throw}>
        <ringGeometry args={[0.025, Math.min(w / cols, d / rows) * 0.22, 4]} />
      </mesh>;
    }))}
  </group>;
}
