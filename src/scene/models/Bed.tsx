import type { Dimensions } from "../../types";
import { MATERIALS as M } from "../materials";
import { Box } from "./Box";

/** Headboard at local −Z (the "back"), foot of the bed toward +Z. */
export function Bed({ width: w, depth: d, height: h }: Dimensions) {
  const plinthH = 0.06;
  const baseH = Math.min(0.28, h * 0.3);
  const mattressH = Math.min(0.22, Math.max(0.1, h * 0.25));
  const headT = 0.06;

  const backZ = -d / 2 + headT; // inner face of the headboard
  const mattressTop = baseH + mattressH;
  const mattressD = d - headT - 0.04;
  const mattressZ = backZ + 0.01 + mattressD / 2;

  const pillowCount = w >= 1.3 ? 2 : 1;
  const pillowW = Math.min(0.62, (w - 0.16) / pillowCount - 0.06);
  const pillowZ = backZ + 0.04 + 0.18;

  const duvetStart = backZ + 0.52;
  const duvetEnd = d / 2 - 0.02;

  return (
    <group>
      <Box size={[w - 0.1, plinthH, d - 0.1]} position={[0, plinthH / 2, 0]} material={M.oakDark} />
      <Box size={[w, baseH - plinthH, d]} position={[0, plinthH + (baseH - plinthH) / 2, 0]} material={M.oak} />
      <Box size={[w, h, headT]} position={[0, h / 2, -d / 2 + headT / 2]} material={M.oak} />
      <Box size={[w - 0.06, mattressH, mattressD]} position={[0, baseH + mattressH / 2, mattressZ]} material={M.linen} />

      {Array.from({ length: pillowCount }, (_, i) => {
        const x = pillowCount === 1 ? 0 : (i === 0 ? -1 : 1) * (pillowW / 2 + 0.04);
        return (
          <Box key={i} size={[pillowW, 0.12, 0.36]} position={[x, mattressTop + 0.06, pillowZ]} material={M.linen} />
        );
      })}

      <Box
        size={[w - 0.02, 0.05, duvetEnd - duvetStart]}
        position={[0, mattressTop + 0.02, (duvetStart + duvetEnd) / 2]}
        material={M.duvet}
      />
      <Box size={[w, 0.03, 0.42]} position={[0, mattressTop + 0.055, d / 2 - 0.3]} material={M.throw} />
    </group>
  );
}
