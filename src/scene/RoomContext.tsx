import { createContext, useContext, useEffect, useLayoutEffect, useMemo, type ReactNode } from "react";
import type { FurnitureColors, ProjectRoom } from "../types";
import type { Placement } from "../lib/rooms";
import { applyFurnitureColors, applyPalette, cloneMaterials, MATERIALS } from "./materials";

const RoomContext = createContext<{ data: ProjectRoom; placement: Placement } | null>(null);
const MaterialContext = createContext(MATERIALS);

export function RoomProvider({ data, placement, children }: { data: ProjectRoom; placement: Placement; children: ReactNode }) {
  const materials = useMemo(cloneMaterials, []);
  useLayoutEffect(() => applyPalette(data.palette, materials), [data.palette, materials]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);
  return <RoomContext.Provider value={{ data, placement }}>
    <MaterialContext.Provider value={materials}>{children}</MaterialContext.Provider>
  </RoomContext.Provider>;
}

/** Only customized pieces allocate a private set. Unchanged pieces share their room's materials. */
export function FurnitureMaterialProvider({ colors, children }: { colors?: FurnitureColors; children: ReactNode }) {
  return colors ? <CustomFurnitureMaterials colors={colors}>{children}</CustomFurnitureMaterials> : children;
}

function CustomFurnitureMaterials({ colors, children }: { colors: FurnitureColors; children: ReactNode }) {
  const { data } = useRoomScene();
  const materials = useMemo(cloneMaterials, []);
  useLayoutEffect(() => applyFurnitureColors(data.palette, colors, materials), [data.palette, colors, materials]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);
  return <MaterialContext.Provider value={materials}>{children}</MaterialContext.Provider>;
}

export function useRoomScene() {
  const value = useContext(RoomContext);
  if (!value) throw new Error("Room scene requires a RoomProvider");
  return value;
}
export const useMaterials = () => useContext(MaterialContext);
