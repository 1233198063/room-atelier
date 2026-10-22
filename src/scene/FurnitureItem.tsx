import { Edges } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { memo, useState, type ComponentType } from "react";
import { degToRad } from "../lib/geometry";
import { useEditor } from "../store/editorStore";
import type { Dimensions, Furniture, FurnitureType } from "../types";
import { ACCENT, ACCENT_SOFT } from "./materials";
import { Bed } from "./models/Bed";
import { Cabinet } from "./models/Cabinet";
import { Chair } from "./models/Chair";
import { Desk } from "./models/Desk";
import { Dresser } from "./models/Dresser";
import { useFurnitureDrag } from "./useFurnitureDrag";

const MODELS: Record<FurnitureType, ComponentType<Dimensions>> = {
  bed: Bed,
  desk: Desk,
  chair: Chair,
  cabinet: Cabinet,
  dresser: Dresser,
};

const noRaycast = () => null;

interface Props {
  furniture: Furniture;
  selected: boolean;
}

/**
 * One piece of furniture. Everything visual is derived from the `furniture`
 * data: position → group position, rotation (degrees) → radians around Y,
 * dimensions → the parametric model.
 */
export const FurnitureItem = memo(function FurnitureItem({ furniture: f, selected }: Props) {
  const editing = useEditor((s) => s.mode === "edit");
  const gl = useThree((s) => s.gl);
  const [hovered, setHovered] = useState(false);
  const onPointerDown = useFurnitureDrag(f.id);
  const Model = MODELS[f.type];
  const { width: w, height: h, depth: d } = f.dimensions;

  const outline = editing && (selected || hovered);

  return (
    <group
      position={f.position}
      rotation={[0, degToRad(f.rotation), 0]}
      onPointerDown={onPointerDown}
      onPointerOver={(e) => {
        if (!editing) return;
        e.stopPropagation();
        setHovered(true);
        if (!gl.domElement.style.cursor) gl.domElement.style.cursor = "grab";
      }}
      onPointerOut={() => {
        setHovered(false);
        if (gl.domElement.style.cursor === "grab") gl.domElement.style.cursor = "";
      }}
    >
      <Model {...f.dimensions} />

      {outline && (
        <mesh position={[0, h / 2, 0]} raycast={noRaycast}>
          <boxGeometry args={[w + 0.01, h + 0.01, d + 0.01]} />
          <meshBasicMaterial visible={false} />
          <Edges color={selected ? ACCENT : ACCENT_SOFT} lineWidth={selected ? 1.6 : 1} />
        </mesh>
      )}

      {editing && selected && (
        // Footprint highlight, pinned to the floor even if the piece is elevated.
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -f.position[1] + 0.004, 0]} raycast={noRaycast}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.14} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
});
