import type { Dimensions } from "../../types";
import { WORKTABLE_TOOL_HEIGHT } from "../../lib/catalog";
import { useMaterials } from "../RoomContext";
import { Box } from "./Box";

/** Overall height includes 16 cm of desktop tools; tabletop height is h - 0.16. */
export function Worktable({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const top = h - WORKTABLE_TOOL_HEIGHT, t = 0.045;
  const lx = w / 2 - 0.13, lz = d / 2 - 0.10;
  return <group>
    <Box size={[w, t, d]} position={[0, top - t / 2, 0]} material={M.oak} />
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Box key={`${x}:${z}`} size={[0.075, top - t, 0.075]}
      position={[lx * x, (top - t) / 2, lz * z]} material={M.oakDark} />))}
    <Box size={[w - 0.18, 0.06, 0.05]} position={[0, 0.16, 0]} material={M.oakDark} />
    {[-1, 1].map((x) => <Box key={x} size={[0.055, 0.06, d - 0.1]} position={[lx * x, 0.16, 0]} material={M.oakDark} />)}
    {/* An open journal, stacked travel albums, and a small brass pencil cup. */}
    <Box size={[w * 0.32, 0.012, d * 0.53]} position={[0, top + 0.006, d * 0.06]} material={M.throw} />
    {[-1, 1].map((side) => <Box key={side} size={[w * 0.15, 0.008, d * 0.48]}
      position={[side * w * 0.078, top + 0.016, d * 0.06]} material={M.linen} />)}
    {Array.from({ length: 4 }, (_, i) => <Box key={i} size={[w * (0.18 - i * 0.012), 0.024, d * 0.31]}
      position={[-w * 0.32, top + 0.012 + i * 0.024, -d * 0.13]} material={i % 2 ? M.throw : M.linen} />)}
    <mesh position={[w * 0.3, top + 0.045, -d * 0.27]} material={M.brass} castShadow>
      <cylinderGeometry args={[0.035, 0.03, 0.09, 16]} />
    </mesh>
    {Array.from({ length: 5 }, (_, i) => <Box key={`pen-${i}`} size={[0.006, 0.12, 0.006]}
      position={[w * 0.3 + (i - 2) * 0.009, top + 0.1, -d * 0.27]} material={i % 2 ? M.throw : M.oakDark} />)}
  </group>;
}
