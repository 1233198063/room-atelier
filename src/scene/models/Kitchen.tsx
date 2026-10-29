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
