import { RoundedBox } from "@react-three/drei";
import type { Dimensions } from "../../types";
import { useMaterials } from "../RoomContext";
import { Box } from "./Box";

const FRONT_T = 0.018;
const GAP = 0.004;

/**
 * Fridge facing +Z. Under 80 cm wide: a door over a freezer drawer; from
 * 80 cm, side-by-side doors. Handles take the room's hardware color.
 */
export function Fridge({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const doorT = 0.04;
  const bodyD = d - doorT;
  const z = d / 2 - doorT / 2;
  const sideBySide = w >= 0.8;
  const drawerH = h * 0.32;
  return <group>
    <RoundedBox args={[w, h - 0.02, bodyD]} radius={0.015} smoothness={2} position={[0, 0.01 + (h - 0.02) / 2, -d / 2 + bodyD / 2]}
      material={M.ceramic} castShadow receiveShadow />
    {sideBySide ? [-1, 1].map((side) => <group key={side}>
      <Box size={[w / 2 - GAP, h - 0.04, doorT]} position={[side * (w / 4 + GAP / 4), 0.02 + (h - 0.04) / 2, z]} material={M.ceramic} />
      <Box size={[0.02, h * 0.45, 0.03]} position={[side * 0.05, h * 0.55, d / 2 + 0.015]} material={M.brass} />
    </group>) : <>
      <Box size={[w - GAP, drawerH - GAP, doorT]} position={[0, 0.02 + drawerH / 2, z]} material={M.ceramic} />
      <Box size={[w - GAP, h - drawerH - 0.04, doorT]} position={[0, drawerH + 0.02 + (h - drawerH - 0.04) / 2, z]} material={M.ceramic} />
      <Box size={[w * 0.5, 0.02, 0.03]} position={[0, drawerH - 0.06, d / 2 + 0.015]} material={M.brass} />
      <Box size={[0.02, Math.min(0.5, (h - drawerH) * 0.4), 0.03]} position={[w / 2 - 0.06, drawerH + 0.12 + Math.min(0.25, (h - drawerH) * 0.2), d / 2 + 0.015]}
        material={M.brass} />
    </>}
  </group>;
}

/** Front-loading washing machine: control strip with a dial, and a round porthole door. */
export function Washer({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const strip = Math.min(0.14, h * 0.16);
  const r = Math.min(w * 0.34, (h - strip) * 0.36);
  const doorY = (h - strip) / 2 + 0.02;
  return <group>
    <RoundedBox args={[w, h, d]} radius={0.02} smoothness={2} position={[0, h / 2, 0]} material={M.ceramic} castShadow receiveShadow />
    <Box size={[w - 0.06, strip * 0.55, 0.004]} position={[w * 0.08, h - strip / 2, d / 2 + 0.002]} material={M.blackGlass} />
    <mesh position={[-w / 2 + 0.09, h - strip / 2, d / 2 + 0.012]} rotation={[Math.PI / 2, 0, 0]} material={M.steel} castShadow>
      <cylinderGeometry args={[0.032, 0.032, 0.024, 20]} />
    </mesh>
    <mesh position={[0, doorY, d / 2 + 0.012]} material={M.steel} castShadow>
      <torusGeometry args={[r, 0.028, 12, 40]} />
    </mesh>
    <mesh position={[0, doorY, d / 2 + 0.006]} rotation={[Math.PI / 2, 0, 0]} material={M.blackGlass}>
      <cylinderGeometry args={[r - 0.01, r - 0.01, 0.012, 40]} />
    </mesh>
  </group>;
}

/**
 * Base cabinets facing +Z under a stone countertop. From 1.2 m wide a sink
 * with a tap; from 1.6 m a hob too, sink on the left and hob on the right.
 */
export function KitchenCounter({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const kick = 0.1, top = 0.03;
  const bodyD = d - 0.04;
  const bodyH = h - kick - top;
  const frontZ = -d / 2 + bodyD + FRONT_T / 2;
  const n = Math.max(1, Math.round(w / 0.6));
  const dw = (w - GAP * (n + 1)) / n;
  const hasHob = w >= 1.6;
  const sinkX = hasHob ? -w / 2 + w * 0.28 : 0;
  const sinkW = Math.min(0.75, w * (hasHob ? 0.32 : 0.55)), sinkD = d * 0.7;
  const hobW = Math.min(0.75, w * 0.3), hobX = w / 2 - w * 0.28;
  return <group>
    <Box size={[w - 0.02, kick, bodyD - 0.06]} position={[0, kick / 2, -d / 2 + (bodyD - 0.06) / 2]} material={M.oakDark} />
    <Box size={[w, bodyH, bodyD]} position={[0, kick + bodyH / 2, -d / 2 + bodyD / 2]} material={M.oakDark} />
    {Array.from({ length: n }, (_, i) => {
      const x = -w / 2 + GAP + dw / 2 + i * (dw + GAP);
      return <group key={i}>
        <Box size={[dw, bodyH - 2 * GAP, FRONT_T]} position={[x, kick + bodyH / 2, frontZ]} material={M.oak} />
        <Box size={[Math.min(0.2, dw * 0.5), 0.012, 0.016]} position={[x, kick + bodyH - 0.06, frontZ + 0.017]} material={M.brass} />
      </group>;
    })}
    <Box size={[w, top, d]} position={[0, h - top / 2, 0]} material={M.stone} />
    {w >= 1.2 && <group position={[sinkX, h, 0.02]}>
      <Box size={[sinkW, 0.004, sinkD]} position={[0, 0.002, 0]} material={M.steel} />
      <Box size={[sinkW - 0.06, 0.005, sinkD - 0.06]} position={[0, 0.003, 0]} material={M.iron} />
      <mesh position={[0, 0.13, -sinkD / 2 - 0.04]} material={M.steel} castShadow>
        <cylinderGeometry args={[0.016, 0.02, 0.26, 12]} />
      </mesh>
      <Box size={[0.025, 0.025, 0.2]} position={[0, 0.25, -sinkD / 2 + 0.05]} material={M.steel} />
    </group>}
    {hasHob && <group position={[hobX, h, 0]}>
      <Box size={[hobW, 0.006, d * 0.72]} position={[0, 0.003, 0]} material={M.blackGlass} />
      {[-1, 1].map((side) => <mesh key={side} position={[side * hobW / 4, 0.008, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.steel}>
        <torusGeometry args={[Math.min(0.1, hobW / 5), 0.008, 8, 28]} />
      </mesh>)}
    </group>}
  </group>;
}

/**
 * Freestanding gas range facing +Z: front knobs over an oven door with a
 * window, a storage drawer below, cast-iron grates over the burners and a
 * low back guard. Stainless, like real fittings.
 */
export function Range({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const cook = h - 0.06;
  const frontT = 0.03;
  const bodyD = d - frontT;
  const drawerH = 0.14, panelH = 0.1;
  const doorH = cook - drawerH - panelH - 0.03;
  const doorY = drawerH + 0.02 + doorH / 2;
  const z = d / 2 - frontT / 2;
  const knobs = Math.max(4, Math.min(6, Math.round(w / 0.15)));
  const topD = bodyD - 0.08;
  const topZ = -d / 2 + 0.06 + topD / 2;
  const half = (w - 0.06) / 2;
  const burners: [number, number, number][] = [-1, 1].flatMap((side) => [-1, 1].map((row): [number, number, number] =>
    [side * (w / 4), row * topD / 4, row < 0 ? 0.055 : 0.045]));
  if (w >= 0.75) burners.push([0, 0, 0.06]);
  return <group>
    <Box size={[w, cook, bodyD]} position={[0, cook / 2, -d / 2 + bodyD / 2]} material={M.steel} />
    <Box size={[w - 0.01, drawerH, frontT]} position={[0, 0.01 + drawerH / 2, z]} material={M.steel} />
    <Box size={[w - 0.01, doorH, frontT]} position={[0, doorY, z]} material={M.steel} />
    <mesh position={[0, doorY + doorH * 0.04, d / 2 + 0.001]} material={M.blackGlass}>
      <planeGeometry args={[w * 0.66, doorH * 0.48]} />
    </mesh>
    <mesh position={[0, doorY + doorH / 2 - 0.05, d / 2 + 0.035]} rotation={[0, 0, Math.PI / 2]} material={M.steel} castShadow>
      <cylinderGeometry args={[0.011, 0.011, w * 0.8, 10]} />
    </mesh>
    {[-1, 1].map((side) => <Box key={side} size={[0.02, 0.02, 0.035]} position={[side * w * 0.38, doorY + doorH / 2 - 0.05, d / 2 + 0.017]}
      material={M.steel} />)}
    {Array.from({ length: knobs }, (_, i) => <mesh key={i} position={[-w / 2 + (w / knobs) * (i + 0.5), cook - panelH / 2, d / 2 + 0.012]}
      rotation={[Math.PI / 2, 0, 0]} material={M.iron} castShadow>
      <cylinderGeometry args={[0.018, 0.02, 0.025, 14]} />
    </mesh>)}
    <Box size={[w - 0.02, 0.008, topD]} position={[0, cook + 0.004, topZ]} material={M.blackGlass} />
    {burners.map(([x, dz, r], i) => <mesh key={i} position={[x, cook + 0.016, topZ + dz]} material={M.iron}>
      <cylinderGeometry args={[r, r * 1.1, 0.018, 20]} />
    </mesh>)}
    {[-1, 1].map((side) => <group key={side} position={[side * (half / 2 + 0.01), cook + 0.032, topZ]}>
      {[-1, 0, 1].map((k) => <Box key={`x${k}`} size={[half - 0.01, 0.012, 0.012]} position={[0, 0, k * (topD / 2 - 0.02)]} material={M.iron} />)}
      {[-1, 0, 1].map((k) => <Box key={`z${k}`} size={[0.012, 0.012, topD - 0.03]} position={[k * (half / 2 - 0.01), 0, 0]} material={M.iron} />)}
    </group>)}
    <Box size={[w, h - cook, 0.05]} position={[0, cook + (h - cook) / 2, -d / 2 + 0.025]} material={M.steel} />
  </group>;
}

/**
 * Wall-hung cabinets facing +Z, back against the wall: shaker doors (a frame
 * around a flat panel), bar pulls by the bottom edge, a crown along the top
 * and a warm strip light underneath. Hang them by raising the elevation.
 */
export function WallCabinet({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const bodyD = d - FRONT_T;
  const frontZ = -d / 2 + bodyD + FRONT_T / 2;
  const n = Math.max(1, Math.round(w / 0.45));
  const dw = (w - GAP * (n + 1)) / n;
  const dh = h - GAP * 2;
  const rail = Math.min(0.065, dw * 0.16, dh * 0.18);
  const pull = Math.min(0.12, dh * 0.3);
  return <group>
    <Box size={[w, h, bodyD]} position={[0, h / 2, -d / 2 + bodyD / 2]} material={M.oakDark} />
    {Array.from({ length: n }, (_, i) => {
      const x = -w / 2 + GAP + dw / 2 + i * (dw + GAP);
      // Pulls go on the door edge nearest the middle, as on paired doors.
      const side = n === 1 || x < -1e-6 ? 1 : -1;
      return <group key={i} position={[x, h / 2, frontZ]}>
        <Box size={[dw, dh, FRONT_T]} position={[0, 0, 0]} material={M.oak} />
        {[-1, 1].map((s) => <Box key={`s${s}`} size={[rail, dh, 0.008]} position={[s * (dw - rail) / 2, 0, FRONT_T / 2 + 0.004]} material={M.oak} />)}
        {[-1, 1].map((s) => <Box key={`r${s}`} size={[dw - rail * 2, rail, 0.008]} position={[0, s * (dh - rail) / 2, FRONT_T / 2 + 0.004]} material={M.oak} />)}
        <Box size={[0.012, pull, 0.016]} position={[side * (dw / 2 - rail / 2), -dh / 2 + rail + pull / 2 + 0.02, FRONT_T / 2 + 0.016]}
          material={M.brass} />
      </group>;
    })}
    <Box size={[w + 0.02, 0.045, 0.03]} position={[0, h - 0.0225, d / 2 + 0.006]} material={M.oak} />
    <mesh position={[0, -0.002, d / 2 - 0.06]} rotation={[Math.PI / 2, 0, 0]} material={M.glow}>
      <planeGeometry args={[w - 0.06, 0.03]} />
    </mesh>
  </group>;
}

/**
 * Built-in dishwasher facing +Z under its strip of countertop, so it continues
 * a run of counters: a full-height door with a bar handle along the top.
 */
export function Dishwasher({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const top = 0.03, kick = 0.1;
  const doorH = h - top - kick - 0.01;
  const doorZ = d / 2 - 0.025;
  const handleY = h - top - 0.12;
  return <group>
    <Box size={[w - 0.02, h - top, d - 0.06]} position={[0, (h - top) / 2, -0.03]} material={M.ceramicShade} />
    <Box size={[w - 0.01, kick - 0.01, 0.02]} position={[0, kick / 2, d / 2 - 0.1]} material={M.iron} />
    <Box size={[w - 0.006, doorH, 0.03]} position={[0, kick + doorH / 2, doorZ]} material={M.ceramic} />
    <Box size={[w - 0.006, 0.004, 0.032]} position={[0, h - top - 0.07, doorZ]} material={M.ceramicShade} />
    <Box size={[w * 0.6, 0.022, 0.022]} position={[0, handleY, doorZ + 0.04]} material={M.steel} />
    {[-1, 1].map((side) => <Box key={side} size={[0.018, 0.018, 0.026]} position={[side * w * 0.28, handleY, doorZ + 0.024]} material={M.steel} />)}
    <Box size={[w, top, d]} position={[0, h - top / 2, 0]} material={M.stone} />
  </group>;
}

/**
 * Microwave facing +Z: a door with a dark window and a keypad strip on the
 * right. Over-the-range models hang above the hob; set the elevation.
 */
export function Microwave({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const panelW = Math.min(0.17, w * 0.24);
  const doorW = w - panelW - 0.01;
  const doorX = -w / 2 + doorW / 2 + 0.005;
  return <group>
    <RoundedBox args={[w, h, d - 0.02]} radius={0.012} smoothness={2} position={[0, h / 2, -0.01]} material={M.ceramic} castShadow receiveShadow />
    <Box size={[doorW, h - 0.05, 0.02]} position={[doorX, h / 2 - 0.005, d / 2 - 0.01]} material={M.ceramic} />
    <mesh position={[doorX - 0.01, h / 2 - 0.005, d / 2 + 0.001]} material={M.blackGlass}>
      <planeGeometry args={[doorW * 0.78, (h - 0.05) * 0.7]} />
    </mesh>
    <mesh position={[w / 2 - panelW / 2 - 0.005, h / 2 - 0.005, d / 2 - 0.009]} material={M.blackGlass}>
      <planeGeometry args={[panelW - 0.02, h - 0.06]} />
    </mesh>
    <Box size={[0.018, (h - 0.05) * 0.6, 0.03]} position={[doorX + doorW / 2 - 0.03, h / 2, d / 2 + 0.015]} material={M.steel} />
    <Box size={[w - 0.04, 0.016, 0.004]} position={[0, h - 0.02, d / 2 - 0.008]} material={M.blackGlass} />
  </group>;
}
