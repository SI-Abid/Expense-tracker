import Dexie, { type Table } from "dexie";
import type {
  BazarEntry,
  Extra,
  FixedExpense,
  Income,
  Labor,
  Month,
} from "../domain/types";

// IndexedDB persistence via Dexie. Financial data volume is small but
// relational; per-month scoping gives us amount history for free.

export class SongsarDB extends Dexie {
  months!: Table<Month, string>;
  incomes!: Table<Income, string>;
  fixed!: Table<FixedExpense, string>;
  bazar!: Table<BazarEntry, string>;
  labor!: Table<Labor, string>;
  extras!: Table<Extra, string>;

  constructor() {
    super("songsar-ledger");
    this.version(1).stores({
      // Index monthId + bucket since every screen queries by them.
      months: "id, status",
      incomes: "id, monthId, [monthId+bucket], bucket",
      fixed: "id, monthId, [monthId+bucket], bucket",
      bazar: "id, monthId, [monthId+bucket], bucket, mode",
      labor: "id, monthId, [monthId+bucket], bucket",
      extras: "id, monthId, [monthId+bucket], bucket",
    });
  }
}

export const db = new SongsarDB();

/** Stable id generator (crypto.randomUUID with a fallback for old runtimes). */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
