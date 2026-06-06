import { create } from "zustand";
import { db, newId } from "../db/db";
import { resetToSeed, seedIfEmpty } from "../db/seed";
import type { MonthRecords } from "../domain/reconcile";
import { reconcile, type Reconciliation } from "../domain/reconcile";
import { closeMonth, currentMonthId, monthLabel, nextMonthId, prevMonthId } from "../domain/rollover";
import { sumLineItems } from "../domain/parser";
import type {
  BazarEntry, BazarMode, Bucket, Channel, Extra, FixedExpense,
  Income, Labor, LineItem, Month,
} from "../domain/types";

export type Screen =
  | "dashboard" | "income" | "fixed" | "bazar" | "labor" | "extras" | "settings";

const EMPTY: MonthRecords = { incomes: [], fixed: [], bazar: [], labor: [], extras: [] };

interface AppState {
  ready: boolean;
  bucket: Bucket;
  screen: Screen;
  monthId: string;
  months: Month[];
  month?: Month;
  records: MonthRecords;
  toast?: string;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  setBucket: (b: Bucket) => void;
  go: (screen: Screen) => void;
  setToast: (msg?: string) => void;

  selectMonth: (id: string) => Promise<void>;
  gotoPrevMonth: () => Promise<void>;
  gotoNextMonth: () => Promise<void>;

  addIncome: (p: Omit<Income, "id" | "monthId">) => Promise<void>;
  updateIncome: (id: string, patch: Partial<Income>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;

  addFixed: (p: Omit<FixedExpense, "id" | "monthId">) => Promise<void>;
  updateFixed: (id: string, patch: Partial<FixedExpense>) => Promise<void>;
  toggleFixedPaid: (id: string) => Promise<void>;
  deleteFixed: (id: string) => Promise<void>;

  addBazar: (p: { mode: BazarMode; date: string; channel: Channel; lineItems: LineItem[] }) => Promise<void>;
  updateBazar: (id: string, patch: Partial<Omit<BazarEntry, "total">> & { lineItems?: LineItem[] }) => Promise<void>;
  deleteBazar: (id: string) => Promise<void>;

  addLabor: (p: Omit<Labor, "id" | "monthId">) => Promise<void>;
  updateLabor: (id: string, patch: Partial<Labor>) => Promise<void>;
  toggleLaborPaid: (id: string) => Promise<void>;
  deleteLabor: (id: string) => Promise<void>;

  addExtra: (p: Omit<Extra, "id" | "monthId">) => Promise<void>;
  updateExtra: (id: string, patch: Partial<Extra>) => Promise<void>;
  deleteExtra: (id: string) => Promise<void>;

  closeCurrentMonth: () => Promise<void>;
  recomputeCarryOver: () => Promise<void>;
  resetData: () => Promise<void>;
}

/** Load all records for a given month (both buckets — screens filter later). */
async function loadRecords(monthId: string): Promise<MonthRecords> {
  const [incomes, fixed, bazar, labor, extras] = await Promise.all([
    db.incomes.where("monthId").equals(monthId).toArray(),
    db.fixed.where("monthId").equals(monthId).toArray(),
    db.bazar.where("monthId").equals(monthId).toArray(),
    db.labor.where("monthId").equals(monthId).toArray(),
    db.extras.where("monthId").equals(monthId).toArray(),
  ]);
  return { incomes, fixed, bazar, labor, extras };
}

export const useStore = create<AppState>((set, get) => ({
  ready: false,
  bucket: "songsar",
  screen: "dashboard",
  monthId: currentMonthId(),
  months: [],
  records: EMPTY,

  init: async () => {
    await seedIfEmpty();
    const months = await db.months.orderBy("id").toArray();
    // Prefer the active month; else the most recent; else create the current one.
    let target = months.find((m) => m.status === "active");
    if (!target && months.length > 0) target = months[months.length - 1];
    if (!target) {
      const id = currentMonthId();
      target = { id, label: monthLabel(id), status: "active", carryOverCash: 0, carryOverOnline: 0 };
      await db.months.put(target);
    }
    set({ monthId: target.id });
    await get().refresh();
    set({ ready: true });
  },

  refresh: async () => {
    const months = await db.months.orderBy("id").toArray();
    const { monthId } = get();
    const month = months.find((m) => m.id === monthId);
    const records = await loadRecords(monthId);
    set({ months, month, records });
  },

  setBucket: (bucket) => set({ bucket, screen: "dashboard" }),
  go: (screen) => set({ screen }),
  setToast: (toast) => set({ toast }),

  selectMonth: async (id) => {
    set({ monthId: id });
    await get().refresh();
  },
  gotoPrevMonth: async () => {
    const id = prevMonthId(get().monthId);
    const exists = await db.months.get(id);
    if (!exists) {
      set({ toast: "No earlier month recorded." });
      return;
    }
    await get().selectMonth(id);
  },
  gotoNextMonth: async () => {
    const id = nextMonthId(get().monthId);
    const exists = await db.months.get(id);
    if (!exists) {
      set({ toast: "No later month yet — close this month to start the next." });
      return;
    }
    await get().selectMonth(id);
  },

  // --- Income ---
  addIncome: async (p) => {
    await db.incomes.put({ ...p, id: newId(), monthId: get().monthId });
    await get().refresh();
  },
  updateIncome: async (id, patch) => {
    await db.incomes.update(id, patch);
    await get().refresh();
  },
  deleteIncome: async (id) => {
    await db.incomes.delete(id);
    await get().refresh();
  },

  // --- Fixed ---
  addFixed: async (p) => {
    await db.fixed.put({ ...p, id: newId(), monthId: get().monthId });
    await get().refresh();
  },
  updateFixed: async (id, patch) => {
    await db.fixed.update(id, patch);
    await get().refresh();
  },
  toggleFixedPaid: async (id) => {
    const row = await db.fixed.get(id);
    if (!row) return;
    const paid = !row.paid;
    await db.fixed.update(id, { paid, paidDate: paid ? new Date().toISOString().slice(0, 10) : undefined });
    await get().refresh();
  },
  deleteFixed: async (id) => {
    await db.fixed.delete(id);
    await get().refresh();
  },

  // --- Bazar ---
  addBazar: async ({ mode, date, channel, lineItems }) => {
    const entry: BazarEntry = {
      id: newId(), monthId: get().monthId, mode, date, channel,
      bucket: get().bucket, lineItems, total: sumLineItems(lineItems),
    };
    await db.bazar.put(entry);
    await get().refresh();
  },
  updateBazar: async (id, patch) => {
    const next: Partial<BazarEntry> = { ...patch };
    if (patch.lineItems) next.total = sumLineItems(patch.lineItems);
    await db.bazar.update(id, next);
    await get().refresh();
  },
  deleteBazar: async (id) => {
    await db.bazar.delete(id);
    await get().refresh();
  },

  // --- Labor ---
  addLabor: async (p) => {
    await db.labor.put({ ...p, id: newId(), monthId: get().monthId });
    await get().refresh();
  },
  updateLabor: async (id, patch) => {
    await db.labor.update(id, patch);
    await get().refresh();
  },
  toggleLaborPaid: async (id) => {
    const row = await db.labor.get(id);
    if (!row) return;
    await db.labor.update(id, { paid: !row.paid });
    await get().refresh();
  },
  deleteLabor: async (id) => {
    await db.labor.delete(id);
    await get().refresh();
  },

  // --- Extras ---
  addExtra: async (p) => {
    await db.extras.put({ ...p, id: newId(), monthId: get().monthId });
    await get().refresh();
  },
  updateExtra: async (id, patch) => {
    await db.extras.update(id, patch);
    await get().refresh();
  },
  deleteExtra: async (id) => {
    await db.extras.delete(id);
    await get().refresh();
  },

  // --- Month lifecycle ---
  closeCurrentMonth: async () => {
    const { month, records } = get();
    if (!month) return;
    if (month.status === "closed") {
      set({ toast: "This month is already closed." });
      return;
    }
    // Closing balances come from the household (songsar) wallet — the cash the
    // operator physically reconciles.
    const rec = reconcileFor(month, records, "songsar");
    const { closedMonth, nextMonth, nextFixed, nextLabor } = closeMonth(
      month, { cashOnHand: rec.cashOnHand, onlineOnHand: rec.onlineOnHand },
      records.fixed.filter((f) => f.bucket === "songsar"),
      records.labor.filter((l) => l.bucket === "songsar"),
      newId,
    );
    await db.transaction("rw", db.months, db.fixed, db.labor, async () => {
      await db.months.put(closedMonth);
      await db.months.put(nextMonth);
      await db.fixed.bulkPut(nextFixed);
      await db.labor.bulkPut(nextLabor);
    });
    set({ monthId: nextMonth.id, toast: `Closed ${closedMonth.label} → opened ${nextMonth.label}.` });
    await get().refresh();
  },

  recomputeCarryOver: async () => {
    const { month } = get();
    if (!month) return;
    const prevId = prevMonthId(month.id);
    const prev = await db.months.get(prevId);
    if (!prev) {
      set({ toast: "No previous month to recompute from." });
      return;
    }
    const prevRecords = await loadRecords(prevId);
    const rec = reconcileFor(prev, prevRecords, "songsar");
    await db.months.update(month.id, {
      carryOverCash: rec.cashOnHand,
      carryOverOnline: rec.onlineOnHand,
    });
    set({ toast: "Carry-over recomputed from previous month." });
    await get().refresh();
  },

  resetData: async () => {
    await resetToSeed();
    const months = await db.months.orderBy("id").toArray();
    const active = months.find((m) => m.status === "active") ?? months[0];
    set({ monthId: active.id, bucket: "songsar", screen: "dashboard" });
    await get().refresh();
  },
}));

/**
 * Reconcile a month for a bucket. The month-level carry-over represents the
 * household wallet, so the personal ("our") bucket starts from zero — keeping
 * it fully isolated from the household balance (handover §7.8).
 */
export function reconcileFor(
  month: Pick<Month, "carryOverCash" | "carryOverOnline">,
  records: MonthRecords,
  bucket: Bucket,
): Reconciliation {
  const carry =
    bucket === "songsar"
      ? { carryOverCash: month.carryOverCash, carryOverOnline: month.carryOverOnline }
      : { carryOverCash: 0, carryOverOnline: 0 };
  return reconcile(carry, records, bucket);
}

/** Selector: reconciliation for the currently selected month + bucket. */
export function useReconciliation(): Reconciliation {
  const month = useStore((s) => s.month);
  const records = useStore((s) => s.records);
  const bucket = useStore((s) => s.bucket);
  const fallback: Pick<Month, "carryOverCash" | "carryOverOnline"> = month ?? { carryOverCash: 0, carryOverOnline: 0 };
  return reconcileFor(fallback, records, bucket);
}
