import type { Dimensions } from "../../types";
import { MATERIALS as M } from "../materials";
import { Box } from "./Box";

const GAP = 0.004;
const FRONT_T = 0.018;

/**
 * A mid-century chest of drawers: a body on short legs under a slightly
 * overhanging top. Drawers fill a grid — two columns once it's a metre wide,
 * one row per ~20 cm of height. Fronts face local +Z.
 */
export function Dresser({ width: w, depth: d, height: h }: Dimensions) {
  const topT = 0.025;
  const legH = Math.min(0.15, Math.max(0.06, h * 0.14));
  const leg = 0.035;
  const bodyW = w - 0.02; // the top overhangs the body by 1 cm on each side
  const bodyD = d - 0.03;
  const bodyH = h - topT - legH;
  const bodyZ = -0.015;
  const frontZ = bodyZ + bodyD / 2 + FRONT_T / 2;

  const cols = w >= 1 ? 2 : 1;
  const rows = Math.max(2, Math.min(5, Math.round(bodyH / 0.2)));
  const fw = (bodyW - GAP * (cols + 1)) / cols;
  const fh = (bodyH - GAP * (rows + 1)) / rows;
  const handleW = Math.min(0.12, fw * 0.35);

  const lx = bodyW / 2 - 0.04;
  const lz = bodyD / 2 - 0.04;

  return (
    <group>
      {[
        [-lx, bodyZ - lz],
        [lx, bodyZ - lz],
        [-lx, bodyZ + lz],
        [lx, bodyZ + lz],
      ].map(([x, z], i) => (
        <Box key={i} size={[leg, legH, leg]} position={[x, legH / 2, z]} material={M.oakDark} />
      ))}
      <Box size={[bodyW, bodyH, bodyD]} position={[0, legH + bodyH / 2, bodyZ]} material={M.oakDark} />
      <Box size={[w, topT, d]} position={[0, h - topT / 2, 0]} material={M.oak} />

      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = -bodyW / 2 + GAP + fw / 2 + c * (fw + GAP);
        const y = legH + GAP + fh / 2 + r * (fh + GAP);
        return (
          <group key={i}>
            <Box size={[fw, fh, FRONT_T]} position={[x, y, frontZ]} material={M.oak} />
            <Box size={[handleW, 0.012, 0.016]} position={[x, y + fh * 0.18, frontZ + 0.017]} material={M.brass} />
          </group>
        );
      })}
    </group>
  );
}
