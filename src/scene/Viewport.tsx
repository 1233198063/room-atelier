import { Grid } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { NeutralToneMapping } from "three";
import { useEditor } from "../store/editorStore";
import { CameraRig } from "./CameraRig";
import { FurnitureItem } from "./FurnitureItem";
import { Lights } from "./Lights";
import { applyPalette } from "./materials";
import { RoomDimensions, SelectionMeasurements } from "./Measurements";
import { RoomShell } from "./RoomShell";
import { useFlaggedIds } from "./useFlaggedIds";

function RoomGrid() {
  const room = useEditor((s) => s.room);
  return (
    <Grid
      position={[room.width / 2, 0.002, room.depth / 2]}
      args={[room.width, room.depth]}
      cellSize={0.1}
      cellThickness={0.45}
      cellColor="#d9c7ab"
      sectionSize={1}
      sectionThickness={0.9}
      sectionColor="#ab9373"
      fadeDistance={60}
      fadeStrength={0}
    />
  );
}

/** Keeps the shared materials in step with the palette in the store. */
function PaletteSync() {
  const palette = useEditor((s) => s.palette);
  useLayoutEffect(() => applyPalette(palette), [palette]);
  return null;
}

function Furniture() {
  const furniture = useEditor((s) => s.furniture);
  const selectedId = useEditor((s) => s.selectedId);
  const flagged = useFlaggedIds();
  return (
    <>
      {furniture.map((f) => (
        <FurnitureItem key={f.id} furniture={f} selected={f.id === selectedId} flagged={flagged.has(f.id)} />
      ))}
    </>
  );
}

/**
 * The <Canvas> is where React hands off to Three.js. Everything inside it is a
 * React component that describes 3D objects (meshes, lights, cameras) instead
 * of DOM elements; React Three Fiber turns them into a Three.js scene.
 */
export function Viewport() {
  const editing = useEditor((s) => s.mode === "edit");
  const select = useEditor((s) => s.select);

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, toneMapping: NeutralToneMapping }}
      // Clicking empty space (no furniture under the cursor) clears the selection.
      onPointerMissed={(e) => {
        if (e.button === 0) select(null);
      }}
    >
      <PaletteSync />
      <Lights />
      <CameraRig />
      <RoomShell />
      <Furniture />
      {editing && (
        <>
          <RoomGrid />
          <RoomDimensions />
          <SelectionMeasurements />
        </>
      )}
    </Canvas>
  );
}
