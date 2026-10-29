import { useLength, useName, useT } from "../i18n";
import { furnitureSurfaceHeight } from "../lib/geometry";
import { plantSurfaceRegion, supportingSurface } from "../lib/plantPlacement";
import { selectActiveRoom, useEditor } from "../store/editorStore";
import type { Furniture } from "../types";

export function PlantPlacementSection({ plant }: { plant: Furniture }) {
  const active = useEditor(selectActiveRoom);
  const place = useEditor((s) => s.placePlantOnSurface);
  const t = useT().plants;
  const name = useName();
  const len = useLength();
  const surfaces = active.furniture.filter((f) => plantSurfaceRegion(plant, f, active.room));
  const current = supportingSurface(plant, active.furniture, active.room);
  const value = current?.id ?? (plant.position[1] < 0.005 ? "floor" : "");
  return <section className="section plant-placement">
    <h3 className="section__title">{t.title}</h3>
    <select aria-label={t.aria} value={value}
      onChange={(e) => place(plant.id, e.target.value === "floor" ? null : e.target.value)}>
      <option value="" disabled>{t.choose}</option>
      <option value="floor">{t.floor}</option>
      {surfaces.map((f) => <option key={f.id} value={f.id}>{name(f.name)} · {len.format(furnitureSurfaceHeight(f))}</option>)}
    </select>
    <p className="library-hint">{t.hint}</p>
  </section>;
}
