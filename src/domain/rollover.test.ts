import { describe, expect, it } from "vitest";
import {
  closeMonth,
  currentMonthId,
  monthLabel,
  nextMonthId,
  prevMonthId,
} from "./rollover";
import type { FixedExpense, Labor, Month } from "./types";

describe("month id helpers", () => {
  it("labels a month id", () => {
    expect(monthLabel("2026-06")).toBe("June 2026");
    expect(monthLabel("2026-01")).toBe("January 2026");
    expect(monthLabel("2025-12")).toBe("December 2025");
  });
  it("advances across a year boundary", () => {
    expect(nextMonthId("2026-06")).toBe("2026-07");
    expect(nextMonthId("2026-12")).toBe("2027-01");
  });
  it("rewinds across a year boundary", () => {
    expect(prevMonthId("2026-06")).toBe("2026-05");
    expect(prevMonthId("2026-01")).toBe("2025-12");
  });
  it("derives the current month id from a date", () => {
    expect(currentMonthId(new Date("2026-06-15T10:00:00Z"))).toBe("2026-06");
  });
});

describe("closeMonth", () => {
  const june: Month = {
    id: "2026-06",
    label: "June 2026",
    status: "active",
    carryOverCash: 5000,
    carryOverOnline: 2000,
  };
  const fixed: FixedExpense[] = [
    { id: "f1", monthId: "2026-06", name: "House rent", amount: 18000, paid: true, kind: "stable", channel: "online", bucket: "songsar", paidDate: "2026-06-02" },
    { id: "f2", monthId: "2026-06", name: "Current bill", amount: 3200, paid: true, kind: "variable", channel: "cash", bucket: "songsar" },
  ];
  const labor: Labor[] = [
    { id: "l1", monthId: "2026-06", name: "Notun Bua", ratePerDay: 500, daysWorked: 11, paid: true, channel: "cash", bucket: "songsar" },
  ];

  let n = 0;
  const idgen = () => `new-${n++}`;

  it("marks the month closed and seeds next month carry-over from closing balances", () => {
    n = 0;
    const r = closeMonth(june, { cashOnHand: 14840, onlineOnHand: 6000 }, fixed, labor, idgen);
    expect(r.closedMonth.status).toBe("closed");
    expect(r.nextMonth.id).toBe("2026-07");
    expect(r.nextMonth.label).toBe("July 2026");
    expect(r.nextMonth.status).toBe("active");
    expect(r.nextMonth.carryOverCash).toBe(14840);
    expect(r.nextMonth.carryOverOnline).toBe(6000);
  });

  it("copies fixed rows forward with amount/kind kept and paid reset", () => {
    n = 0;
    const r = closeMonth(june, { cashOnHand: 0, onlineOnHand: 0 }, fixed, labor, idgen);
    expect(r.nextFixed).toHaveLength(2);
    expect(r.nextFixed[0]).toMatchObject({
      name: "House rent", amount: 18000, kind: "stable", channel: "online",
      monthId: "2026-07", paid: false,
    });
    expect(r.nextFixed[0].paidDate).toBeUndefined();
    expect(r.nextFixed[0].id).not.toBe("f1");
  });

  it("copies labor rows forward with rate kept and days reset to 0", () => {
    n = 0;
    const r = closeMonth(june, { cashOnHand: 0, onlineOnHand: 0 }, fixed, labor, idgen);
    expect(r.nextLabor).toHaveLength(1);
    expect(r.nextLabor[0]).toMatchObject({
      name: "Notun Bua", ratePerDay: 500, daysWorked: 0, paid: false,
      monthId: "2026-07",
    });
  });
});
