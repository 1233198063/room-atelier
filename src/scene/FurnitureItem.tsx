import { Edges } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { memo, useState, type ComponentType } from "react";
import { useName, useT } from "../i18n";
import { degToRad, furnitureSurfaceHeight } from "../lib/geometry";
import { useEditor } from "../store/editorStore";
import type { Dimensions, Furniture, FurnitureType } from "../types";
import { ACCENT, ACCENT_SOFT, WARN } from "./materials";
import { Bed } from "./models/Bed";
import { Cabinet } from "./models/Cabinet";
import { Chair } from "./models/Chair";
import { Desk } from "./models/Desk";
import { Dresser } from "./models/Dresser";
import { Plant } from "./models/Plant";
import { useFurnitureDrag } from "./useFurnitureDrag";
import { FurnitureMaterialProvider } from "./RoomContext";
import { Bookcase } from "./models/Bookcase";
import { Worktable } from "./models/Worktable";
import { Armchair, Ottoman } from "./models/Armchair";
import { Rug } from "./models/Rug";
import { Curtains } from "./models/Curtains";
import { ScreenLabel } from "./ScreenLabel";
import { Lamp, Sofa, Table } from "./models/Living";
import { Artwork, Easel, Screen } from "./models/Studio";
import { Gallery, SpiralStair, Stairs } from "./models/Structure";
import { Paving, Shrub, Tree } from "./models/Garden";
import { CornerSofa, OfficeChair, RoundTable, Tv } from "./models/Home";
import { Dishwasher, Fridge, KitchenCounter, Microwave, Range, WallCabinet, Washer } from "./models/Kitchen";
import { Bathtub, Shower, Toilet, Vanity } from "./models/Bathroom";

const MODELS: Record<FurnitureType, ComponentType<Dimensions>> = {
  bookcase: Bookcase,
  worktable: Worktable,
  armchair: Armchair,
  ottoman: Ottoman,
  rug: Rug,
  curtains: Curtains,
  bed: Bed,
  desk: Desk,
  chair: Chair,
  cabinet: Cabinet,
  dresser: Dresser,
  plant: Plant,
  sofa: Sofa,
  table: Table,
  lamp: Lamp,
  easel: Easel,
  screen: Screen,
  artwork: Artwork,
  gallery: Gallery,
  spiralStair: SpiralStair,
  stairs: Stairs,
  tree: Tree,
  shrub: Shrub,
  paving: Paving,
  cornerSofa: CornerSofa,
  roundTable: RoundTable,
  tv: Tv,
  officeChair: OfficeChair,
  fridge: Fridge,
  washer: Washer,
  kitchenCounter: KitchenCounter,
  range: Range,
  wallCabinet: WallCabinet,
  dishwasher: Dishwasher,
  microwave: Microwave,
  toilet: Toilet,
  vanity: Vanity,
  bathtub: Bathtub,
  shower: Shower,
};

const noRaycast = () => null;

interface Props {
  furniture: Furniture;
  selected: boolean;
  /** Involved in a layout-check warning. */
  flagged: boolean;
}

/**
 * One piece of furniture. Everything visual is derived from the `furniture`
 * data: position → group position, rotation (degrees) → radians around Y,
 * dimensions → the parametric model.
 */
export const FurnitureItem = memo(function FurnitureItem({ furniture: f, selected, flagged }: Props) {
  const editing = useEditor((s) => s.mode === "edit");
  const t = useT();
  const name = useName();
  const dropTarget = useEditor((s) => s.plantDropTargetId === f.id);
  const gl = useThree((s) => s.gl);
  const [hovered, setHovered] = useState(false);
  const onPointerDown = useFurnitureDrag(f.id);
  const Model = MODELS[f.type];
  const { width: w, height: h, depth: d } = f.dimensions;

  const outline = editing && (selected || hovered || flagged || dropTarget);
  const outlineColor = dropTarget ? "#4f7a4a" : selected ? ACCENT : flagged ? WARN : ACCENT_SOFT;

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
      <FurnitureMaterialProvider colors={f.colors}>
        <Model {...f.dimensions} />
      </FurnitureMaterialProvider>

      {editing && dropTarget && <>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, furnitureSurfaceHeight(f) - f.position[1] + 0.003, 0]} raycast={noRaycast}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial color="#4f7a4a" transparent opacity={0.25} depthWrite={false} />
        </mesh>
        <ScreenLabel position={[f.position[0], furnitureSurfaceHeight(f) + 0.08, f.position[2]]}
          text={t.plants.placeOn(name(f.name))} className="dim-label" />
      </>}

      {outline && (
        <mesh position={[0, h / 2, 0]} raycast={noRaycast}>
          <boxGeometry args={[w + 0.01, h + 0.01, d + 0.01]} />
          <meshBasicMaterial visible={false} />
          <Edges color={outlineColor} lineWidth={selected || flagged ? 1.6 : 1} />
        </mesh>
      )}

      {editing && selected && (
        // A plant's footprint follows its support; other pieces keep the floor reference.
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, (f.type === "plant" ? 0 : -f.position[1]) + 0.004, 0]} raycast={noRaycast}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.14} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
});
