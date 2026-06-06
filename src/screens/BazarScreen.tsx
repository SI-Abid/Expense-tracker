import { useState } from "react";
import { useStore } from "../store/store";
import type { BazarEntry, BazarMode, LineItem } from "../domain/types";
import { sumLineItems } from "../domain/parser";
import { formatTaka, formatShortDate, parseTakaInput } from "../i18n/format";
import { t } from "../i18n/strings";
import { ScreenHeader, EmptyState, Sheet, ConfirmDelete } from "../components/ui";
import { BazarEntryForm } from "../components/BazarEntryForm";
import { ChevronDown, PlusIcon, TrashIcon } from "../components/icons";

export function BazarScreen() {
  const { records, bucket } = useStore();
  const [mode, setMode] = useState<BazarMode>("daily_kacha");
  const [adding, setAdding] = useState(false);

  const list = records.bazar
    .filter((b) => b.bucket === bucket && b.mode === mode)
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = list.reduce((s, b) => s + b.total, 0);

  return (
    <div>
      <ScreenHeader title="Bazar" subtitle={`${formatTaka(total)} · ${list.length} ${t.lineItems}`}
        right={<button className="btn-primary tap" onClick={() => setAdding(true)}><PlusIcon /> {t.addTrip}</button>} />

      <div className="mx-4 mb-3 inline-flex rounded-xl bg-paper-line/60 p-0.5 text-sm font-semibold w-full">
        {(["daily_kacha", "monthly_shukna"] as BazarMode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 rounded-lg px-3 py-2 transition ${mode === m ? "bg-white text-ink shadow-sm" : "text-ink-soft"}`}>
            {m === "daily_kacha" ? t.dailyKacha : t.monthlyShukna}
          </button>
        ))}
      </div>

      {list.length === 0 ? <EmptyState message={t.noBazar} /> : (
        <div className="mx-4 space-y-2">
          {list.map((b) => <TripCard key={b.id} entry={b} />)}
        </div>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title={t.newTrip}>
        <BazarEntryForm mode={mode} onSaved={() => setAdding(false)} />
      </Sheet>
    </div>
  );
}

function TripCard({ entry }: { entry: BazarEntry }) {
  const { updateBazar, deleteBazar } = useStore();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [items, setItems] = useState<LineItem[]>(entry.lineItems);

  const liveTotal = edit ? sumLineItems(items) : entry.total;

  function setLine(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function saveEdit() {
    updateBazar(entry.id, { lineItems: items.filter((i) => i.name.trim() || i.amount > 0) });
    setEdit(false);
  }

  return (
    <div className="card overflow-hidden">
      <button className="w-full flex items-center justify-between px-4 py-3 tap" onClick={() => setOpen(!open)}>
        <div className="text-left">
          <div className="font-semibold">{formatShortDate(entry.date)}</div>
          <span className={`chip mt-0.5 ${entry.channel === "cash" ? "bg-household-tint text-cash" : "bg-indigo-50 text-online"}`}>
            {entry.channel === "cash" ? t.cash : t.online} · {entry.lineItems.length} {t.lineItems}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="tnum font-bold text-lg">{formatTaka(liveTotal)}</span>
          <ChevronDown className={`text-ink-faint transition ${open ? "rotate-180" : ""}`} width={18} height={18} />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3 border-t border-paper-line pt-2 space-y-1.5">
          {(edit ? items : entry.lineItems).map((li, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 text-sm">
              {edit ? (
                <>
                  <input className="flex-1 field !py-1.5" dir="auto" value={li.name} onChange={(e) => setLine(idx, { name: e.target.value })} />
                  <input className="w-20 field !py-1.5 text-right tnum" inputMode="numeric" value={String(li.amount)}
                    onChange={(e) => setLine(idx, { amount: parseTakaInput(e.target.value) })} />
                  <button className="text-ink-faint hover:text-danger p-1" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                    <TrashIcon width={15} height={15} />
                  </button>
                </>
              ) : (
                <>
                  <span dir="auto" className="text-ink-soft">{li.name || <span className="text-ink-faint italic">unnamed</span>}</span>
                  <span className="tnum">{formatTaka(li.amount)}</span>
                </>
              )}
            </div>
          ))}

          {edit && (
            <button className="btn-ghost w-full tap text-sm" onClick={() => setItems((p) => [...p, { name: "", amount: 0 }])}>+ add line</button>
          )}

          <div className="flex items-center justify-between pt-2 mt-1 border-t border-paper-line">
            {edit ? (
              <div className="flex gap-2 w-full">
                <button className="btn-primary flex-1 tap" onClick={saveEdit}>{t.save}</button>
                <button className="btn-ghost tap" onClick={() => { setItems(entry.lineItems); setEdit(false); }}>{t.cancel}</button>
              </div>
            ) : (
              <>
                <button className="btn-ghost tap text-sm" onClick={() => setEdit(true)}>{t.edit}</button>
                <ConfirmDelete onConfirm={() => deleteBazar(entry.id)} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
