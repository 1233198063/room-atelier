import { RoundedBox } from "@react-three/drei";
import type { Dimensions } from "../../types";
import { useMaterials } from "../RoomContext";
import { Box } from "./Box";

/** Reading chair faces local +Z. */
export function Armchair({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const seat = h * 0.43, arm = w * 0.14;
  return <group>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Box key={`${x}:${z}`} size={[0.055, 0.18, 0.055]}
      position={[x * w * 0.37, 0.09, z * d * 0.35]} material={M.oakDark} />))}
    <RoundedBox args={[w * 0.88, seat - 0.13, d * 0.86]} radius={0.055} smoothness={2} position={[0, (seat + 0.13) / 2, 0]} material={M.duvet} castShadow />
    <RoundedBox args={[w - arm * 2, 0.13, d * 0.75]} radius={0.045} smoothness={2} position={[0, seat, d * 0.055]} material={M.linen} castShadow />
    <RoundedBox args={[w * 0.86, h - seat, d * 0.18]} radius={0.06} smoothness={2} position={[0, seat + (h - seat) / 2, -d * 0.39]} material={M.linen} castShadow />
    {[-1, 1].map((side) => <RoundedBox key={side} args={[arm, h * 0.25, d * 0.83]} radius={0.04} smoothness={2}
      position={[side * (w - arm) / 2, seat + h * 0.08, 0]} material={M.linen} castShadow />)}
    <RoundedBox args={[w * 0.45, h * 0.3, 0.09]} radius={0.04} smoothness={2} position={[0, seat + h * 0.19, -d * 0.22]}
      rotation={[-0.15, 0, 0]} material={M.throw} castShadow />
  </group>;
}

export function Ottoman({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  return <group>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Box key={`${x}:${z}`} size={[0.05, h * 0.45, 0.05]}
      position={[x * w * 0.36, h * 0.225, z * d * 0.35]} material={M.oakDark} />))}
    <RoundedBox args={[w, h * 0.65, d]} radius={0.045} smoothness={2} position={[0, h * 0.675, 0]} material={M.linen} castShadow />
  </group>;
}
