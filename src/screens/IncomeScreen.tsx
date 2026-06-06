import { useMemo, useState } from "react";
import { useStore } from "../store/store";
import type { Channel, Income } from "../domain/types";
import { formatTaka } from "../i18n/format";
import { t } from "../i18n/strings";
import { ScreenHeader, EmptyState, Sheet, ConfirmDelete } from "../components/ui";
import { AmountField, ChannelPicker, TextField } from "../components/inputs";
import { PlusIcon } from "../components/icons";

export function IncomeScreen() {
  const { records, bucket, addIncome, updateIncome, deleteIncome } = useStore();
  const list = records.incomes.filter((i) => i.bucket === bucket);
  const [editing, setEditing] = useState<Income | "new" | null>(null);

  const totals = useMemo(() => {
    const total = list.reduce((s, i) => s + i.amount, 0);
    const cash = list.filter((i) => i.channel === "cash").reduce((s, i) => s + i.amount, 0);
    return { total, cash, online: total - cash };
  }, [list]);

  return (
    <div>
      <ScreenHeader title={t.income} subtitle={bucket === "our" ? t.our : t.household}
        right={<button className="btn-primary tap" onClick={() => setEditing("new")}><PlusIcon /> {t.add}</button>} />

      <div className="card mx-4 my-2 px-4 py-3 grid grid-cols-3 gap-2 text-center">
        <Stat label={t.total} value={totals.total} strong />
        <Stat label={t.cash} value={totals.cash} />
        <Stat label={t.online} value={totals.online} />
      </div>

      {list.length === 0 ? <EmptyState message={t.noIncome} /> : (
        <div className="card mx-4 divide-y divide-paper-line overflow-hidden">
          {list.map((i) => (
            <button key={i.id} onClick={() => setEditing(i)} className="w-full flex items-center justify-between px-4 py-3 tap hover:bg-paper-line/30 text-left">
              <div>
                <div className="font-medium" dir="auto">{i.source}</div>
                <span className={`chip mt-0.5 ${i.channel === "cash" ? "bg-household-tint text-cash" : "bg-indigo-50 text-online"}`}>{i.channel === "cash" ? t.cash : t.online}</span>
              </div>
              <span className="tnum font-semibold">{formatTaka(i.amount)}</span>
            </button>
          ))}
        </div>
      )}

      <IncomeSheet
        key={editing === "new" ? "new" : editing?.id ?? "none"}
        editing={editing}
        onClose={() => setEditing(null)}
        onAdd={(p) => addIncome(p)}
        onUpdate={(id, p) => updateIncome(id, p)}
        onDelete={(id) => deleteIncome(id)}
      />
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`tnum ${strong ? "text-lg font-bold" : "font-semibold text-ink-soft"}`}>{formatTaka(value)}</div>
    </div>
  );
}

function IncomeSheet({ editing, onClose, onAdd, onUpdate, onDelete }: {
  editing: Income | "new" | null;
  onClose: () => void;
  onAdd: (p: Omit<Income, "id" | "monthId">) => void;
  onUpdate: (id: string, p: Partial<Income>) => void;
  onDelete: (id: string) => void;
}) {
  const bucket = useStore((s) => s.bucket);
  const isNew = editing === "new";
  const row = editing && editing !== "new" ? editing : null;

  const [source, setSource] = useState(row?.source ?? "");
  const [raw, setRaw] = useState(row ? String(row.amount) : "");
  const [amount, setAmount] = useState(row?.amount ?? 0);
  const [channel, setChannel] = useState<Channel>(row?.channel ?? "cash");

  // Reset form when target changes.
  const formKey = editing === "new" ? "new" : row?.id ?? "none";

  function save() {
    if (!source.trim() && amount <= 0) return;
    if (isNew) {
      onAdd({ source: source.trim() || "Income", amount, channel, bucket, date: new Date().toISOString().slice(0, 10) });
    } else if (row) {
      onUpdate(row.id, { source: source.trim() || row.source, amount, channel });
    }
    onClose();
  }

  return (
    <Sheet open={editing != null} onClose={onClose} title={isNew ? `${t.add} ${t.income}` : t.edit}>
      <div key={formKey} className="space-y-4">
        <TextField label={t.source} value={source} onChange={setSource} placeholder="Ma, Abid, Online pay…" />
        <AmountField label={t.amount} raw={raw} onChange={(r, v) => { setRaw(r); setAmount(v); }} />
        <ChannelPicker value={channel} onChange={setChannel} />
        <div className="flex gap-2 pt-2">
          <button className="btn-primary flex-1 tap" onClick={save}>{t.save}</button>
          {row && <ConfirmDelete onConfirm={() => { onDelete(row.id); onClose(); }} />}
        </div>
      </div>
    </Sheet>
  );
}
