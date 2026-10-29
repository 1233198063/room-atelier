import { useEffect, useMemo } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { WALL_T } from "../lib/openings";
import { hipRoof, ROOF_OVERHANG, roofTriangles } from "../lib/roof";
import type { Room, Vec3 } from "../types";
import { ROOF_TILE_M, roofTileTexture } from "./paintings";
import { useMaterials } from "./RoomContext";

let tileMaterial: MeshStandardMaterial | null = null;
let capMaterial: MeshStandardMaterial | null = null;
/** Terracotta is the same on every roof, so the materials are shared and created on first use. */
function roofMaterials() {
  tileMaterial ??= new MeshStandardMaterial({ color: "#e0a888", map: roofTileTexture(), roughness: 0.85, side: DoubleSide });
  capMaterial ??= new MeshStandardMaterial({ color: "#a65f42", roughness: 0.8 });
  return { tile: tileMaterial, cap: capMaterial };
}

const UP = new Vector3(0, 1, 0);

/** A round capping tile laid along a ridge or hip line. */
function Cap({ from, to, material }: { from: Vec3; to: Vec3; material: MeshStandardMaterial }) {
  const a = new Vector3(...from), b = new Vector3(...to);
  const length = a.distanceTo(b);
  const quaternion = new Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize());
  return <mesh position={a.add(b).multiplyScalar(0.5)} quaternion={quaternion} material={material} castShadow>
    <cylinderGeometry args={[0.07, 0.07, length, 10]} />
  </mesh>;
}

/**
 * Terracotta hip roof sitting on the walls, with stucco eave boards and a
 * chimney on larger houses. Shown on rooms seen from outside.
 */
export function Roof({ room }: { room: Room }) {
  const M = useMaterials();
  const { tile, cap } = roofMaterials();
  const roof = useMemo(() => hipRoof(room.width, room.depth), [room.width, room.depth]);
  const geometry = useMemo(() => {
    const { positions, uvs } = roofTriangles(roof);
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new Float32BufferAttribute(uvs.map((v) => v / ROOF_TILE_M), 2));
    g.computeVertexNormals();
    return g;
  }, [roof]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const o = WALL_T + ROOF_OVERHANG, fascia = 0.16;
  const L = room.width + o * 2, D = room.depth + o * 2;
  const chimney = room.width * room.depth > 40;
  return <group position={[0, room.height, 0]}>
    <mesh geometry={geometry} material={tile} castShadow receiveShadow />
    {roof.edges.map(([a, b], i) => <Cap key={i} from={a} to={b} material={cap} />)}
    {/* Eave boards close the gap between the slopes and the wall tops. */}
    {[[room.width / 2, -o, L, 0.04], [room.width / 2, room.depth + o, L, 0.04]].map(([x, z, w, d], i) =>
      <mesh key={`x${i}`} position={[x, -fascia / 2, z]} material={M.wall} castShadow><boxGeometry args={[w, fascia, d]} /></mesh>)}
    {[[-o, room.depth / 2], [room.width + o, room.depth / 2]].map(([x, z], i) =>
      <mesh key={`z${i}`} position={[x, -fascia / 2, z]} material={M.wall} castShadow><boxGeometry args={[0.04, fascia, D]} /></mesh>)}
    {chimney && <group position={[room.width * 0.74, 0, room.depth * 0.3]}>
      <mesh position={[0, (roof.rise + 1) / 2, 0]} material={M.wall} castShadow><boxGeometry args={[0.7, roof.rise + 1, 0.7]} /></mesh>
      <mesh position={[0, roof.rise + 1.06, 0]} material={cap} castShadow><boxGeometry args={[0.86, 0.12, 0.86]} /></mesh>
    </group>}
  </group>;
}
