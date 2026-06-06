import type { BackupData } from "../domain/types";
import { db } from "./db";

const BACKUP_VERSION = 1;

/** Read the entire database into a JSON-serializable snapshot. */
export async function exportData(): Promise<BackupData> {
  const [months, incomes, fixed, bazar, labor, extras] = await Promise.all([
    db.months.toArray(),
    db.incomes.toArray(),
    db.fixed.toArray(),
    db.bazar.toArray(),
    db.labor.toArray(),
    db.extras.toArray(),
  ]);
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    months,
    incomes,
    fixed,
    bazar,
    labor,
    extras,
  };
}

/** Trigger a browser download of the current data as a JSON file. */
export async function downloadBackup(): Promise<void> {
  const data = await exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `songsar-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isBackup(x: unknown): x is BackupData {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    Array.isArray(o.months) &&
    Array.isArray(o.incomes) &&
    Array.isArray(o.fixed) &&
    Array.isArray(o.bazar) &&
    Array.isArray(o.labor) &&
    Array.isArray(o.extras)
  );
}

/**
 * Replace all data with the contents of a backup. Validates shape first so a
 * malformed file can't silently wipe the ledger. Returns a summary count.
 */
export async function importData(raw: string): Promise<{ months: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!isBackup(parsed)) {
    throw new Error("That file doesn't look like a Songsar backup.");
  }
  const data = parsed;

  await db.transaction(
    "rw",
    [db.months, db.incomes, db.fixed, db.bazar, db.labor, db.extras],
    async () => {
      await Promise.all([
        db.months.clear(),
        db.incomes.clear(),
        db.fixed.clear(),
        db.bazar.clear(),
        db.labor.clear(),
        db.extras.clear(),
      ]);
      await db.months.bulkPut(data.months);
      await db.incomes.bulkPut(data.incomes);
      await db.fixed.bulkPut(data.fixed);
      await db.bazar.bulkPut(data.bazar);
      await db.labor.bulkPut(data.labor);
      await db.extras.bulkPut(data.extras);
    },
  );

  return { months: data.months.length };
}
