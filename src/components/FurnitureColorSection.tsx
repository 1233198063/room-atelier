import { RotateCcw } from "lucide-react";
import { useId, useState } from "react";
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
    <input id={id} className="furniture-color-row__swatch" type="color" value={value} aria-label={`${label} color`}
      onChange={(e) => { setDraft(null); setInvalid(false); onChange(e.target.value); }} />
    <label htmlFor={id} className="furniture-color-row__label">{label}</label>
    <span className="furniture-color-row__status">{custom ? "Custom" : "Default"}</span>
    <input className="furniture-color-row__hex" type="text" value={draft ?? value} aria-label={`${label} hex color`}
      aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined} spellCheck={false} maxLength={7}
      onChange={(e) => { setDraft(e.target.value); setInvalid(false); }} onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") { setDraft(null); setInvalid(false); }
      }} />
    {invalid && <span id={`${id}-error`} className="furniture-color-row__error" role="alert">Use six hex digits, e.g. #A98257.</span>}
  </div>;
}

export function FurnitureColorSection({ furniture: f }: { furniture: Furniture }) {
  const palette = useEditor((s) => selectActiveRoom(s).palette);
  const setColors = useEditor((s) => s.setFurnitureColors);
  const reset = useEditor((s) => s.resetFurnitureColors);
  return <section className="section">
    <h3 className="section__title">Colors
      <button className="link-btn" type="button" disabled={!f.colors} onClick={() => reset(f.id)}
        title="Restore this piece's room colors and model defaults"><RotateCcw size={12} /> Use defaults</button>
    </h3>
    <div className="furniture-colors">
      {furnitureColorFields(f).map(({ key, label }) => <ColorRow key={`${f.id}:${key}`} label={label}
        value={furnitureColor(f, palette, key)} custom={f.colors?.[key] !== undefined}
        onChange={(color) => setColors(f.id, { [key]: color }, { coalesceKey: `furniture-color:${f.id}:${key}` })} />)}
    </div>
    <p className="library-hint">Colors apply to this piece only. Custom colors stay when you change the room style.</p>
  </section>;
}
