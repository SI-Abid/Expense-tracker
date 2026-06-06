import { useMemo, useState } from "react";
import { useReconciliation, useStore } from "../store/store";
import { formatTaka } from "../i18n/format";
import { t } from "../i18n/strings";
import { Sheet } from "../components/ui";
import { BazarEntryForm } from "../components/BazarEntryForm";
import { ChevronRight, PlusIcon } from "../components/icons";

export function Dashboard() {
  const { bucket, records, go } = useStore();
  const rec = useReconciliation();
  const [quickAdd, setQuickAdd] = useState(false);

  const isOur = bucket === "our";
  const accentText = isOur ? "text-our" : "text-household";
  const heroBg = isOur
    ? "bg-gradient-to-br from-our to-our-soft"
    : "bg-gradient-to-br from-household to-household-soft";

  // Income split across buckets (the Our/Songsar split indicator).
  const split = useMemo(() => {
    let household = 0, our = 0;
    for (const i of records.incomes) {
      if (i.bucket === "our") our += i.amount; else household += i.amount;
    }
    return { household, our, total: household + our };
  }, [records.incomes]);

  const rows: { key: string; label: string; value: number; screen: Parameters<typeof go>[0] }[] = [
    { key: "fixed", label: t.fixed, value: rec.byCategory.fixed.spent, screen: "fixed" },
    { key: "mb", label: t.monthlyBazar, value: rec.byCategory.bazarMonthly.spent, screen: "bazar" },
    { key: "db", label: t.dailyBazar, value: rec.byCategory.bazarDaily.spent, screen: "bazar" },
    { key: "labor", label: t.labor, value: rec.byCategory.labor.spent, screen: "labor" },
    { key: "extras", label: t.extras, value: rec.byCategory.extras.spent, screen: "extras" },
  ];

  return (
    <div className="px-4 pt-3 space-y-4">
      {/* Hero */}
      <div className={`rounded-2xl ${heroBg} text-white p-5 shadow-hero`}>
        <div className="text-sm opacity-90">{isOur ? `${t.our} · ` : ""}{t.cashRemaining}</div>
        <div className="text-4xl font-extrabold tnum mt-1">{formatTaka(rec.cashOnHand)}</div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/15 rounded-xl px-3 py-2">
            <div className="text-[11px] opacity-90">{t.onlineBalance}</div>
            <div className="font-bold tnum">{formatTaka(rec.onlineOnHand)}</div>
          </div>
          <div className="bg-white/15 rounded-xl px-3 py-2">
            <div className="text-[11px] opacity-90">{t.stillToPay}</div>
            <div className="font-bold tnum">{formatTaka(rec.unpaidObligations)}</div>
          </div>
        </div>
      </div>

      {/* Income in + split */}
      <button onClick={() => go("income")} className="card w-full text-left px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-ink-faint uppercase tracking-wide">{t.incomeIn}</div>
          <div className="text-xl font-bold tnum">{formatTaka(rec.incomeTotal)}</div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="chip bg-household-tint text-household">{t.household} {formatTaka(split.household)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs mt-1">
            <span className="chip bg-our-tint text-our">{t.our} {formatTaka(split.our)}</span>
          </div>
        </div>
      </button>

      {/* Where it went */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t.whereItWent}</span>
          <span className={`text-xs font-bold tnum ${accentText}`}>{formatTaka(rec.totalSpent)}</span>
        </div>
        <div className="card divide-y divide-paper-line overflow-hidden">
          {rows.map((r) => (
            <button key={r.key} onClick={() => go(r.screen)} className="w-full flex items-center justify-between px-4 py-3 tap hover:bg-paper-line/30">
              <span className="font-medium text-ink">{r.label}</span>
              <span className="flex items-center gap-2 text-ink-soft">
                <span className="tnum font-semibold">{formatTaka(r.value)}</span>
                <ChevronRight width={16} height={16} className="text-ink-faint" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick add FAB */}
      <button
        onClick={() => setQuickAdd(true)}
        className={`fixed bottom-24 right-4 z-20 ${isOur ? "bg-our" : "bg-household"} text-white rounded-full shadow-hero flex items-center gap-2 pl-4 pr-5 py-3.5 font-semibold active:scale-95`}
      >
        <PlusIcon /> {t.quickAddBazar}
      </button>

      <Sheet open={quickAdd} onClose={() => setQuickAdd(false)} title={t.quickAddBazar}>
        <BazarEntryForm mode="daily_kacha" onSaved={() => setQuickAdd(false)} />
      </Sheet>
    </div>
  );
}
