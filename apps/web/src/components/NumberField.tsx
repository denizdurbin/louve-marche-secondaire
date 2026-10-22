import { useId, useState } from 'react';

function parseNumber(raw: string): number {
  return raw.trim() === '' ? Number.NaN : Number(raw.replace(',', '.'));
}

/**
 * Numeric input that keeps what the user types (even when invalid or empty) in local state
 * and only reports valid numbers to the parent. Shows the parent's value again on blur.
 */
export function NumberField(props: {
  label: string;
  value: number;
  isValid: (n: number) => boolean;
  onValidChange: (n: number) => void;
  errorText: string;
  step?: number | 'any';
  min?: number;
  hint?: string;
}) {
  const id = useId();
  const [raw, setRaw] = useState<string | null>(null);
  const parsed = raw === null ? props.value : parseNumber(raw);
  const invalid = raw !== null && !(Number.isFinite(parsed) && props.isValid(parsed));
  const shown = raw !== null && (invalid || parsed === props.value) ? raw : String(props.value);
  return (
    <label htmlFor={id}>
      {props.label}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={props.step ?? 'any'}
        min={props.min}
        value={shown}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-err` : undefined}
        onChange={(e) => {
          const text = e.target.value;
          setRaw(text);
          const n = parseNumber(text);
          if (Number.isFinite(n) && props.isValid(n)) props.onValidChange(n);
        }}
        onBlur={() => setRaw(null)}
      />
      {invalid && (
        <span id={`${id}-err`} className="field-error">
          {props.errorText}
        </span>
      )}
      {!invalid && props.hint && <span className="field-hint">{props.hint}</span>}
    </label>
  );
}
