import type { Dimensions } from "../../types";
import { useMaterials } from "../RoomContext";
import { Box } from "./Box";

/** The seated side (drawer front) faces local +Z. */
export function Desk({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const topT = 0.03;
  const leg = 0.04;
  const inset = 0.03;
  const legH = h - topT;
  const lx = w / 2 - inset - leg / 2;
  const lz = d / 2 - inset - leg / 2;

  const drawerW = Math.min(0.42, w * 0.35);
  const drawerH = 0.11;
  const drawerX = w / 2 - inset - leg - drawerW / 2 - 0.01;
  const drawerY = h - topT - drawerH / 2;

  return (
    <group>
      <Box size={[w, topT, d]} position={[0, h - topT / 2, 0]} material={M.oak} />
      {[
        [-lx, -lz],
        [lx, -lz],
        [-lx, lz],
        [lx, lz],
      ].map(([x, z], i) => (
        <Box key={i} size={[leg, legH, leg]} position={[x, legH / 2, z]} material={M.oakDark} />
      ))}
      {/* Rear apron keeps the legs from looking like they float */}
      <Box size={[w - 2 * inset, 0.08, 0.02]} position={[0, h - topT - 0.04, -lz]} material={M.oak} />
      <Box size={[drawerW, drawerH, d - 0.14]} position={[drawerX, drawerY, 0.02]} material={M.oak} />
      <Box size={[0.14, 0.012, 0.016]} position={[drawerX, drawerY, d / 2 - 0.05 + 0.008]} material={M.brass} />
    </group>
  );
}
