import { useEffect, useMemo } from "react";
import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, TubeGeometry, Vector3, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GALLERY_RAIL } from "../../lib/catalog";
import type { Dimensions } from "../../types";
import { useMaterials } from "../RoomContext";
import { Box } from "./Box";

/** Many small parts (balusters, treads) drawn as one mesh; rebuilt only when the size changes. */
function useMerged(build: () => BufferGeometry[], deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(() => {
    const parts = build();
    const merged = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
    return merged;
  }, deps);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/** Evenly spaced positions from a to b, at most `spacing` apart, ends included. */
function spaced(a: number, b: number, spacing: number): number[] {
  const n = Math.max(1, Math.ceil(Math.abs(b - a) / spacing));
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

/**
 * Mezzanine walkway: a plaster deck with floorboards on slim posts, and a
 * wrought-iron railing with a brass handrail along its open front (+Z).
 * The deck sits GALLERY_RAIL below the piece's top; place upstairs pieces at that elevation.
 */
export function Gallery({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const deck = h - GALLERY_RAIL, slab = 0.24, railZ = d / 2 - 0.06;
  const balusters = useMerged(() => spaced(-w / 2 + 0.05, w / 2 - 0.05, 0.13).map((x) => {
    const g = new BoxGeometry(0.018, GALLERY_RAIL - 0.08, 0.018);
    g.translate(x, deck + (GALLERY_RAIL - 0.08) / 2, railZ);
    return g;
  }), [w, deck, railZ]);
  const posts = w > 3.5 ? spaced(-w / 2 + 0.12, w / 2 - 0.12, 4) : [];
  return <group>
    <Box size={[w, slab, d]} position={[0, deck - 0.02 - slab / 2, 0]} material={M.wall} />
    <Box size={[w, 0.02, d - 0.02]} position={[0, deck - 0.01, -0.01]} material={M.oak} />
    {posts.map((x) => <Box key={x} size={[0.16, deck - 0.02 - slab, 0.16]} position={[x, (deck - 0.02 - slab) / 2, d / 2 - 0.12]} material={M.wall} />)}
    <mesh geometry={balusters} material={M.iron} castShadow />
    <Box size={[w - 0.04, 0.03, 0.03]} position={[0, deck + 0.06, railZ]} material={M.iron} />
    <mesh position={[0, deck + GALLERY_RAIL - 0.025, railZ]} rotation={[0, 0, Math.PI / 2]} material={M.brass} castShadow>
      <cylinderGeometry args={[0.025, 0.025, w - 0.02, 12]} />
    </mesh>
  </group>;
}

/**
 * Three-quarter turn stair around a plaster column. The bottom step faces +Z;
 * the top tread is level with the piece's height, ready to meet a gallery.
 */
export function SpiralStair({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const r = Math.min(w, d) / 2;
  const n = Math.max(8, Math.ceil(h / 0.19));
  const rise = h / n, sweep = Math.PI * 1.5, step = sweep / n;
  const treads = useMerged(() => Array.from({ length: n }, (_, i) => {
    const g = new CylinderGeometry(r, r, 0.05, 6, 1, false, i * step, step * 1.06);
    g.translate(0, (i + 1) * rise - 0.025, 0);
    return g;
  }), [r, n, rise]);
  const balusters = useMerged(() => Array.from({ length: n }, (_, i) => {
    const a = (i + 0.5) * step, g = new CylinderGeometry(0.009, 0.009, 0.9, 6);
    g.translate(Math.sin(a) * (r - 0.05), (i + 1) * rise + 0.45, Math.cos(a) * (r - 0.05));
    return g;
  }), [r, n, rise]);
  const rail = useMemo(() => {
    const points = Array.from({ length: 33 }, (_, k) => {
      const t = k / 32, a = t * sweep;
      return new Vector3(Math.sin(a) * (r - 0.05), t * h + rise * 0.5 + 0.92, Math.cos(a) * (r - 0.05));
    });
    return new TubeGeometry(new CatmullRomCurve3(points), 96, 0.022, 8, false);
  }, [r, h, rise, sweep]);
  useEffect(() => () => rail.dispose(), [rail]);
  return <group>
    <mesh geometry={treads} material={M.oak} castShadow receiveShadow />
    <mesh geometry={balusters} material={M.iron} castShadow />
    <mesh geometry={rail} material={M.brass} castShadow />
    <mesh position={[0, h / 2, 0]} material={M.wall} castShadow>
      <cylinderGeometry args={[0.09, 0.09, h, 16]} />
    </mesh>
  </group>;
}

/** A solid straight flight in stone. The bottom step is at the front (+Z); it climbs toward the back. */
export function Stairs({ width: w, depth: d, height: h }: Dimensions) {
  const M = useMaterials();
  const n = Math.max(1, Math.round(h / 0.17));
  const rise = h / n, run = d / n;
  const steps = useMerged(() => Array.from({ length: n }, (_, i) => {
    const g = new BoxGeometry(w, (i + 1) * rise, run + 0.002);
    g.translate(0, ((i + 1) * rise) / 2, d / 2 - run * (i + 0.5));
    return g;
  }), [w, d, n, rise, run]);
  // A handrail on the right side, following the pitch line 90 cm above the nosings.
  const slope = Math.hypot(d, h), pitch = Math.atan2(h, d);
  return <group>
    <mesh geometry={steps} material={M.stone} castShadow receiveShadow />
    <mesh position={[w / 2 - 0.06, h / 2 + 0.9, 0]} rotation={[pitch, 0, 0]} material={M.iron} castShadow>
      <boxGeometry args={[0.04, 0.04, slope]} />
    </mesh>
    {[...new Set(spaced(0, n - 1, 4).map(Math.round))].map((k) =>
      <Box key={k} size={[0.025, 0.9, 0.025]} position={[w / 2 - 0.06, (k + 1) * rise + 0.45, d / 2 - run * (k + 0.5)]} material={M.iron} />)}
  </group>;
}
