import { useState } from "react";
import { useStore } from "../store/store";
import type { Channel, Extra } from "../domain/types";
import { formatTaka, formatShortDate, todayISO } from "../i18n/format";
import { t } from "../i18n/strings";
import { ScreenHeader, EmptyState, Sheet, ConfirmDelete } from "../components/ui";
import { AmountField, ChannelPicker, TextField } from "../components/inputs";
import { PlusIcon } from "../components/icons";

export function ExtrasScreen() {
  const { records, bucket, addExtra, deleteExtra } = useStore();
  const list = records.extras
    .filter((e) => e.bucket === bucket)
    .sort((a, b) => b.date.localeCompare(a.date));
  const [adding, setAdding] = useState(false);
  const total = list.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <ScreenHeader title={t.extras} subtitle={formatTaka(total)}
        right={<button className="btn-primary tap" onClick={() => setAdding(true)}><PlusIcon /> {t.add}</button>} />

      {list.length === 0 ? <EmptyState message={t.noExtras} /> : (
        <div className="card mx-4 divide-y divide-paper-line overflow-hidden">
          {list.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <div className="font-medium truncate" dir="auto">{e.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-ink-faint">{formatShortDate(e.date)}</span>
                  <span className={`chip ${e.channel === "cash" ? "bg-household-tint text-cash" : "bg-indigo-50 text-online"}`}>{e.channel === "cash" ? t.cash : t.online}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="tnum font-semibold">{formatTaka(e.amount)}</span>
                <ConfirmDelete onConfirm={() => deleteExtra(e.id)} label="✕" />
              </div>
            </div>
          ))}
        </div>
      )}

      <ExtraSheet open={adding} onClose={() => setAdding(false)} onAdd={(p) => addExtra({ ...p, bucket })} />
    </div>
  );
}

function ExtraSheet({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void; onAdd: (p: Omit<Extra, "id" | "monthId" | "bucket">) => void;
}) {
  const [name, setName] = useState("");
  const [raw, setRaw] = useState("");
  const [amount, setAmount] = useState(0);
  const [channel, setChannel] = useState<Channel>("cash");
  const [date, setDate] = useState(todayISO());

  function save() {
    if (!name.trim() && amount <= 0) return;
    onAdd({ name: name.trim() || "Extra", amount, channel, date });
    setName(""); setRaw(""); setAmount(0); setChannel("cash"); setDate(todayISO());
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={`${t.add} ${t.extras}`}>
      <div className="space-y-4">
        <TextField label={t.name} value={name} onChange={setName} placeholder="Oven repair…" />
        <AmountField label={t.amount} raw={raw} onChange={(r, v) => { setRaw(r); setAmount(v); }} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">{t.date}</span>
            <input type="date" className="field tap" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <ChannelPicker value={channel} onChange={setChannel} />
        </div>
        <button className="btn-primary w-full tap" onClick={save}>{t.save}</button>
      </div>
    </Sheet>
  );
}
