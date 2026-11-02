import { RoundedBox } from "@react-three/drei";
import type { Material } from "three";
import type { Dimensions } from "../../types";
import { useMaterials } from "../RoomContext";
import { Box } from "./Box";

/** An elliptical slab: a cylinder scaled to `w` × `d`, from `y` to `y + h`. */
function Oval({ w, d, h, y, z = 0, taper = 1, material }: {
  w: number; d: number; h: number; y: number; z?: number; taper?: number; material: Material;
}) {
  return <mesh position={[0, y + h / 2, z]} scale={[w, h, d]} material={material} castShadow receiveShadow>
    <cylinderGeometry args={[0.5, 0.5 * taper, 1, 36]} />
  </mesh>;
}

/** Close-coupled toilet facing +Z: tank against the wall at −Z, bowl, seat and lid. */
export function Toilet({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const bowlH = Math.min(0.38, h * 0.5);
  const tankD = Math.min(0.2, d * 0.28);
  const tankH = Math.max(0.12, h - bowlH - 0.04);
  const bowlD = d - tankD + 0.04;
  const bowlZ = -d / 2 + tankD - 0.04 + bowlD / 2;
  return <group>
    <RoundedBox args={[w * 0.95, tankH, tankD]} radius={0.025} smoothness={3} position={[0, h - tankH / 2, -d / 2 + tankD / 2]}
      material={M.ceramic} castShadow receiveShadow />
    <mesh position={[0, h + 0.004, -d / 2 + tankD / 2]} material={M.steel}>
      <cylinderGeometry args={[0.025, 0.025, 0.008, 16]} />
    </mesh>
    <Oval w={w * 0.55} d={bowlD * 0.55} h={0.04} y={0} z={bowlZ} material={M.ceramic} />
    <Oval w={w} d={bowlD} h={bowlH - 0.04} y={0.04} z={bowlZ} taper={0.6} material={M.ceramic} />
    <Oval w={w * 0.98} d={bowlD * 0.97} h={0.035} y={bowlH} z={bowlZ} material={M.ceramic} />
  </group>;
}

/** Bathroom cabinet facing +Z with a semi-recessed basin standing 6 cm proud of its top, and a tap. */
export function Vanity({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const plinth = 0.1, slab = 0.04, basinUp = 0.06;
  const top = h - basinUp;
  const bodyH = top - slab - plinth;
  const bodyD = d - 0.03;
  const frontZ = -d / 2 + bodyD + 0.009;
  const n = Math.max(1, Math.round(w / 0.45));
  const dw = (w - 0.004 * (n + 1)) / n;
  const bw = Math.min(0.55, w * 0.62), bd = d * 0.62;
  return <group>
    <Box size={[w - 0.04, plinth, bodyD - 0.05]} position={[0, plinth / 2, -d / 2 + (bodyD - 0.05) / 2]} material={M.oakDark} />
    <Box size={[w, bodyH, bodyD]} position={[0, plinth + bodyH / 2, -d / 2 + bodyD / 2]} material={M.oakDark} />
    {Array.from({ length: n }, (_, i) => {
      const x = -w / 2 + 0.004 + dw / 2 + i * (dw + 0.004);
      // Handles on the edge nearest the middle; a single door gets its handle on the right.
      const side = x > 1e-6 ? -1 : 1;
      return <group key={i}>
        <Box size={[dw, bodyH - 0.008, 0.018]} position={[x, plinth + bodyH / 2, frontZ]} material={M.oak} />
        <Box size={[0.012, Math.min(0.14, bodyH * 0.25), 0.016]} position={[x + side * (dw / 2 - 0.04), plinth + bodyH - 0.1, frontZ + 0.017]}
          material={M.brass} />
      </group>;
    })}
    <Box size={[w, slab, d]} position={[0, top - slab / 2, 0]} material={M.ceramic} />
    <Oval w={bw} d={bd} h={basinUp + 0.06} y={top - 0.06} z={0.02} taper={0.85} material={M.ceramic} />
    <Oval w={bw - 0.05} d={bd - 0.05} h={0.002} y={h} z={0.02} material={M.ceramicShade} />
    <mesh position={[0, top + 0.09, -bd / 2 - 0.03]} material={M.steel} castShadow>
      <cylinderGeometry args={[0.014, 0.018, 0.18, 12]} />
    </mesh>
    <Box size={[0.022, 0.022, 0.13]} position={[0, top + 0.17, -bd / 2 + 0.03]} material={M.steel} />
  </group>;
}

/** Built-in bathtub, its length along local X, with the tap and drain at the left end. */
export function Bathtub({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const t = 0.08, floor = 0.16;
  return <group>
    {[-1, 1].map((side) => <RoundedBox key={`z${side}`} args={[w, h, t]} radius={0.03} smoothness={3}
      position={[0, h / 2, side * (d / 2 - t / 2)]} material={M.ceramic} castShadow receiveShadow />)}
    {[-1, 1].map((side) => <RoundedBox key={`x${side}`} args={[t, h, d - t * 2 + 0.02]} radius={0.03} smoothness={3}
      position={[side * (w / 2 - t / 2), h / 2, 0]} material={M.ceramic} castShadow receiveShadow />)}
    <Box size={[w - t * 2 + 0.02, floor, d - t * 2 + 0.02]} position={[0, floor / 2, 0]} material={M.ceramicShade} />
    <mesh position={[-w / 2 + t + 0.1, floor + 0.002, 0]} material={M.steel}>
      <cylinderGeometry args={[0.03, 0.03, 0.004, 16]} />
    </mesh>
    <mesh position={[-w / 2 + t / 2, h + 0.06, 0]} material={M.steel} castShadow>
      <cylinderGeometry args={[0.018, 0.022, 0.12, 12]} />
    </mesh>
    <Box size={[0.13, 0.024, 0.024]} position={[-w / 2 + t / 2 + 0.06, h + 0.11, 0]} material={M.steel} />
  </group>;
}

/**
 * Corner shower on a tray: glass along the left side and the front, leaving
 * an opening at the front left. The back and right side go against walls;
 * the shower head hangs from the back.
 */
export function Shower({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const tray = 0.06;
  const open = Math.min(0.6, w * 0.55);
  const glassH = h - tray;
  const postAt: [number, number][] = [[-w / 2 + 0.01, -d / 2 + 0.01], [-w / 2 + 0.01, d / 2 - 0.01], [-w / 2 + open, d / 2 - 0.01], [w / 2 - 0.01, d / 2 - 0.01]];
  return <group>
    <Box size={[w, tray, d]} position={[0, tray / 2, 0]} material={M.ceramic} />
    <mesh position={[w / 4, tray + 0.002, -d / 4]} material={M.steel}>
      <cylinderGeometry args={[0.04, 0.04, 0.004, 16]} />
    </mesh>
    <mesh position={[-w / 2 + 0.005, tray + glassH / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={M.glass}>
      <planeGeometry args={[d - 0.02, glassH]} />
    </mesh>
    <mesh position={[open / 2, tray + glassH / 2, d / 2 - 0.005]} material={M.glass}>
      <planeGeometry args={[w - open, glassH]} />
    </mesh>
    {postAt.map(([x, z], i) => <Box key={i} size={[0.02, glassH, 0.02]} position={[x, tray + glassH / 2, z]} material={M.brass} />)}
    <Box size={[w, 0.02, 0.02]} position={[0, h - 0.01, d / 2 - 0.01]} material={M.brass} />
    <Box size={[0.02, 0.02, d]} position={[-w / 2 + 0.01, h - 0.01, 0]} material={M.brass} />
    <mesh position={[w / 4, (1 + h - 0.15) / 2, -d / 2 + 0.03]} material={M.steel} castShadow>
      <cylinderGeometry args={[0.012, 0.012, h - 0.15 - 1, 10]} />
    </mesh>
    <Box size={[0.1, 0.08, 0.05]} position={[w / 4, 1, -d / 2 + 0.03]} material={M.steel} />
    <Box size={[0.02, 0.02, 0.14]} position={[w / 4, h - 0.15, -d / 2 + 0.1]} material={M.steel} />
    <mesh position={[w / 4, h - 0.17, -d / 2 + 0.17]} material={M.steel} castShadow>
      <cylinderGeometry args={[0.1, 0.1, 0.015, 28]} />
    </mesh>
  </group>;
}
