import { useRef } from "react";
import { useStore } from "../store/store";
import { downloadBackup, importData } from "../db/backup";
import { formatTaka } from "../i18n/format";
import { t } from "../i18n/strings";
import { ScreenHeader, ConfirmDelete } from "../components/ui";
import { DocIcon } from "../components/icons";

export function SettingsScreen() {
  const { month, closeCurrentMonth, recomputeCarryOver, resetData, refresh, setToast } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onImportFile(file: File) {
    try {
      const text = await file.text();
      const { months } = await importData(text);
      await refresh();
      setToast(`Imported ${months} month(s).`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Import failed.");
    }
  }

  return (
    <div>
      <ScreenHeader title={t.settings} />

      {/* Month lifecycle */}
      <Section title="This month">
        {month && (
          <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
            <KV label={t.carryOverCash} value={formatTaka(month.carryOverCash)} />
            <KV label={t.carryOverOnline} value={formatTaka(month.carryOverOnline)} />
            <KV label="Status" value={month.status === "active" ? t.active : t.closed} />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button className="btn-primary tap" onClick={() => closeCurrentMonth()} disabled={month?.status === "closed"}>
            {t.closeMonth}
          </button>
          <button className="btn-ghost tap" onClick={() => recomputeCarryOver()}>
            {t.recomputeCarryOver}
          </button>
          <p className="text-xs text-ink-faint leading-relaxed">
            Closing this month snapshots its cash &amp; online balances into next month's carry-over and
            prefills the next month's bills (unpaid) and labor (0 days). Editing a closed month does not
            auto-propagate — use “{t.recomputeCarryOver}” on the following month to refresh it.
          </p>
        </div>
      </Section>

      {/* Data & safety */}
      <Section title={t.dataSafety}>
        <div className="flex flex-col gap-2">
          <button className="btn-primary tap" onClick={() => downloadBackup()}>
            <DocIcon width={18} height={18} /> {t.exportData}
          </button>
          <button className="btn-ghost tap" onClick={() => fileRef.current?.click()}>
            {t.importData}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = "";
            }}
          />
          <p className="text-xs text-ink-faint">{t.wipeWarning}</p>
          <div className="pt-1">
            <ConfirmDelete label={t.resetToSample} onConfirm={() => resetData()} />
          </div>
        </div>
      </Section>

      <Section title={t.about}>
        <p className="text-sm text-ink-soft leading-relaxed">
          <strong>{t.appName}</strong> — {t.tagline}. {t.offlineReady}. No accounts, no telemetry,
          no cloud. Your only backup is the export file above — keep one safe.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-4 my-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint mb-2 px-1">{title}</h2>
      <div className="card px-4 py-4">{children}</div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="tnum font-semibold">{value}</div>
    </div>
  );
}
