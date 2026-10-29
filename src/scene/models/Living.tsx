import { RoundedBox } from "@react-three/drei";
import { COFFEE_TABLE_MAX_H } from "../../lib/furnitureColors";
import type { Dimensions } from "../../types";
import { useMaterials } from "../RoomContext";
import { Box } from "./Box";

/** Deep sofa facing local +Z: a seat cushion per ~90 cm, back cushions, rolled arms and throw pillows. */
export function Sofa({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const feet = 0.07;
  const arm = Math.min(0.24, w * 0.1);
  const seat = h * 0.52;
  const inner = w - arm * 2;
  const n = Math.max(1, Math.round(inner / 0.9));
  const cw = inner / n;
  const cushionH = 0.15;
  const backD = d * 0.2;
  return <group>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Box key={`${x}:${z}`} size={[0.06, feet, 0.06]}
      position={[x * (w / 2 - 0.08), feet / 2, z * (d / 2 - 0.08)]} material={M.oakDark} />))}
    <RoundedBox args={[w, seat - cushionH - feet + 0.02, d]} radius={0.04} smoothness={2}
      position={[0, feet + (seat - cushionH - feet) / 2, 0]} material={M.duvet} castShadow receiveShadow />
    <RoundedBox args={[w, h - feet, backD]} radius={0.06} smoothness={2}
      position={[0, feet + (h - feet) / 2, -d / 2 + backD / 2]} material={M.duvet} castShadow />
    {[-1, 1].map((side) => <RoundedBox key={side} args={[arm, seat + 0.16 - feet, d]} radius={0.08} smoothness={3}
      position={[side * (w - arm) / 2, feet + (seat + 0.16 - feet) / 2, 0]} material={M.linen} castShadow />)}
    {Array.from({ length: n }, (_, i) => {
      const x = -inner / 2 + cw * (i + 0.5);
      return <group key={i}>
        <RoundedBox args={[cw - 0.02, cushionH, d - backD - 0.04]} radius={0.05} smoothness={3}
          position={[x, seat - cushionH / 2, backD / 2 + 0.01]} material={M.linen} castShadow receiveShadow />
        <RoundedBox args={[cw - 0.03, (h - seat) * 0.92, 0.2]} radius={0.07} smoothness={3}
          position={[x, seat + (h - seat) * 0.44, -d / 2 + backD + 0.08]} rotation={[-0.12, 0, 0]} material={M.linen} castShadow />
      </group>;
    })}
    {/* Throw pillows: accent and natural, leaning against the back cushions */}
    {Array.from({ length: Math.max(2, n + 1) }, (_, i) => {
      const x = -inner / 2 + 0.25 + (inner - 0.5) * (i / Math.max(1, n));
      const s = 0.42 - (i % 2) * 0.05;
      return <RoundedBox key={`p${i}`} args={[s, s, 0.13]} radius={0.06} smoothness={3}
        position={[x, seat + s / 2 + 0.02, -d / 2 + backD + 0.26]} rotation={[-0.32, (i % 2 ? 0.18 : -0.14), (i % 2 ? 0.08 : -0.06)]}
        material={i % 2 ? M.cushion : M.throw} castShadow />;
    })}
  </group>;
}

/**
 * Dining table on four legs; below 55 cm, a travertine coffee table:
 * a thick rounded top on a solid plinth.
 */
export function Table({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  if (h < COFFEE_TABLE_MAX_H) {
    const top = Math.min(0.09, h * 0.25);
    return <group>
      <RoundedBox args={[w, top, d]} radius={Math.min(0.04, top / 2.2)} smoothness={3} position={[0, h - top / 2, 0]}
        material={M.stone} castShadow receiveShadow />
      <RoundedBox args={[w * 0.55, h - top, d * 0.5]} radius={0.05} smoothness={2} position={[0, (h - top) / 2, 0]}
        material={M.stone} castShadow receiveShadow />
    </group>;
  }
  const top = 0.05, leg = Math.min(0.08, w * 0.06), inset = 0.06;
  return <group>
    <RoundedBox args={[w, top, d]} radius={0.015} smoothness={2} position={[0, h - top / 2, 0]} material={M.oak} castShadow receiveShadow />
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <Box key={`${x}:${z}`} size={[leg, h - top, leg]}
      position={[x * (w / 2 - inset - leg / 2), (h - top) / 2, z * (d / 2 - inset - leg / 2)]} material={M.oakDark} />))}
    {[-1, 1].map((z) => <Box key={`a${z}`} size={[w - inset * 2 - leg, 0.08, 0.025]}
      position={[0, h - top - 0.04, z * (d / 2 - inset - leg / 2)]} material={M.oakDark} />)}
  </group>;
}

/** Floor lamp above 90 cm (brass pole, drum shade), table lamp below (ceramic base). Shades glow. */
export function Lamp({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const r = Math.min(w, d) / 2;
  if (h > 0.9) {
    const shadeH = Math.min(0.42, h * 0.24);
    return <group>
      <mesh position={[0, 0.015, 0]} material={M.brass} castShadow receiveShadow>
        <cylinderGeometry args={[r * 0.6, r * 0.66, 0.03, 24]} />
      </mesh>
      <mesh position={[0, (h - shadeH * 0.5) / 2, 0]} material={M.brass} castShadow>
        <cylinderGeometry args={[0.012, 0.014, h - shadeH * 0.5, 8]} />
      </mesh>
      <mesh position={[0, h - shadeH / 2, 0]} material={M.shade} castShadow>
        <cylinderGeometry args={[r * 0.72, r, shadeH, 28, 1, true]} />
      </mesh>
    </group>;
  }
  const shadeH = h * 0.42, baseH = h - shadeH * 0.85;
  return <group>
    <mesh position={[0, baseH * 0.45, 0]} material={M.stone} castShadow receiveShadow>
      <sphereGeometry args={[Math.min(r * 0.55, baseH * 0.5), 20, 14]} />
    </mesh>
    <mesh position={[0, baseH * 0.85, 0]} material={M.brass} castShadow>
      <cylinderGeometry args={[0.01, 0.012, baseH * 0.5, 8]} />
    </mesh>
    <mesh position={[0, h - shadeH / 2, 0]} material={M.shade} castShadow>
      <cylinderGeometry args={[r * 0.62, r, shadeH, 24, 1, true]} />
    </mesh>
  </group>;
}
