import type { Dimensions } from "../../types";
import { useMaterials } from "../RoomContext";
import { Box } from "./Box";

const GAP = 0.004;
const FRONT_T = 0.018;

/**
 * Fronts face local +Z. Low pieces (≤ 1 m) get stacked drawers, tall ones get
 * doors — so the same type works as a nightstand, sideboard or wardrobe.
 */
export function Cabinet({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const plinthH = Math.min(0.08, h * 0.1);
  const bodyD = d - 0.02;
  const bodyH = h - plinthH;
  const frontZ = -d / 2 + bodyD + FRONT_T / 2;

  return (
    <group>
      <Box size={[w - 0.04, plinthH, bodyD - 0.04]} position={[0, plinthH / 2, -0.01]} material={M.oakDark} />
      <Box size={[w, bodyH, bodyD]} position={[0, plinthH + bodyH / 2, -0.01]} material={M.oakDark} />
      {h <= 1 ? (
        <Drawers w={w} bodyH={bodyH} plinthH={plinthH} frontZ={frontZ} />
      ) : (
        <Doors w={w} bodyH={bodyH} plinthH={plinthH} frontZ={frontZ} />
      )}
    </group>
  );
}

interface FrontProps {
  w: number;
  bodyH: number;
  plinthH: number;
  frontZ: number;
}

function Drawers({ w, bodyH, plinthH, frontZ }: FrontProps) {
  const M = useMaterials();
  const count = Math.max(1, Math.min(5, Math.round(bodyH / 0.22)));
  const fh = (bodyH - GAP * (count + 1)) / count;
  const handleW = Math.min(0.16, w * 0.4);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const y = plinthH + GAP + fh / 2 + i * (fh + GAP);
        return (
          <group key={i}>
            <Box size={[w - 2 * GAP, fh, FRONT_T]} position={[0, y, frontZ]} material={M.oak} />
            <Box size={[handleW, 0.012, 0.016]} position={[0, y + fh * 0.22, frontZ + 0.017]} material={M.brass} />
          </group>
        );
      })}
    </>
  );
}

function Doors({ w, bodyH, plinthH, frontZ }: FrontProps) {
  const M = useMaterials();
  const count = Math.max(1, Math.min(4, Math.round(w / 0.5)));
  const dw = (w - GAP * (count + 1)) / count;
  const y = plinthH + bodyH / 2;
  const handleH = Math.min(0.22, bodyH * 0.15);
  const handleY = plinthH + Math.min(bodyH * 0.55, 1.05);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const x = -w / 2 + GAP + dw / 2 + i * (dw + GAP);
        // Put each handle on the door edge nearest the cabinet's center line.
        const side = Math.abs(x) < 1e-6 ? 1 : -Math.sign(x);
        const hx = count === 1 ? dw / 2 - 0.05 : x + side * (dw / 2 - 0.04);
        return (
          <group key={i}>
            <Box size={[dw, bodyH - 2 * GAP, FRONT_T]} position={[x, y, frontZ]} material={M.oak} />
            <Box size={[0.012, handleH, 0.016]} position={[hx, handleY, frontZ + 0.017]} material={M.brass} />
          </group>
        );
      })}
    </>
  );
}
