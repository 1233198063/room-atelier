import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useLengthUnit } from "../../i18n";
import { lengthValue, parseFieldInput, UNIT_LABELS } from "../../lib/units";

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
  /** Lengths are passed in centimeters whatever the display unit; angles in degrees. */
  value: number;
  unit: "length" | "°";
  min?: number;
  max?: number;
  /** Arrow-key / scrub increment. Shift multiplies by 10. */
  step?: number;
  onChange: (value: number, meta: ChangeMeta) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}

export { parseFieldInput } from "../../lib/units";

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
  const lengthUnit = useLengthUnit();
  const shown = (v: number) => (unit === "length" ? lengthValue(v / 100, lengthUnit) : format(v));
  // Arrow keys and scrubbing move a whole inch at a time when feet and inches are on show.
  const stepBy = unit === "length" && lengthUnit === "ft" ? step * 2.54 : step;
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Scrub handlers outlive the render that created them, so read callbacks through a ref.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const clampValue = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10) / 10));

  const commit = () => {
    if (draft === null) return;
    const parsed = parseFieldInput(draft, unit, lengthUnit);
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
      const delta = (e.key === "ArrowUp" ? stepBy : -stepBy) * (e.shiftKey ? 10 : 1);
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
      const next = clampValue(startValue + Math.round(px / 4) * stepBy * (ev.shiftKey ? 10 : 1));
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
        value={draft ?? shown(value)}
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
      {!(unit === "length" && lengthUnit === "ft") && <span className="field__unit">{unit === "length" ? UNIT_LABELS[lengthUnit] : unit}</span>}
    </div>
  );
}
