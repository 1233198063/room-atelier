import { useEffect, useLayoutEffect, useMemo } from "react";
import { BoxGeometry, IcosahedronGeometry, type BufferGeometry, type CanvasTexture } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Dimensions } from "../../types";
import { createPavingTexture, GROUND_TILE_M, mulberry32 } from "../floorTexture";
import { useMaterials } from "../RoomContext";

/** One low-poly ball, scaled into every leaf cluster and flower. */
const CLUSTER = new IcosahedronGeometry(1, 1);

type Blob = [x: number, y: number, z: number, sx: number, sy: number, sz: number];

/** Leaf clusters merged into one mesh per material, rebuilt only when the size changes. */
function useBlobs(blobs: Blob[]) {
  const geometry = useMemo(() => {
    if (!blobs.length) return null;
    const parts = blobs.map(([x, y, z, sx, sy, sz], i) => {
      const g = CLUSTER.clone();
      g.rotateY(i * 1.3);
      g.scale(sx, sy, sz);
      g.translate(x, y, z);
      return g;
    });
    const merged = mergeGeometries(parts) as BufferGeometry;
    parts.forEach((p) => p.dispose());
    return merged;
  }, [blobs]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  return geometry;
}

/** Stable pseudo-random numbers per size, so a piece looks the same on every render. */
const seeded = (w: number, d: number, h: number) => mulberry32(Math.round(w * 1000) * 31 + Math.round(d * 1000) * 17 + Math.round(h * 1000));

/**
 * A garden tree. Slender proportions (width under 30% of height) grow as a
 * Mediterranean cypress; wider ones as a broad, olive-like canopy on a forked trunk.
 */
export function Tree({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const cypress = Math.min(w, d) < h * 0.3;
  const { light, dark, trunkH, trunkR } = useMemo(() => {
    const rand = seeded(w, d, h);
    const light: Blob[] = [], dark: Blob[] = [];
    if (cypress) {
      const k = 7;
      for (let i = 0; i < k; i++) {
        const t = i / (k - 1), y = h * (0.12 + 0.82 * t);
        const s = 1 - Math.abs(t - 0.3) * 1.1;
        (i % 2 ? dark : light).push([0, y, 0, (w / 2) * Math.max(0.2, s), (h / k) * 0.85, (d / 2) * Math.max(0.2, s)]);
      }
      return { light, dark, trunkH: h * 0.15, trunkR: Math.min(w, d) * 0.08 };
    }
    const trunkH = h * 0.42;
    const cy = trunkH + (h - trunkH) * 0.48, ry = (h - trunkH) / 2;
    for (let i = 0; i < 11; i++) {
      const a = rand() * Math.PI * 2, rr = i === 0 ? 0 : 0.35 + rand() * 0.4, yy = (rand() - 0.4) * 0.9;
      const s = 0.42 + rand() * 0.22;
      (i % 3 === 1 ? dark : light).push([Math.cos(a) * rr * (w / 2), cy + yy * ry, Math.sin(a) * rr * (d / 2),
        s * (w / 2), s * ry * 1.1, s * (d / 2)]);
    }
    return { light, dark, trunkH, trunkR: Math.min(0.22, Math.min(w, d) * 0.045 + 0.03) };
  }, [w, d, h, cypress]);
  const leaves = useBlobs(light), shade = useBlobs(dark);
  return <group>
    <mesh position={[0, trunkH / 2, 0]} material={M.oakDark} castShadow>
      <cylinderGeometry args={[trunkR * 0.75, trunkR, trunkH, 8]} />
    </mesh>
    {!cypress && [-1, 1].map((side) => <mesh key={side} position={[side * w * 0.07, trunkH * 1.12, 0]} rotation={[0, 0, -side * 0.45]}
      material={M.oakDark} castShadow>
      <cylinderGeometry args={[trunkR * 0.45, trunkR * 0.65, trunkH * 0.5, 7]} />
    </mesh>)}
    {leaves && <mesh geometry={leaves} material={M.leaf} castShadow receiveShadow />}
    {shade && <mesh geometry={shade} material={M.leafDark} castShadow receiveShadow />}
  </group>;
}

/** Below this height a shrub is a flowering bed (lavender, roses); taller ones are clipped hedges. */
const FLOWERING_MAX_H = 0.9;

/** A hedge, shrub or bed: rows of leaf clusters filling the footprint, with flowers on low ones. */
export function Shrub({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const { light, dark, flowers } = useMemo(() => {
    const rand = seeded(w, d, h);
    const nx = Math.max(1, Math.round(w / 0.5)), nz = Math.max(1, Math.round(d / 0.5));
    const light: Blob[] = [], dark: Blob[] = [], flowers: Blob[] = [];
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const x = -w / 2 + (w / nx) * (i + 0.5) + (rand() - 0.5) * 0.08, z = -d / 2 + (d / nz) * (j + 0.5) + (rand() - 0.5) * 0.08;
        const s = 0.85 + rand() * 0.3;
        ((i + j) % 2 ? dark : light).push([x, h * 0.5, z, (w / nx) * 0.62 * s, h * 0.55 * s, (d / nz) * 0.62 * s]);
      }
    }
    if (h <= FLOWERING_MAX_H) {
      const count = Math.min(420, Math.round(w * d * 70));
      for (let k = 0; k < count; k++) {
        const x = (rand() - 0.5) * w * 0.9, z = (rand() - 0.5) * d * 0.9;
        const edge = Math.max(Math.abs(x) / (w / 2), Math.abs(z) / (d / 2));
        const r = 0.028 + rand() * 0.02;
        flowers.push([x, h * (0.98 - edge * edge * 0.3) + rand() * 0.05, z, r, r * 1.6, r]);
      }
    }
    return { light, dark, flowers };
  }, [w, d, h]);
  const leaves = useBlobs(light), shade = useBlobs(dark), blooms = useBlobs(flowers);
  return <group>
    {leaves && <mesh geometry={leaves} material={M.leaf} castShadow receiveShadow />}
    {shade && <mesh geometry={shade} material={M.leafDark} castShadow receiveShadow />}
    {blooms && <mesh geometry={blooms} material={M.throw} castShadow />}
  </group>;
}

let pavingTexture: CanvasTexture | null = null;

/** Travertine paving; the stone pattern keeps its real size whatever the slab's footprint. */
export function Paving({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  useLayoutEffect(() => {
    if (M.paving.map) return;
    M.paving.map = pavingTexture ??= createPavingTexture();
    M.paving.needsUpdate = true;
  }, [M]);
  const geometry = useMemo(() => {
    const g = new BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / GROUND_TILE_M), uv.getY(i) * (d / GROUND_TILE_M));
    return g;
  }, [w, d, h]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={[0, h / 2, 0]} material={M.paving} receiveShadow />;
}
