import type { Dimensions } from "../../types";
import { MATERIALS as M } from "../materials";
import { Box } from "./Box";

/** Backrest at local +Z, so the sitter faces −Z (toward a desk placed in front of it). */
export function Chair({ width: w, depth: d, height: h }: Dimensions) {
  const seatY = Math.min(0.46, h * 0.55);
  const seatT = 0.04;
  const leg = 0.035;
  const inset = 0.02;
  const lx = w / 2 - inset - leg / 2;
  const lz = d / 2 - inset - leg / 2;

  const backH = h - seatY;
  const railH = Math.min(0.14, backH * 0.35);

  return (
    <group>
      <Box size={[w, seatT, d]} position={[0, seatY - seatT / 2, 0]} material={M.oak} />
      <Box size={[w - 0.05, 0.035, d - 0.1]} position={[0, seatY + 0.0175, -0.025]} material={M.cushion} />
      {[
        [-lx, -lz],
        [lx, -lz],
        [-lx, lz],
        [lx, lz],
      ].map(([x, z], i) => (
        <Box key={i} size={[leg, seatY - seatT, leg]} position={[x, (seatY - seatT) / 2, z]} material={M.oakDark} />
      ))}
      {/* Back posts continue the rear legs up past the seat */}
      {[-lx, lx].map((x, i) => (
        <Box key={i} size={[leg, backH, leg]} position={[x, seatY + backH / 2, lz]} material={M.oakDark} />
      ))}
      <Box size={[w - 2 * inset, railH, 0.025]} position={[0, h - railH / 2 - 0.02, lz]} material={M.oak} />
      <Box size={[w - 2 * inset, 0.03, 0.02]} position={[0, seatY + backH * 0.42, lz]} material={M.oak} />
    </group>
  );
}
