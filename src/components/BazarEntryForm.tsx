import { useEffect, useMemo, useState } from "react";
import { parseBazarText } from "../domain/parser";
import { parseTakaInput, formatTaka } from "../domain/money";
import type { BazarMode, Channel, LineItem } from "../domain/types";
import { useStore } from "../store/store";
import { todayISO } from "../i18n/format";
import { t } from "../i18n/strings";
import { ChannelPicker } from "./inputs";
import { TrashIcon } from "./icons";

// Editable parsed item (amount may be null = needs fixing).
interface EditItem { name: string; amount: number | null; rawAmount: string }

function draftKey(monthId: string, mode: BazarMode, bucket: string) {
  return `songsar:bazar-draft:${monthId}:${bucket}:${mode}`;
}

export function BazarEntryForm({ mode, onSaved }: { mode: BazarMode; onSaved?: () => void }) {
  const { monthId, bucket, addBazar } = useStore();
  const key = draftKey(monthId, mode, bucket);

  const [text, setText] = useState("");
  const [items, setItems] = useState<EditItem[]>([]);
  const [channel, setChannel] = useState<Channel>("cash");
  const [date, setDate] = useState(todayISO());
  const [parsed, setParsed] = useState(false);

  // Restore an autosaved draft on mount so a reload never loses a trip.
  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      setText(d.text ?? "");
      setItems(d.items ?? []);
      setChannel(d.channel ?? "cash");
      setDate(d.date ?? todayISO());
      setParsed((d.items ?? []).length > 0);
    } catch { /* ignore corrupt draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Autosave the in-progress draft.
  useEffect(() => {
    const hasContent = text.trim() || items.length > 0;
    if (hasContent) {
      localStorage.setItem(key, JSON.stringify({ text, items, channel, date }));
    } else {
      localStorage.removeItem(key);
    }
  }, [key, text, items, channel, date]);

  const total = useMemo(
    () => items.reduce((s, i) => s + (i.amount ?? 0), 0),
    [items],
  );
  const hasUnparsed = items.some((i) => i.amount == null);

  function doParse() {
    const r = parseBazarText(text);
    setItems(
      r.items.map((i) => ({
        name: i.name || i.raw,
        amount: i.amount,
        rawAmount: i.amount == null ? "" : String(i.amount),
      })),
    );
    setParsed(true);
  }

  function updateItem(idx: number, patch: Partial<EditItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function addBlankItem() {
    setItems((prev) => [...prev, { name: "", amount: 0, rawAmount: "0" }]);
  }

  async function save() {
    const lineItems: LineItem[] = items
      .filter((i) => i.name.trim() || (i.amount ?? 0) > 0)
      .map((i) => ({ name: i.name.trim(), amount: i.amount ?? 0 }));
    if (lineItems.length === 0) return;
    await addBazar({ mode, date, channel, lineItems });
    localStorage.removeItem(key);
    setText(""); setItems([]); setParsed(false); setDate(todayISO());
    onSaved?.();
  }

  return (
    <div className="space-y-4">
      <div>
        <span className="label">{mode === "daily_kacha" ? t.dailyKacha : t.monthlyShukna}</span>
        <textarea
          className="field tap min-h-[88px] leading-relaxed"
          dir="auto"
          placeholder={t.bazarEntryHint}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="text-xs text-ink-faint mt-1">{t.parseHint}</p>
      </div>

      <button className="btn-primary w-full tap" onClick={doParse} disabled={!text.trim()}>
        Parse items
      </button>

      {parsed && (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${
                it.amount == null ? "border-amber-400 bg-amber-50" : "border-paper-line bg-white"
              }`}
            >
              <input
                className="flex-1 bg-transparent outline-none text-base px-1"
                dir="auto"
                value={it.name}
                placeholder={t.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
              />
              <input
                className="w-24 bg-transparent outline-none text-right tnum px-1"
                inputMode="numeric"
                value={it.rawAmount}
                placeholder={it.amount == null ? t.fixThisItem : "0"}
                onChange={(e) => updateItem(idx, { rawAmount: e.target.value, amount: e.target.value.trim() ? parseTakaInput(e.target.value) : null })}
              />
              <button className="text-ink-faint hover:text-danger p-1" onClick={() => removeItem(idx)} aria-label="Remove">
                <TrashIcon width={16} height={16} />
              </button>
            </div>
          ))}

          <button className="btn-ghost w-full tap text-sm" onClick={addBlankItem}>+ add line</button>

          {hasUnparsed && (
            <p className="text-xs text-amber-700">Highlighted items {t.fixThisItem} — fill it in or remove.</p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-ink-soft">{t.total} · {items.length} {t.lineItems}</span>
            <span className="text-lg font-bold tnum">{formatTaka(total)}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">{t.date}</span>
          <input type="date" className="field tap" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <ChannelPicker value={channel} onChange={setChannel} />
      </div>

      <button className="btn-primary w-full tap" onClick={save} disabled={items.length === 0}>
        {t.save}
      </button>
    </div>
  );
}
