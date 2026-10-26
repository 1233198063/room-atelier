import { furnitureSurfaceHeight, toCm } from "../lib/geometry";
import { plantSurfaceRegion, supportingSurface } from "../lib/plantPlacement";
import { selectActiveRoom, useEditor } from "../store/editorStore";
import type { Furniture } from "../types";

export function PlantPlacementSection({ plant }: { plant: Furniture }) {
  const active = useEditor(selectActiveRoom);
  const place = useEditor((s) => s.placePlantOnSurface);
  const surfaces = active.furniture.filter((f) => plantSurfaceRegion(plant, f, active.room));
  const current = supportingSurface(plant, active.furniture, active.room);
  const value = current?.id ?? (plant.position[1] < 0.005 ? "floor" : "");
  return <section className="section plant-placement">
    <h3 className="section__title">Place on a surface</h3>
    <select aria-label="Plant support surface" value={value}
      onChange={(e) => place(plant.id, e.target.value === "floor" ? null : e.target.value)}>
      <option value="" disabled>Choose a surface…</option>
      <option value="floor">Floor (open spot)</option>
      {surfaces.map((f) => <option key={f.id} value={f.id}>{f.name} · {toCm(furnitureSurfaceHeight(f))} cm</option>)}
    </select>
    <p className="library-hint">Choose a cabinet or shelf to place the pot on top, or drag it onto the highlighted surface. Only surfaces with enough space are listed.</p>
  </section>;
}
