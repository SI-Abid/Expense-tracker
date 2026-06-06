import type {
  BazarEntry,
  Extra,
  FixedExpense,
  Income,
  Labor,
  Month,
} from "../domain/types";
import { sumLineItems } from "../domain/parser";
import { db, newId } from "./db";

// First-run seed: the June 2026 sample (handover §14). Used for development
// and demo; the operator can wipe it from Settings.

const MONTH_ID = "2026-06";

function buildSeed() {
  const month: Month = {
    id: MONTH_ID,
    label: "June 2026",
    status: "active",
    carryOverCash: 0,
    carryOverOnline: 0,
  };

  // Pooled income — ৳75,000 across the household sources.
  const incomes: Income[] = [
    inc("Ma", 15000, "cash"),
    inc("Abid", 20000, "cash"),
    inc("Habi", 10000, "cash"),
    inc("Medical", 5000, "cash"),
    inc("Online pay", 18000, "online"),
    inc("Cash", 7000, "cash"),
  ];

  // Fixed expenses — total ৳30,120, including the variable current bill + gas.
  const fixed: FixedExpense[] = [
    fix("House rent", 18000, "stable", "online", true, "2026-06-02"),
    fix("Wifi", 1200, "stable", "online", true, "2026-06-02"),
    fix("Current bill", 3200, "variable", "cash", false), // variable — confirm
    fix("Gas", 1100, "variable", "cash", true, "2026-06-05"),
    fix("School fee", 5000, "stable", "online", false),
    fix("Newspaper", 320, "stable", "cash", true, "2026-06-03"),
    fix("Garbage bill", 300, "stable", "cash", true, "2026-06-03"),
    fix("Mobile recharge", 1000, "stable", "cash", true, "2026-06-04"),
  ];

  // Monthly shukna bazar — one bulk trip of dry goods (Bengali names).
  const shukna: BazarEntry = bazar("monthly_shukna", "2026-06-01", "cash", [
    { name: "চাল", amount: 3000 },
    { name: "ডাল", amount: 800 },
    { name: "তেল", amount: 850 },
    { name: "পেঁয়াজ", amount: 400 },
    { name: "চিনি", amount: 300 },
    { name: "আটা", amount: 350 },
  ]);

  // Daily kacha bazar — a couple of trips, the high-traffic path.
  const kacha1: BazarEntry = bazar("daily_kacha", "2026-06-02", "cash", [
    { name: "কুমড়া", amount: 70 },
    { name: "মুরগী", amount: 675 },
    { name: "ডিম", amount: 135 },
    { name: "আলু", amount: 60 },
    { name: "চিংড়ি", amount: 550 },
  ]);
  const kacha2: BazarEntry = bazar("daily_kacha", "2026-06-04", "cash", [
    { name: "মাছ", amount: 420 },
    { name: "শাক", amount: 40 },
    { name: "লেবু", amount: 20 },
  ]);

  // Labor — paid by days.
  const labor: Labor[] = [
    lab("Notun Bua", 500, 11, true, "cash"),
    lab("Rubina", 400, 16, false, "cash"),
  ];

  // Extras — one-off oven repair.
  const extras: Extra[] = [extra("Oven repair", 1000, "cash", "2026-06-06")];

  // A small "Our" (personal) sample so the Our tab demonstrates isolation.
  incomes.push(incBucket("Abid (personal)", 8000, "online", "our"));
  extras.push(extraBucket("Lunch out", 300, "cash", "our", "2026-06-05"));

  return {
    months: [month],
    incomes,
    fixed,
    bazar: [shukna, kacha1, kacha2],
    labor,
    extras,
  };

  // --- builders ---
  function inc(source: string, amount: number, channel: "cash" | "online"): Income {
    return { id: newId(), monthId: MONTH_ID, source, amount, channel, bucket: "songsar", date: "2026-06-01" };
  }
  function incBucket(source: string, amount: number, channel: "cash" | "online", bucket: "our" | "songsar"): Income {
    return { id: newId(), monthId: MONTH_ID, source, amount, channel, bucket, date: "2026-06-01" };
  }
  function fix(
    name: string, amount: number, kind: "stable" | "variable",
    channel: "cash" | "online", paid: boolean, paidDate?: string,
  ): FixedExpense {
    return { id: newId(), monthId: MONTH_ID, name, amount, paid, kind, channel, bucket: "songsar", paidDate };
  }
  function bazar(
    mode: "monthly_shukna" | "daily_kacha", date: string,
    channel: "cash" | "online", lineItems: { name: string; amount: number }[],
  ): BazarEntry {
    return { id: newId(), monthId: MONTH_ID, mode, date, channel, bucket: "songsar", lineItems, total: sumLineItems(lineItems) };
  }
  function lab(name: string, ratePerDay: number, daysWorked: number, paid: boolean, channel: "cash" | "online"): Labor {
    return { id: newId(), monthId: MONTH_ID, name, ratePerDay, daysWorked, paid, channel, bucket: "songsar" };
  }
  function extra(name: string, amount: number, channel: "cash" | "online", date: string): Extra {
    return { id: newId(), monthId: MONTH_ID, name, amount, channel, bucket: "songsar", date };
  }
  function extraBucket(name: string, amount: number, channel: "cash" | "online", bucket: "our" | "songsar", date: string): Extra {
    return { id: newId(), monthId: MONTH_ID, name, amount, channel, bucket, date };
  }
}

/** Seed the DB only if it is completely empty (first run). */
export async function seedIfEmpty(): Promise<void> {
  const count = await db.months.count();
  if (count > 0) return;
  const s = buildSeed();
  await db.transaction("rw", [db.months, db.incomes, db.fixed, db.bazar, db.labor, db.extras], async () => {
    await db.months.bulkPut(s.months);
    await db.incomes.bulkPut(s.incomes);
    await db.fixed.bulkPut(s.fixed);
    await db.bazar.bulkPut(s.bazar);
    await db.labor.bulkPut(s.labor);
    await db.extras.bulkPut(s.extras);
  });
}

/** Wipe everything (Settings → reset). */
export async function wipeAll(): Promise<void> {
  await db.transaction("rw", [db.months, db.incomes, db.fixed, db.bazar, db.labor, db.extras], async () => {
    await Promise.all([
      db.months.clear(),
      db.incomes.clear(),
      db.fixed.clear(),
      db.bazar.clear(),
      db.labor.clear(),
      db.extras.clear(),
    ]);
  });
}

/** Wipe then re-seed the sample month. */
export async function resetToSeed(): Promise<void> {
  await wipeAll();
  await seedIfEmpty();
}
