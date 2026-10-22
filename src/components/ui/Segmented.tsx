import type { LucideIcon } from "lucide-react";

interface Option<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
  hint?: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map(({ value: v, label: text, icon: Icon, hint }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          className={`segmented__item${v === value ? " is-active" : ""}`}
          title={hint}
          onClick={() => onChange(v)}
        >
          <Icon size={15} strokeWidth={1.8} />
          <span className="segmented__text">{text}</span>
        </button>
      ))}
    </div>
  );
}
