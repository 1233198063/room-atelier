import { Plus } from "lucide-react";
import { useState } from "react";
import { useLength, useName, useT } from "../i18n";
import { CATALOG, LIBRARY, type LibraryCategory, type LibraryPreset } from "../lib/catalog";
import { lengthValue, type LengthUnit } from "../lib/units";
import { OPENING_CATALOG, OPENING_TYPES } from "../lib/openings";
import { selectActiveRoom, useEditor } from "../store/editorStore";
import type { Dimensions, FurnitureType } from "../types";
import { FurnitureIcon, type ItemType } from "./ui/FurnitureIcon";
import { ProductImport } from "./ProductImport";
import { RoomManager } from "./RoomManager";

interface CardProps {
  type: ItemType;
  label: string;
  size: string;
  onAdd: () => void;
}

function LibraryCard({ type, label, size, onAdd }: CardProps) {
  const t = useT();
  return (
    <button type="button" className="library-card" onClick={onAdd} title={t.library.addTitle(label)}>
      <span className="library-card__add" aria-hidden>
        <Plus size={13} strokeWidth={2.2} />
      </span>
      <span className="library-card__art">
        <FurnitureIcon type={type} size={44} />
      </span>
      <span className="library-card__name">{label}</span>
      <span className="library-card__size">{size}</span>
    </button>
  );
}

/** Plants and wall-hung pieces read by their height; everything else by its footprint. */
export function cardSize(type: FurnitureType, { width, depth, height }: Dimensions, unit: LengthUnit): string {
  const upright = type === "plant" || depth <= 0.1;
  return `${lengthValue(width, unit, true)} × ${lengthValue(upright ? height : depth, unit, true)}`;
}

type Filter = LibraryCategory | "all" | "openings";
const FILTERS: Filter[] = ["all", ...LIBRARY.map((c) => c.id), "openings"];

export function FurnitureLibrary() {
  const addFurniture = useEditor((s) => s.addFurniture);
  const addOpening = useEditor((s) => s.addOpening);
  const furniture = useEditor((s) => selectActiveRoom(s).furniture);
  const openings = useEditor((s) => selectActiveRoom(s).openings);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const t = useT();
  const name = useName();
  const len = useLength();
  const [filter, setFilter] = useState<Filter>("all");

  const presetLabel = (p: LibraryPreset) => t.presets[p.id] ?? t.furniture[p.type].label;
  const filterLabel = (f: Filter) => f === "all" ? t.library.all : f === "openings" ? t.library.openings : t.library.categories[f];

  const items = [
    ...furniture.map((f) => ({
      id: f.id,
      type: f.type as ItemType,
      name: name(f.name),
      meta: `${len.short(f.dimensions.width)}×${len.short(f.dimensions.depth)}`,
    })),
    ...openings.map((o) => ({
      id: o.id,
      type: o.type as ItemType,
      name: name(o.name),
      meta: `${t.walls[o.wall]} · ${len.short(o.width)}`,
    })),
  ];

  return (
    <aside className="panel panel--left" aria-label={t.library.label}>
      <div className="panel__inner">
        <RoomManager />
        <ProductImport />

        <section className="section library-filter">
          <div className="filter-chips" role="radiogroup" aria-label={t.library.filter}>
            {FILTERS.map((f) => (
              <button key={f} type="button" role="radio" aria-checked={filter === f}
                className={`filter-chip${filter === f ? " is-active" : ""}`} onClick={() => setFilter(f)}>
                {filterLabel(f)}
              </button>
            ))}
          </div>
        </section>

        {LIBRARY.filter((c) => filter === "all" || filter === c.id).map(({ id, presets }) => (
          <section className="section" key={id}>
            <h2 className="section__title">{t.library.categories[id]}</h2>
            <div className="library">
              {presets.map((p) => {
                const label = presetLabel(p);
                return (
                  <LibraryCard
                    key={p.id}
                    type={p.type}
                    label={label}
                    size={cardSize(p.type, p.dimensions ?? CATALOG[p.type].defaults, len.unit)}
                    onAdd={() => addFurniture(p.type, { name: label, dimensions: p.dimensions, elevation: p.elevation })}
                  />
                );
              })}
            </div>
            {id === "plants" && <p className="library-hint">{t.library.plantHint}</p>}
          </section>
        ))}

        {(filter === "all" || filter === "openings") && (
          <section className="section">
            <h2 className="section__title">{t.library.openings}</h2>
            <div className="library">
              {OPENING_TYPES.map((type) => {
                const { defaults } = OPENING_CATALOG[type];
                return (
                  <LibraryCard
                    key={type}
                    type={type}
                    label={t.openings[type].label}
                    size={`${len.short(defaults.width)} × ${len.short(defaults.height)}`}
                    onAdd={() => addOpening(type)}
                  />
                );
              })}
            </div>
          </section>
        )}

        <section className="section">
          <h2 className="section__title">
            {t.library.inRoom} <span className="count">{items.length}</span>
          </h2>
          {items.length === 0 ? (
            <p className="empty">{t.library.empty}</p>
          ) : (
            <ul className="outliner">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`outliner__item${item.id === selectedId ? " is-selected" : ""}`}
                    onClick={() => select(item.id)}
                  >
                    <FurnitureIcon type={item.type} size={22} />
                    <span className="outliner__name">{item.name}</span>
                    <span className="outliner__meta">{item.meta}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
