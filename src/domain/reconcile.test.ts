import { describe, expect, it } from "vitest";
import { laborPay, reconcile, type MonthRecords } from "./reconcile";
import type {
  BazarEntry,
  Bucket,
  Extra,
  FixedExpense,
  Income,
  Labor,
} from "./types";

let seq = 0;
const id = () => `id-${seq++}`;

function income(p: Partial<Income>): Income {
  return {
    id: id(), monthId: "2026-06", source: "src", amount: 0,
    channel: "cash", bucket: "songsar", date: "2026-06-01", ...p,
  };
}
function fixed(p: Partial<FixedExpense>): FixedExpense {
  return {
    id: id(), monthId: "2026-06", name: "fix", amount: 0, paid: false,
    kind: "stable", channel: "cash", bucket: "songsar", ...p,
  };
}
function bazar(p: Partial<BazarEntry>): BazarEntry {
  return {
    id: id(), monthId: "2026-06", mode: "daily_kacha", date: "2026-06-02",
    channel: "cash", bucket: "songsar", lineItems: [], total: 0, ...p,
  };
}
function labor(p: Partial<Labor>): Labor {
  return {
    id: id(), monthId: "2026-06", name: "bua", ratePerDay: 0, daysWorked: 0,
    paid: false, channel: "cash", bucket: "songsar", ...p,
  };
}
function extra(p: Partial<Extra>): Extra {
  return {
    id: id(), monthId: "2026-06", name: "extra", amount: 0,
    channel: "cash", bucket: "songsar", date: "2026-06-03", ...p,
  };
}

const empty: MonthRecords = { incomes: [], fixed: [], bazar: [], labor: [], extras: [] };

describe("laborPay", () => {
  it("multiplies rate by days", () => {
    expect(laborPay({ ratePerDay: 500, daysWorked: 11 })).toBe(5500);
  });
});

describe("reconcile", () => {
  it("returns carry-over when there is no activity", () => {
    const r = reconcile({ carryOverCash: 1000, carryOverOnline: 500 }, empty, "songsar");
    expect(r.cashOnHand).toBe(1000);
    expect(r.onlineOnHand).toBe(500);
    expect(r.projectedRemaining).toBe(1500);
    expect(r.unpaidObligations).toBe(0);
  });

  it("separates cash and online income — never merges them", () => {
    const records: MonthRecords = {
      ...empty,
      incomes: [
        income({ amount: 50000, channel: "cash" }),
        income({ amount: 25000, channel: "online" }),
      ],
    };
    const r = reconcile({ carryOverCash: 0, carryOverOnline: 0 }, records, "songsar");
    expect(r.incomeCash).toBe(50000);
    expect(r.incomeOnline).toBe(25000);
    expect(r.incomeTotal).toBe(75000);
    expect(r.cashOnHand).toBe(50000);
    expect(r.onlineOnHand).toBe(25000);
  });

  it("counts bazar and extras immediately, but fixed/labor only when paid", () => {
    const records: MonthRecords = {
      incomes: [income({ amount: 20000, channel: "cash" })],
      fixed: [
        fixed({ amount: 8000, paid: true, channel: "cash" }), // counted
        fixed({ amount: 2000, paid: false, channel: "cash" }), // unpaid obligation
      ],
      bazar: [bazar({ total: 500, channel: "cash", mode: "daily_kacha" })],
      labor: [
        labor({ ratePerDay: 500, daysWorked: 10, paid: true, channel: "cash" }), // 5000 counted
        labor({ ratePerDay: 400, daysWorked: 5, paid: false, channel: "cash" }), // 2000 unpaid
      ],
      extras: [extra({ amount: 1000, channel: "cash" })],
    };
    const r = reconcile({ carryOverCash: 0, carryOverOnline: 0 }, records, "songsar");

    // counted out = 8000 + 500 + 5000 + 1000 = 14500
    expect(r.paidCashOut).toBe(14500);
    expect(r.cashOnHand).toBe(20000 - 14500);
    // unpaid obligations = 2000 (fixed) + 2000 (labor)
    expect(r.unpaidObligations).toBe(4000);
    expect(r.unpaidCash).toBe(4000);
    // projected = cashOnHand + onlineOnHand - unpaid = 5500 + 0 - 4000
    expect(r.projectedRemaining).toBe(1500);
  });

  it("tracks unpaid obligations by channel", () => {
    const records: MonthRecords = {
      ...empty,
      fixed: [
        fixed({ amount: 3000, paid: false, channel: "cash" }),
        fixed({ amount: 1500, paid: false, channel: "online" }),
      ],
    };
    const r = reconcile({ carryOverCash: 0, carryOverOnline: 0 }, records, "songsar");
    expect(r.unpaidCash).toBe(3000);
    expect(r.unpaidOnline).toBe(1500);
    expect(r.unpaidObligations).toBe(4500);
  });

  it("isolates buckets — Our money never enters the Songsar dashboard", () => {
    const records: MonthRecords = {
      incomes: [
        income({ amount: 10000, channel: "cash", bucket: "songsar" }),
        income({ amount: 9999, channel: "cash", bucket: "our" }),
      ],
      fixed: [], bazar: [], labor: [], extras: [],
    };
    const songsar = reconcile({ carryOverCash: 0, carryOverOnline: 0 }, records, "songsar");
    const our = reconcile({ carryOverCash: 0, carryOverOnline: 0 }, records, "our");
    expect(songsar.incomeCash).toBe(10000);
    expect(our.incomeCash).toBe(9999);
  });

  it("breaks spending into categories for the dashboard rows", () => {
    const records: MonthRecords = {
      ...empty,
      fixed: [fixed({ amount: 8000, paid: true })],
      bazar: [
        bazar({ total: 2000, mode: "monthly_shukna" }),
        bazar({ total: 300, mode: "daily_kacha" }),
        bazar({ total: 450, mode: "daily_kacha" }),
      ],
      labor: [labor({ ratePerDay: 500, daysWorked: 11, paid: true })],
      extras: [extra({ amount: 1000 })],
    };
    const r = reconcile({ carryOverCash: 0, carryOverOnline: 0 }, records, "songsar");
    expect(r.byCategory.fixed.spent).toBe(8000);
    expect(r.byCategory.bazarMonthly.spent).toBe(2000);
    expect(r.byCategory.bazarDaily.spent).toBe(750);
    expect(r.byCategory.labor.spent).toBe(5500);
    expect(r.byCategory.extras.spent).toBe(1000);
    expect(r.totalSpent).toBe(8000 + 2000 + 750 + 5500 + 1000);
  });

  it("committed fixed includes unpaid, spent does not", () => {
    const records: MonthRecords = {
      ...empty,
      fixed: [fixed({ amount: 5000, paid: true }), fixed({ amount: 3000, paid: false })],
    };
    const r = reconcile({ carryOverCash: 0, carryOverOnline: 0 }, records, "songsar");
    expect(r.byCategory.fixed.spent).toBe(5000);
    expect(r.byCategory.fixed.committed).toBe(8000);
  });
});

// keep the Bucket import meaningful
const _bucketCheck: Bucket = "songsar";
void _bucketCheck;
