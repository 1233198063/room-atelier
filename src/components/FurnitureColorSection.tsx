import { RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { useT } from "../i18n";
import { furnitureColor, furnitureColorFields } from "../lib/furnitureColors";
import { isHexColor } from "../lib/palettes";
import { selectActiveRoom, useEditor } from "../store/editorStore";
import type { Furniture } from "../types";

function ColorRow({ label, value, custom, onChange }: {
  label: string; value: string; custom: boolean; onChange: (color: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const t = useT().colors;
  const commit = () => {
    if (draft === null) return;
    const text = draft.trim();
    const color = text.startsWith("#") ? text : `#${text}`;
    if (!isHexColor(color)) { setInvalid(true); return; }
    onChange(color.toLowerCase());
    setDraft(null);
    setInvalid(false);
  };
  return <div className={`furniture-color-row${custom ? " is-custom" : ""}`}>
    <input id={id} className="furniture-color-row__swatch" type="color" value={value} aria-label={t.colorAria(label)}
      onChange={(e) => { setDraft(null); setInvalid(false); onChange(e.target.value); }} />
    <label htmlFor={id} className="furniture-color-row__label">{label}</label>
    <span className="furniture-color-row__status">{custom ? t.custom : t.default}</span>
    <input className="furniture-color-row__hex" type="text" value={draft ?? value} aria-label={t.hexAria(label)}
      aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined} spellCheck={false} maxLength={7}
      onChange={(e) => { setDraft(e.target.value); setInvalid(false); }} onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") { setDraft(null); setInvalid(false); }
      }} />
    {invalid && <span id={`${id}-error`} className="furniture-color-row__error" role="alert">{t.hexError}</span>}
  </div>;
}

export function FurnitureColorSection({ furniture: f }: { furniture: Furniture }) {
  const palette = useEditor((s) => selectActiveRoom(s).palette);
  const setColors = useEditor((s) => s.setFurnitureColors);
  const reset = useEditor((s) => s.resetFurnitureColors);
  const t = useT().colors;
  const fields = furnitureColorFields(f);
  if (fields.length === 0) return null;
  return <section className="section">
    <h3 className="section__title">{t.title}
      <button className="link-btn" type="button" disabled={!f.colors} onClick={() => reset(f.id)}
        title={t.useDefaultsHint}><RotateCcw size={12} /> {t.useDefaults}</button>
    </h3>
    <div className="furniture-colors">
      {fields.map(({ key, part }) => <ColorRow key={`${f.id}:${key}`} label={t.parts[part]}
        value={furnitureColor(f, palette, key)} custom={f.colors?.[key] !== undefined}
        onChange={(color) => setColors(f.id, { [key]: color }, { coalesceKey: `furniture-color:${f.id}:${key}` })} />)}
    </div>
    <p className="library-hint">{t.hint}</p>
  </section>;
}
