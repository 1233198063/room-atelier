import { Plus } from "lucide-react";
import { CATALOG, FURNITURE_TYPES } from "../lib/catalog";
import { toCm } from "../lib/geometry";
import { OPENING_CATALOG, OPENING_TYPES } from "../lib/openings";
import { useEditor } from "../store/editorStore";
import type { Wall } from "../types";
import { FurnitureIcon, type ItemType } from "./ui/FurnitureIcon";

const WALL_LABEL: Record<Wall, string> = { back: "Back", front: "Front", left: "Left", right: "Right" };

interface CardProps {
  type: ItemType;
  label: string;
  size: string;
  onAdd: () => void;
}

function LibraryCard({ type, label, size, onAdd }: CardProps) {
  return (
    <button type="button" className="library-card" onClick={onAdd} title={`Add ${label.toLowerCase()} to the room`}>
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

export function FurnitureLibrary() {
  const addFurniture = useEditor((s) => s.addFurniture);
  const addOpening = useEditor((s) => s.addOpening);
  const furniture = useEditor((s) => s.furniture);
  const openings = useEditor((s) => s.openings);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);

  const items = [
    ...furniture.map((f) => ({
      id: f.id,
      type: f.type as ItemType,
      name: f.name,
      meta: `${toCm(f.dimensions.width)}×${toCm(f.dimensions.depth)}`,
    })),
    ...openings.map((o) => ({
      id: o.id,
      type: o.type as ItemType,
      name: o.name,
      meta: `${WALL_LABEL[o.wall]} · ${toCm(o.width)}`,
    })),
  ];

  return (
    <aside className="panel panel--left" aria-label="Furniture library">
      <div className="panel__inner">
        <section className="section">
          <h2 className="section__title">Furniture</h2>
          <div className="library">
            {FURNITURE_TYPES.map((type) => {
              const { label, defaults } = CATALOG[type];
              return (
                <LibraryCard
                  key={type}
                  type={type}
                  label={label}
                  size={`${toCm(defaults.width)} × ${toCm(defaults.depth)}`}
                  onAdd={() => addFurniture(type)}
                />
              );
            })}
          </div>
        </section>

        <section className="section">
          <h2 className="section__title">Doors &amp; windows</h2>
          <div className="library">
            {OPENING_TYPES.map((type) => {
              const { label, defaults } = OPENING_CATALOG[type];
              return (
                <LibraryCard
                  key={type}
                  type={type}
                  label={label}
                  size={`${toCm(defaults.width)} × ${toCm(defaults.height)}`}
                  onAdd={() => addOpening(type)}
                />
              );
            })}
          </div>
        </section>

        <section className="section">
          <h2 className="section__title">
            In this room <span className="count">{items.length}</span>
          </h2>
          {items.length === 0 ? (
            <p className="empty">The room is empty. Pick something from the library above to place it.</p>
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
