import { useState } from "react";
import { splitFeet } from "../../lib/units";

interface FeetInchesFieldProps {
  /** Centimeters, like NumberField; 0 shows empty boxes. */
  value: number;
  onChange: (cm: number) => void;
  label: string;
  feet: string;
  inches: string;
  feetHint: string;
  inchesHint: string;
}

/**
 * A length typed the way an imperial plan prints it: feet in one box, inches
 * in the other (12 ft 1 in), never converted into a single inch count.
 */
export function FeetInchesField({ value, onChange, label, feet, inches, feetHint, inchesHint }: FeetInchesFieldProps) {
  const [ft, inch] = value > 0 ? splitFeet(value / 100) : [null, null];
  const [draft, setDraft] = useState<{ ft?: string; inch?: string }>({});
  const [invalid, setInvalid] = useState(false);

  const commit = (next: { ft?: string; inch?: string }) => {
    const ftText = (next.ft ?? (ft === null ? "" : String(ft))).trim();
    const inText = (next.inch ?? (inch === null ? "" : String(inch))).trim();
    const f = ftText === "" ? 0 : Number(ftText.replace(",", "."));
    const i = inText === "" ? 0 : Number(inText.replace(",", "."));
    setDraft({});
    if (!Number.isFinite(f) || !Number.isFinite(i) || f < 0 || i < 0 || (ftText === "" && inText === "")) {
      setInvalid(ftText !== "" || inText !== "");
      return;
    }
    setInvalid(false);
    const cm = Math.round((f * 30.48 + i * 2.54) * 10) / 10;
    if (cm > 0 && cm !== value) onChange(cm);
  };

  const box = (key: "ft" | "inch", shown: number | null, unit: string, hint: string) => (
    <div className={`field${invalid ? " field--invalid" : ""}`} title={hint}>
      <input
        className="field__input"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        aria-label={`${label} (${hint})`}
        value={draft[key] ?? (shown === null ? "" : String(shown))}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
          if (e.key === "Escape") { setDraft({}); setInvalid(false); }
        }}
      />
      <span className="field__unit">{unit}</span>
    </div>
  );

  return (
    <div className="feet-inches" role="group" aria-label={label}>
      <span className="feet-inches__label">{label}</span>
      <div className="fields fields--2">
        {box("ft", ft, feet, feetHint)}
        {box("inch", inch, inches, inchesHint)}
      </div>
    </div>
  );
}
