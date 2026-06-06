// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { db } from "./db/db";
import { useStore } from "./store/store";

// Full render smoke test: mount the real app against an in-memory IndexedDB and
// confirm it boots, seeds, reconciles, and paints the dashboard hero figure.

beforeEach(async () => {
  await db.delete();
  await db.open();
  useStore.setState({
    ready: false, bucket: "songsar", screen: "dashboard",
    months: [], month: undefined,
    records: { incomes: [], fixed: [], bazar: [], labor: [], extras: [] },
  });
});
afterEach(() => cleanup());

describe("<App /> render", () => {
  it("boots, seeds, and shows the reconciled dashboard", async () => {
    render(<App />);

    // The hero label appears once seeding + reconciliation complete.
    await waitFor(() => expect(screen.getByText("Cash remaining")).toBeTruthy(), { timeout: 3000 });

    // Seeded June 2026 household cash on hand = ৳ 40,110.
    expect(screen.getByText(/40,110/)).toBeTruthy();
    // Month label rendered in the header.
    expect(screen.getByText("June 2026")).toBeTruthy();
    // "Where it went" rows present.
    expect(screen.getByText("Daily Bazar")).toBeTruthy();
  });
});
