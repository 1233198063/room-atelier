import { MeshStandardMaterial } from "three";
import type { Dimensions } from "../../types";
import { paintingTexture, PAINTING_VARIANTS } from "../paintings";
import { useMaterials } from "../RoomContext";
import { Box } from "./Box";

// Paintings don't follow the room palette, so one material per variant is shared scene-wide.
const canvasMaterials = new Map<string, MeshStandardMaterial>();
function paintingMaterial(variant: number, glow: boolean) {
  const key = `${variant}:${glow}`;
  let m = canvasMaterials.get(key);
  if (!m) {
    const map = paintingTexture(variant);
    m = glow
      ? new MeshStandardMaterial({ map, emissiveMap: map, emissive: "#ffffff", emissiveIntensity: 0.7, roughness: 0.95 })
      : new MeshStandardMaterial({ map, roughness: 0.85 });
    canvasMaterials.set(key, m);
  }
  return m;
}

/** Pick a painting from the piece's size, so neighbouring frames rarely repeat. */
const variantFor = (w: number, h: number) => Math.round((w * 7 + h * 13) * 10) % PAINTING_VARIANTS;

/** A-frame easel: two splayed front legs, a back leg, a ledge and a canvas tilted back. */
export function Easel({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const canvasW = w * 0.92, canvasH = Math.min(h * 0.42, canvasW * 0.75);
  const ledge = h * 0.42;
  const tilt = 0.16;
  const legLen = Math.hypot(h, w * 0.35);
  const splay = Math.atan2(w * 0.35, h);
  // The back leg runs from the floor at the back to where the front legs meet.
  const meetY = h * 0.85, meetZ = d * 0.1 - Math.tan(tilt) * (meetY - h / 2), footZ = -d / 2 + 0.02;
  return <group>
    {[-1, 1].map((side) => <mesh key={side} position={[side * w * 0.2, h / 2, d * 0.1]} rotation={[-tilt, 0, side * splay]}
      material={M.oak} castShadow>
      <boxGeometry args={[0.035, legLen, 0.035]} />
    </mesh>)}
    <mesh position={[0, meetY / 2, (meetZ + footZ) / 2 - 0.03]} rotation={[Math.atan2(meetZ - footZ, meetY), 0, 0]} material={M.oak} castShadow>
      <boxGeometry args={[0.03, Math.hypot(meetY, meetZ - footZ), 0.03]} />
    </mesh>
    <Box size={[w * 0.75, 0.035, 0.07]} position={[0, ledge, d * 0.1 + Math.tan(tilt) * (h / 2 - ledge)]} material={M.oak} />
    <group position={[0, ledge + canvasH / 2 + 0.02, d * 0.1 + Math.tan(tilt) * (h / 2 - ledge - canvasH / 2) + 0.03]} rotation={[-tilt, 0, 0]}>
      <Box size={[canvasW, canvasH, 0.025]} position={[0, 0, 0]} material={M.linen} />
      <mesh position={[0, 0, 0.0135]} material={paintingMaterial(variantFor(w, h), false)}>
        <planeGeometry args={[canvasW - 0.02, canvasH - 0.02]} />
      </mesh>
    </group>
  </group>;
}

/** Wall-hung projection screen facing +Z: a dark roller case over a lit picture. */
export function Screen({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const caseH = Math.min(0.12, h * 0.1);
  return <group>
    <Box size={[w + 0.08, caseH, d]} position={[0, h - caseH / 2, 0]} material={M.iron} />
    <Box size={[w, h - caseH, 0.012]} position={[0, (h - caseH) / 2, -d / 2 + 0.006]} material={M.iron} />
    <mesh position={[0, (h - caseH) / 2 + 0.01, -d / 2 + 0.0135]} material={paintingMaterial(variantFor(w, h), true)}>
      <planeGeometry args={[w - 0.06, h - caseH - 0.06]} />
    </mesh>
  </group>;
}

/** Framed painting facing +Z with a pale mat; hang it by raising its elevation. */
export function Artwork({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const frame = Math.min(0.05, Math.min(w, h) * 0.08), mat = Math.min(w, h) * 0.08;
  return <group>
    <Box size={[w, h, d]} position={[0, h / 2, 0]} material={M.oak} />
    <mesh position={[0, h / 2, d / 2 + 0.001]} material={M.linen}>
      <planeGeometry args={[w - frame * 2, h - frame * 2]} />
    </mesh>
    <mesh position={[0, h / 2, d / 2 + 0.002]} material={paintingMaterial(variantFor(w, h), false)}>
      <planeGeometry args={[w - frame * 2 - mat * 2, h - frame * 2 - mat * 2]} />
    </mesh>
  </group>;
}
