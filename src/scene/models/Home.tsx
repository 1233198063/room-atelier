import { RoundedBox } from "@react-three/drei";
import type { Dimensions } from "../../types";
import { useMaterials } from "../RoomContext";
import { Box } from "./Box";

/**
 * L-shaped sofa facing local +Z. The main run sits along the back; the chaise
 * fills the right-hand end from back to front. Rotating it 90° puts the chaise
 * on the other side of the room.
 */
export function CornerSofa({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const feet = 0.07;
  const arm = Math.min(0.22, w * 0.08);
  const seat = h * 0.52;
  const cushionH = 0.15;
  const seatD = Math.min(d - 0.3, Math.max(0.8, d * 0.6));
  const chaiseW = Math.min(w * 0.4, Math.max(0.75, w * 0.32));
  const backD = Math.min(0.22, seatD * 0.22);
  const baseH = seat - cushionH - feet + 0.02;
  const baseY = feet + (seat - cushionH - feet) / 2;
  const back = -d / 2;
  const runW = w - chaiseW;
  const armH = seat + 0.16 - feet;
  const innerW = runW - arm;
  const n = Math.max(1, Math.round(innerW / 0.85));
  const cw = innerW / n;
  const cushionD = seatD - backD - 0.04;
  const chaiseX = w / 2 - (chaiseW + arm) / 2;
  const chaiseCushionW = chaiseW - arm - 0.02;
  const backs = [...Array.from({ length: n }, (_, i) => ({ x: -w / 2 + arm + cw * (i + 0.5), width: cw - 0.03 })),
    { x: chaiseX, width: chaiseCushionW - 0.01 }];
  const feetAt: [number, number][] = [[-w / 2 + 0.08, back + 0.08], [-w / 2 + 0.08, back + seatD - 0.08], [w / 2 - 0.08, back + 0.08],
    [w / 2 - 0.08, d / 2 - 0.08], [w / 2 - chaiseW + 0.08, d / 2 - 0.08]];
  return <group>
    {feetAt.map(([x, z], i) => <Box key={i} size={[0.06, feet, 0.06]} position={[x, feet / 2, z]} material={M.oakDark} />)}
    <RoundedBox args={[runW, baseH, seatD]} radius={0.04} smoothness={2} position={[-w / 2 + runW / 2, baseY, back + seatD / 2]}
      material={M.duvet} castShadow receiveShadow />
    <RoundedBox args={[chaiseW, baseH, d]} radius={0.04} smoothness={2} position={[w / 2 - chaiseW / 2, baseY, 0]}
      material={M.duvet} castShadow receiveShadow />
    <RoundedBox args={[w, h - feet, backD]} radius={0.06} smoothness={2} position={[0, feet + (h - feet) / 2, back + backD / 2]}
      material={M.duvet} castShadow />
    <RoundedBox args={[arm, armH, seatD]} radius={0.08} smoothness={3} position={[-w / 2 + arm / 2, feet + armH / 2, back + seatD / 2]}
      material={M.linen} castShadow />
    <RoundedBox args={[arm, armH, d]} radius={0.08} smoothness={3} position={[w / 2 - arm / 2, feet + armH / 2, 0]}
      material={M.linen} castShadow />
    {Array.from({ length: n }, (_, i) => <RoundedBox key={i} args={[cw - 0.02, cushionH, cushionD]} radius={0.05} smoothness={3}
      position={[-w / 2 + arm + cw * (i + 0.5), seat - cushionH / 2, back + backD + 0.02 + cushionD / 2]}
      material={M.linen} castShadow receiveShadow />)}
    <RoundedBox args={[chaiseCushionW, cushionH, d - backD - 0.04]} radius={0.05} smoothness={3}
      position={[chaiseX, seat - cushionH / 2, back + backD + 0.02 + (d - backD - 0.04) / 2]} material={M.linen} castShadow receiveShadow />
    {backs.map(({ x, width }, i) => <RoundedBox key={`b${i}`} args={[width, (h - seat) * 0.92, 0.2]} radius={0.07} smoothness={3}
      position={[x, seat + (h - seat) * 0.44, back + backD + 0.08]} rotation={[-0.12, 0, 0]} material={M.linen} castShadow />)}
    {[[-w / 2 + arm + 0.25, M.throw], [w / 2 - chaiseW - 0.22, M.cushion], [chaiseX + 0.1, M.throw]].map(([x, material], i) =>
      <RoundedBox key={`p${i}`} args={[0.42, 0.42, 0.13]} radius={0.06} smoothness={3}
        position={[x as number, seat + 0.23, back + backD + 0.26]} rotation={[-0.32, i % 2 ? 0.18 : -0.14, i % 2 ? 0.08 : -0.06]}
        material={material as typeof M.throw} castShadow />)}
  </group>;
}

/** Pedestal dining table. The top follows width and depth, so unequal sizes make an oval. */
export function RoundTable({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const top = 0.04;
  const r = Math.min(w, d) / 2;
  const column = Math.max(0.05, r * 0.11);
  return <group>
    <mesh position={[0, h - top / 2, 0]} scale={[w, 1, d]} material={M.oak} castShadow receiveShadow>
      <cylinderGeometry args={[0.5, 0.5, top, 48]} />
    </mesh>
    <mesh position={[0, h - top - 0.03, 0]} scale={[w * 0.7, 1, d * 0.7]} material={M.oakDark} castShadow>
      <cylinderGeometry args={[0.5, 0.5, 0.06, 40]} />
    </mesh>
    <mesh position={[0, (h - top) / 2, 0]} material={M.oakDark} castShadow>
      <cylinderGeometry args={[column, column * 1.3, h - top - 0.06, 20]} />
    </mesh>
    <mesh position={[0, 0.07, 0]} scale={[w / (2 * r), 1, d / (2 * r)]} material={M.oakDark} castShadow receiveShadow>
      <cylinderGeometry args={[column * 1.3, r * 0.42, 0.1, 32]} />
    </mesh>
    <mesh position={[0, 0.01, 0]} scale={[w / (2 * r), 1, d / (2 * r)]} material={M.oakDark} receiveShadow>
      <cylinderGeometry args={[r * 0.42, r * 0.42, 0.02, 32]} />
    </mesh>
  </group>;
}

/** Flat-screen TV: a thin dark panel with its back at local −Z, ready to hang on a wall. */
export function Tv({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const panel = Math.min(0.03, d * 0.45);
  return <group>
    <Box size={[w * 0.6, h * 0.6, d - panel]} position={[0, h / 2, -d / 2 + (d - panel) / 2]} material={M.iron} />
    <Box size={[w, h, panel]} position={[0, h / 2, d / 2 - panel / 2]} material={M.iron} />
    <mesh position={[0, h / 2, d / 2 + 0.001]} material={M.blackGlass}>
      <planeGeometry args={[w - 0.016, h - 0.016]} />
    </mesh>
  </group>;
}

/** Swivel chair facing +Z: five-star base on casters, gas lift, seat, backrest and armrests. */
export function OfficeChair({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const reach = Math.min(w, d) / 2 - 0.03;
  const seatY = Math.min(0.5, h * 0.43);
  const backH = h - seatY - 0.14;
  return <group>
    {Array.from({ length: 5 }, (_, i) => <group key={i} rotation={[0, (i * 2 * Math.PI) / 5, 0]}>
      <Box size={[0.04, 0.03, reach]} position={[0, 0.075, reach / 2]} material={M.oakDark} />
      <mesh position={[0, 0.03, reach - 0.01]} material={M.iron} castShadow>
        <sphereGeometry args={[0.03, 12, 8]} />
      </mesh>
    </group>)}
    <mesh position={[0, (0.09 + seatY - 0.05) / 2, 0]} material={M.iron} castShadow>
      <cylinderGeometry args={[0.025, 0.03, seatY - 0.05 - 0.09, 12]} />
    </mesh>
    <RoundedBox args={[w * 0.78, 0.08, d * 0.74]} radius={0.03} smoothness={3} position={[0, seatY, 0.03]}
      material={M.linen} castShadow receiveShadow />
    <Box size={[0.05, 0.3, 0.03]} position={[0, seatY + 0.08, -d * 0.37]} material={M.iron} />
    <RoundedBox args={[w * 0.72, backH, 0.07]} radius={0.03} smoothness={3} position={[0, seatY + 0.12 + backH / 2, -d * 0.36]}
      rotation={[-0.1, 0, 0]} material={M.linen} castShadow />
    {[-1, 1].map((side) => <group key={side}>
      <Box size={[0.025, 0.2, 0.025]} position={[side * w * 0.38, seatY + 0.12, 0]} material={M.iron} />
      <Box size={[0.06, 0.025, d * 0.36]} position={[side * w * 0.38, seatY + 0.22, 0.02]} material={M.oakDark} />
    </group>)}
  </group>;
}
