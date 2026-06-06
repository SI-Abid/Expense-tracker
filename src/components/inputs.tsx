import type { Channel } from "../domain/types";
import { parseTakaInput } from "../domain/money";
import { t } from "../i18n/strings";

// Form inputs. Amount fields accept Bengali or English numerals and normalize
// to integer Taka on change.

export function TextField({ label, value, onChange, placeholder, dir }: {
  label?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; dir?: "ltr" | "auto";
}) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <input
        className="field tap"
        value={value}
        dir={dir ?? "auto"}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/**
 * Amount input. Keeps the raw text the user typed (so Bengali digits show as
 * typed) while reporting the normalized integer value upward.
 */
export function AmountField({ label, raw, onChange, placeholder }: {
  label?: string; raw: string; onChange: (raw: string, value: number) => void; placeholder?: string;
}) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <input
        className="field tap tnum"
        inputMode="numeric"
        value={raw}
        placeholder={placeholder ?? "0"}
        onChange={(e) => onChange(e.target.value, parseTakaInput(e.target.value))}
      />
    </label>
  );
}

export function ChannelPicker({ value, onChange }: {
  value: Channel; onChange: (c: Channel) => void;
}) {
  const opt = (c: Channel, label: string, color: string) => (
    <button
      type="button"
      onClick={() => onChange(c)}
      className={`flex-1 tap rounded-xl px-3 py-2.5 text-sm font-semibold border transition ${
        value === c
          ? `text-white border-transparent ${color}`
          : "bg-white text-ink-soft border-paper-line"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div>
      <span className="label">{t.channel}</span>
      <div className="flex gap-2">
        {opt("cash", t.cash, "bg-cash")}
        {opt("online", t.online, "bg-online")}
      </div>
    </div>
  );
}

export function Stepper({ value, onChange, min = 0 }: {
  value: number; onChange: (v: number) => void; min?: number;
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-paper-line overflow-hidden">
      <button
        type="button"
        className="tap px-4 text-lg font-bold text-ink-soft hover:bg-paper-line/50"
        onClick={() => onChange(Math.max(min, value - 1))}
      >−</button>
      <span className="w-12 text-center font-semibold tnum">{value}</span>
      <button
        type="button"
        className="tap px-4 text-lg font-bold text-ink-soft hover:bg-paper-line/50"
        onClick={() => onChange(value + 1)}
      >+</button>
    </div>
  );
}

export function PaidToggle({ paid, onToggle }: { paid: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`chip tap !px-3 ${paid ? "bg-ok/15 text-ok" : "bg-paper-line text-ink-soft"}`}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${paid ? "bg-ok" : "bg-ink-faint"}`} />
      {paid ? t.paid : t.unpaid}
    </button>
  );
}
