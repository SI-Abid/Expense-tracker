import { useState } from "react";
import { useStore } from "../store/store";
import type { Channel, FixedExpense, FixedKind } from "../domain/types";
import { formatTaka, parseTakaInput } from "../i18n/format";
import { t } from "../i18n/strings";
import { ScreenHeader, EmptyState, Sheet, ConfirmDelete } from "../components/ui";
import { AmountField, ChannelPicker, PaidToggle, TextField } from "../components/inputs";
import { PlusIcon } from "../components/icons";

export function FixedScreen() {
  const { records, bucket, addFixed } = useStore();
  const list = records.fixed.filter((f) => f.bucket === bucket);
  const [adding, setAdding] = useState(false);

  const total = list.reduce((s, f) => s + f.amount, 0);
  const paid = list.filter((f) => f.paid).reduce((s, f) => s + f.amount, 0);

  return (
    <div>
      <ScreenHeader title={t.fixed}
        subtitle={`${formatTaka(paid)} ${t.paidOfTotal} ${formatTaka(total)}`}
        right={<button className="btn-primary tap" onClick={() => setAdding(true)}><PlusIcon /> {t.add}</button>} />

      {list.length === 0 ? <EmptyState message={t.noFixed} /> : (
        <div className="mx-4 space-y-2">
          {list.map((f) => <FixedRow key={f.id} row={f} />)}
        </div>
      )}

      <FixedSheet open={adding} onClose={() => setAdding(false)} onAdd={(p) => addFixed({ ...p, bucket })} />
    </div>
  );
}

function FixedRow({ row }: { row: FixedExpense }) {
  const { updateFixed, toggleFixedPaid, deleteFixed } = useStore();
  const [raw, setRaw] = useState(String(row.amount));
  const isVar = row.kind === "variable";

  function commitAmount() {
    const v = parseTakaInput(raw);
    if (v !== row.amount) updateFixed(row.id, { amount: v });
  }

  return (
    <div className={`card px-3 py-3 ${isVar && !row.paid ? "ring-1 ring-amber-300" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate" dir="auto">{row.name}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <button
              onClick={() => updateFixed(row.id, { kind: isVar ? "stable" : "variable" })}
              className={`chip ${isVar ? "bg-amber-100 text-amber-700" : "bg-paper-line text-ink-faint"}`}
            >{isVar ? t.variable : t.stable}</button>
            <button
              onClick={() => updateFixed(row.id, { channel: row.channel === "cash" ? "online" : "cash" })}
              className={`chip ${row.channel === "cash" ? "bg-household-tint text-cash" : "bg-indigo-50 text-online"}`}
            >{row.channel === "cash" ? t.cash : t.online}</button>
          </div>
        </div>
        <input
          className="w-24 field tap text-right tnum !py-1.5"
          inputMode="numeric"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commitAmount}
        />
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-paper-line">
        <PaidToggle paid={row.paid} onToggle={() => toggleFixedPaid(row.id)} />
        <div className="flex items-center gap-2">
          {isVar && !row.paid && <span className="text-[11px] text-amber-600">{t.confirmAmount}</span>}
          <ConfirmDelete onConfirm={() => deleteFixed(row.id)} />
        </div>
      </div>
    </div>
  );
}

function FixedSheet({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void; onAdd: (p: Omit<FixedExpense, "id" | "monthId" | "bucket">) => void;
}) {
  const [name, setName] = useState("");
  const [raw, setRaw] = useState("");
  const [amount, setAmount] = useState(0);
  const [kind, setKind] = useState<FixedKind>("stable");
  const [channel, setChannel] = useState<Channel>("cash");

  function save() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), amount, paid: false, kind, channel });
    setName(""); setRaw(""); setAmount(0); setKind("stable"); setChannel("cash");
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={`${t.add} ${t.fixed}`}>
      <div className="space-y-4">
        <TextField label={t.name} value={name} onChange={setName} placeholder="House rent, Current bill…" />
        <AmountField label={t.amount} raw={raw} onChange={(r, v) => { setRaw(r); setAmount(v); }} />
        <div>
          <span className="label">Kind</span>
          <div className="flex gap-2">
            {(["stable", "variable"] as FixedKind[]).map((k) => (
              <button key={k} onClick={() => setKind(k)}
                className={`flex-1 tap rounded-xl px-3 py-2.5 text-sm font-semibold border ${kind === k ? (k === "variable" ? "bg-amber-500 text-white border-transparent" : "bg-household text-white border-transparent") : "bg-white text-ink-soft border-paper-line"}`}>
                {k === "stable" ? t.stable : t.variable}
              </button>
            ))}
          </div>
        </div>
        <ChannelPicker value={channel} onChange={setChannel} />
        <button className="btn-primary w-full tap" onClick={save}>{t.save}</button>
      </div>
    </Sheet>
  );
}
