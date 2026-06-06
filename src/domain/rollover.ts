import type { FixedExpense, Labor, Month } from "./types";

// Month lifecycle & rollover — handover §7.1. Pure helpers; id generation is
// injected so the math stays testable.

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-06" -> { year: 2026, month: 6 } (month is 1-based). */
function parseMonthId(id: string): { year: number; month: number } {
  const [y, m] = id.split("-").map((s) => parseInt(s, 10));
  return { year: y, month: m };
}

function makeMonthId(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** "2026-06" -> "June 2026". */
export function monthLabel(id: string): string {
  const { year, month } = parseMonthId(id);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function nextMonthId(id: string): string {
  const { year, month } = parseMonthId(id);
  return month === 12 ? makeMonthId(year + 1, 1) : makeMonthId(year, month + 1);
}

export function prevMonthId(id: string): string {
  const { year, month } = parseMonthId(id);
  return month === 1 ? makeMonthId(year - 1, 12) : makeMonthId(year, month - 1);
}

/** The month id for a JS Date (defaults to now). */
export function currentMonthId(now: Date = new Date()): string {
  return makeMonthId(now.getFullYear(), now.getMonth() + 1);
}

export interface CloseMonthResult {
  /** the just-closed month, with status updated. */
  closedMonth: Month;
  /** the freshly created next active month, seeded with carry-over. */
  nextMonth: Month;
  /** Fixed rows copied forward, paid reset to false. */
  nextFixed: FixedExpense[];
  /** Labor rows copied forward, daysWorked reset to 0. */
  nextLabor: Labor[];
}

/**
 * Close a month: snapshot its closing balances as next month's carry-over,
 * mark it closed, and seed the next active month.
 *
 * Fixed records are copied forward (amount/kind kept, paid reset). Labor
 * records are copied forward (ratePerDay kept, daysWorked reset to 0).
 * Income, bazar and extras start empty.
 */
export function closeMonth(
  month: Month,
  closing: { cashOnHand: number; onlineOnHand: number },
  fixed: FixedExpense[],
  labor: Labor[],
  idgen: () => string,
): CloseMonthResult {
  const nextId = nextMonthId(month.id);

  const closedMonth: Month = { ...month, status: "closed" };

  const nextMonth: Month = {
    id: nextId,
    label: monthLabel(nextId),
    status: "active",
    carryOverCash: closing.cashOnHand,
    carryOverOnline: closing.onlineOnHand,
  };

  const nextFixed: FixedExpense[] = fixed.map((f) => ({
    ...f,
    id: idgen(),
    monthId: nextId,
    paid: false,
    paidDate: undefined,
  }));

  const nextLabor: Labor[] = labor.map((l) => ({
    ...l,
    id: idgen(),
    monthId: nextId,
    daysWorked: 0,
    paid: false,
  }));

  return { closedMonth, nextMonth, nextFixed, nextLabor };
}
