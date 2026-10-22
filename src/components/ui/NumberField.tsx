import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface ChangeMeta {
  /** Part of a continuous gesture (label scrubbing) — don't record undo history yet. */
  transient: boolean;
  /** Small repeated step (arrow keys) — merge consecutive steps into one undo entry. */
  coalesce: boolean;
}

interface NumberFieldProps {
  label: string;
  /** Full name for screen readers and the tooltip. */
  title: string;
  value: number;
  unit: "cm" | "°";
  min?: number;
  max?: number;
  /** Arrow-key / scrub increment. Shift multiplies by 10. */
  step?: number;
  onChange: (value: number, meta: ChangeMeta) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}

const UNIT_TO_CM: Record<string, number> = { mm: 0.1, cm: 1, m: 100 };

/**
 * Parse what the user typed. Accepts unit suffixes and simple sums, like a CAD
 * command line: "120", "1.2m", "450mm", "120+35", "2m-15cm", "90°".
 */
export function parseFieldInput(text: string, unit: "cm" | "°"): number | null {
  const cleaned = text.trim().toLowerCase().replace(/,/g, ".").replace(/\s+/g, "");
  if (!cleaned) return null;
  const terms = cleaned.match(/[+-]?[^+-]+/g);
  if (!terms || terms.join("") !== cleaned) return null;
  let total = 0;
  for (const term of terms) {
    const m = term.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(mm|cm|m|°|deg)?$/);
    if (!m) return null;
    const n = parseFloat(m[1]);
    const suffix = m[2];
    if (unit === "cm") {
      if (suffix === "°" || suffix === "deg") return null;
      total += n * (suffix ? UNIT_TO_CM[suffix] : 1);
    } else {
      if (suffix && suffix !== "°" && suffix !== "deg") return null;
      total += n;
    }
  }
  return Number.isFinite(total) ? total : null;
}

const format = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/**
 * A precise numeric input:
 *  - type a value (with units or arithmetic) and press Enter / Tab to commit; Esc reverts
 *  - ↑ / ↓ step by `step` (Shift: ×10)
 *  - drag the label left/right to scrub the value, like Figma or Blender
 */
export function NumberField({
  label,
  title,
  value,
  unit,
  min = -Infinity,
  max = Infinity,
  step = 1,
  onChange,
  onScrubStart,
  onScrubEnd,
}: NumberFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Scrub handlers outlive the render that created them, so read callbacks through a ref.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const clampValue = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10) / 10));

  const commit = () => {
    if (draft === null) return;
    const parsed = parseFieldInput(draft, unit);
    if (parsed === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft(null);
    const next = clampValue(parsed);
    if (next !== value) onChange(next, { transient: false, coalesce: false });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commit();
      inputRef.current?.select();
    } else if (e.key === "Escape") {
      setDraft(null);
      setInvalid(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const delta = (e.key === "ArrowUp" ? step : -step) * (e.shiftKey ? 10 : 1);
      const next = clampValue(value + delta);
      setDraft(null);
      setInvalid(false);
      if (next !== value) onChange(next, { transient: false, coalesce: true });
      requestAnimationFrame(() => inputRef.current?.select());
    }
  };

  const onLabelPointerDown = (e: PointerEvent<HTMLLabelElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startValue = value;
    let started = false;

    const move = (ev: globalThis.PointerEvent) => {
      const px = ev.clientX - startX;
      if (!started) {
        if (Math.abs(px) < 3) return;
        started = true;
        onScrubStart?.();
        document.body.classList.add("is-scrubbing");
      }
      const next = clampValue(startValue + Math.round(px / 4) * step * (ev.shiftKey ? 10 : 1));
      onChangeRef.current(next, { transient: true, coalesce: false });
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      document.body.classList.remove("is-scrubbing");
      if (started) onScrubEnd?.();
      else inputRef.current?.focus(); // a plain click on the label focuses the input
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  return (
    <div className={`field${invalid ? " field--invalid" : ""}`} title={title}>
      <label htmlFor={id} className="field__label" onPointerDown={onLabelPointerDown}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        className="field__input"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        aria-label={title}
        aria-invalid={invalid}
        value={draft ?? format(value)}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          setDraft(e.target.value);
          setInvalid(false);
        }}
        onBlur={() => {
          commit();
          setDraft(null);
          setInvalid(false);
        }}
        onKeyDown={onKeyDown}
      />
      <span className="field__unit">{unit}</span>
    </div>
  );
}
