import { useState } from "react";
import { useStore } from "../store/store";
import type { Channel, Labor } from "../domain/types";
import { laborPay } from "../domain/reconcile";
import { formatTaka, parseTakaInput } from "../i18n/format";
import { t } from "../i18n/strings";
import { ScreenHeader, EmptyState, Sheet, ConfirmDelete } from "../components/ui";
import { AmountField, ChannelPicker, PaidToggle, Stepper, TextField } from "../components/inputs";
import { PlusIcon } from "../components/icons";

export function LaborScreen() {
  const { records, bucket, addLabor } = useStore();
  const list = records.labor.filter((l) => l.bucket === bucket);
  const [adding, setAdding] = useState(false);

  const total = list.reduce((s, l) => s + laborPay(l), 0);

  return (
    <div>
      <ScreenHeader title={t.labor} subtitle={formatTaka(total)}
        right={<button className="btn-primary tap" onClick={() => setAdding(true)}><PlusIcon /> {t.add}</button>} />

      {list.length === 0 ? <EmptyState message={t.noLabor} /> : (
        <div className="mx-4 space-y-2">
          {list.map((l) => <LaborRow key={l.id} row={l} />)}
        </div>
      )}

      <LaborSheet open={adding} onClose={() => setAdding(false)} onAdd={(p) => addLabor({ ...p, bucket })} />
    </div>
  );
}

function LaborRow({ row }: { row: Labor }) {
  const { updateLabor, toggleLaborPaid, deleteLabor } = useStore();
  const [rateRaw, setRateRaw] = useState(String(row.ratePerDay));
  const pay = laborPay(row);

  return (
    <div className="card px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium truncate" dir="auto">{row.name}</div>
        <div className="text-right">
          <div className="text-[11px] text-ink-faint uppercase tracking-wide">{t.pay}</div>
          <div className="tnum font-bold text-lg">{formatTaka(pay)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <span className="label">{t.ratePerDay}</span>
          <input className="field tap tnum !py-1.5" inputMode="numeric" value={rateRaw}
            onChange={(e) => setRateRaw(e.target.value)}
            onBlur={() => { const v = parseTakaInput(rateRaw); if (v !== row.ratePerDay) updateLabor(row.id, { ratePerDay: v }); }} />
        </div>
        <div>
          <span className="label">{t.daysWorked}</span>
          <Stepper value={row.daysWorked} onChange={(v) => updateLabor(row.id, { daysWorked: v })} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-paper-line">
        <div className="flex items-center gap-2">
          <PaidToggle paid={row.paid} onToggle={() => toggleLaborPaid(row.id)} />
          <button
            onClick={() => updateLabor(row.id, { channel: row.channel === "cash" ? "online" : "cash" })}
            className={`chip ${row.channel === "cash" ? "bg-household-tint text-cash" : "bg-indigo-50 text-online"}`}
          >{row.channel === "cash" ? t.cash : t.online}</button>
        </div>
        <ConfirmDelete onConfirm={() => deleteLabor(row.id)} />
      </div>
    </div>
  );
}

function LaborSheet({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void; onAdd: (p: Omit<Labor, "id" | "monthId" | "bucket">) => void;
}) {
  const [name, setName] = useState("");
  const [rateRaw, setRateRaw] = useState("");
  const [rate, setRate] = useState(0);
  const [days, setDays] = useState(0);
  const [channel, setChannel] = useState<Channel>("cash");

  function save() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), ratePerDay: rate, daysWorked: days, paid: false, channel });
    setName(""); setRateRaw(""); setRate(0); setDays(0); setChannel("cash");
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={`${t.add} ${t.labor}`}>
      <div className="space-y-4">
        <TextField label={t.name} value={name} onChange={setName} placeholder="Notun Bua, Rubina…" />
        <AmountField label={t.ratePerDay} raw={rateRaw} onChange={(r, v) => { setRateRaw(r); setRate(v); }} />
        <div>
          <span className="label">{t.daysWorked}</span>
          <Stepper value={days} onChange={setDays} />
        </div>
        <ChannelPicker value={channel} onChange={setChannel} />
        <div className="flex items-center justify-between text-sm text-ink-soft">
          <span>{t.pay}</span>
          <span className="tnum font-bold text-ink">{formatTaka(rate * days)}</span>
        </div>
        <button className="btn-primary w-full tap" onClick={save}>{t.save}</button>
      </div>
    </Sheet>
  );
}
