import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db/db";
import { exportData, importData } from "../db/backup";
import { reconcileFor, useStore } from "./store";

// End-to-end exercise of the persistence + store + reconciliation wiring
// against an in-memory IndexedDB. Verifies the app's data layer actually runs.

async function wipe() {
  await db.delete();
  await db.open();
}

beforeEach(async () => {
  await wipe();
  // reset store to defaults
  useStore.setState({ ready: false, bucket: "songsar", screen: "dashboard", months: [], records: { incomes: [], fixed: [], bazar: [], labor: [], extras: [] } });
});

describe("seed + reconciliation", () => {
  it("seeds June 2026 and reconciles the household wallet exactly", async () => {
    await useStore.getState().init();
    const s = useStore.getState();
    expect(s.month?.id).toBe("2026-06");

    const rec = reconcileFor(s.month!, s.records, "songsar");
    // income: cash 57,000 / online 18,000
    expect(rec.incomeCash).toBe(57000);
    expect(rec.incomeOnline).toBe(18000);
    // cashOnHand = 57000 - (fixed 2720 + bazar 7670 + labor 5500 + extras 1000)
    expect(rec.cashOnHand).toBe(40110);
    // onlineOnHand = 18000 - (rent 18000 + wifi 1200)
    expect(rec.onlineOnHand).toBe(-1200);
    // unpaid: current bill 3200 + Rubina 6400 (cash) + school fee 5000 (online)
    expect(rec.unpaidObligations).toBe(14600);
    expect(rec.projectedRemaining).toBe(40110 - 1200 - 14600);
  });

  it("keeps the Our bucket isolated from the household", async () => {
    await useStore.getState().init();
    const s = useStore.getState();
    const our = reconcileFor(s.month!, s.records, "our");
    expect(our.incomeOnline).toBe(8000); // Abid (personal)
    expect(our.cashOnHand).toBe(-300); // Lunch out, no carry-over
    // household income must not include the personal 8000
    const house = reconcileFor(s.month!, s.records, "songsar");
    expect(house.incomeOnline).toBe(18000);
  });
});

describe("month close & rollover", () => {
  it("closes June and seeds July with carry-over and prefilled bills/labor", async () => {
    const store = useStore.getState();
    await store.init();
    await useStore.getState().closeCurrentMonth();

    const s = useStore.getState();
    expect(s.monthId).toBe("2026-07");
    expect(s.month?.status).toBe("active");
    expect(s.month?.carryOverCash).toBe(40110);
    expect(s.month?.carryOverOnline).toBe(-1200);

    // July gets fixed rows (unpaid) and labor rows (0 days), income empty.
    const julyFixed = s.records.fixed.filter((f) => f.bucket === "songsar");
    expect(julyFixed.length).toBe(8);
    expect(julyFixed.every((f) => !f.paid)).toBe(true);
    const julyLabor = s.records.labor.filter((l) => l.bucket === "songsar");
    expect(julyLabor.every((l) => l.daysWorked === 0)).toBe(true);
    expect(s.records.incomes.length).toBe(0);

    // July opening cash equals June closing cash.
    const rec = reconcileFor(s.month!, s.records, "songsar");
    expect(rec.cashOnHand).toBe(40110);
  });
});

describe("backup round-trip", () => {
  it("export -> wipe -> import restores data losslessly", async () => {
    await useStore.getState().init();
    const before = await exportData();

    await wipe();
    expect(await db.months.count()).toBe(0);

    await importData(JSON.stringify(before));
    const after = await exportData();

    expect(after.months).toHaveLength(before.months.length);
    expect(after.incomes).toHaveLength(before.incomes.length);
    expect(after.bazar).toHaveLength(before.bazar.length);
    expect(after.labor).toHaveLength(before.labor.length);
    expect(after.extras).toHaveLength(before.extras.length);
  });

  it("rejects a malformed backup file", async () => {
    await expect(importData("not json")).rejects.toThrow();
    await expect(importData(JSON.stringify({ nope: true }))).rejects.toThrow();
  });
});
