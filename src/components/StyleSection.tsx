import { Check, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useLang, useLengthUnit, useT } from "../i18n";
import { PALETTE_COLORS, PALETTE_PRESETS, suggestPalettes } from "../lib/palettes";
import { selectActiveRoom, useEditor } from "../store/editorStore";

/**
 * Color scheme: curated presets (with suggestions for this particular room)
 * plus a picker per color for fine-tuning. Everything is undoable and saved
 * with the layout, like any other edit.
 */
export function StyleSection() {
  const palette = useEditor((s) => selectActiveRoom(s).palette);
  const room = useEditor((s) => selectActiveRoom(s).room);
  const openings = useEditor((s) => selectActiveRoom(s).openings);
  const applyPalette = useEditor((s) => s.applyPalette);
  const setColors = useEditor((s) => s.setPaletteColors);
  const lang = useLang();
  const unit = useLengthUnit();
  const t = useT().style;

  const suggestions = useMemo(() => suggestPalettes(room, openings, lang, unit), [room, openings, lang, unit]);
  const active = PALETTE_PRESETS.some((p) => p.palette.id === palette.id) ? t.presets[palette.id] : undefined;
  const why = suggestions.values().next().value;

  return (
    <section className="section">
      <h3 className="section__title">{t.title}</h3>

      <div className="palettes" role="radiogroup" aria-label={t.scheme}>
        {PALETTE_PRESETS.map(({ palette: p }) => {
          const selected = p.id === palette.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`palette-card${selected ? " is-active" : ""}`}
              onClick={() => applyPalette(p.id)}
            >
              <span className="palette-card__strip" aria-hidden>
                {[p.wall, p.floor, p.wood, p.woodDark, p.accent].map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </span>
              <span className="palette-card__name">
                {selected && <Check size={12} strokeWidth={2.4} />}
                {t.presets[p.id].label}
              </span>
              {suggestions.has(p.id) && <span className="palette-card__badge">{t.suggested}</span>}
            </button>
          );
        })}
      </div>

      <p className="palette-note">
        {active ? active.description : t.custom}
      </p>
      {why && (
        <p className="palette-why">
          <Sparkles size={13} strokeWidth={1.9} />
          <span>{why}</span>
        </p>
      )}

      <div className="colors">
        {PALETTE_COLORS.map((key) => (
          <label key={key} className="color-field" title={t.colors[key].hint}>
            <input
              type="color"
              value={palette[key]}
              // The picker fires continuously while you drag; coalescing makes it one undo step.
              onChange={(e) => setColors({ [key]: e.target.value }, { coalesceKey: `palette:${key}` })}
            />
            <span className="color-field__label">{t.colors[key].label}</span>
            <span className="color-field__hex">{palette[key]}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
