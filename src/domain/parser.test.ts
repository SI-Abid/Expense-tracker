import { describe, expect, it } from "vitest";
import { parseBazarText, sumLineItems } from "./parser";

describe("parseBazarText", () => {
  it("parses a comma-separated Bengali bazar line", () => {
    const r = parseBazarText("কুমড়া ৭০, মুরগী ৬৭৫, ডিম ১৩৫, আলু ৬০, চিংড়ি ৫৫০");
    expect(r.items).toEqual([
      { name: "কুমড়া", amount: 70, raw: "কুমড়া ৭০" },
      { name: "মুরগী", amount: 675, raw: "মুরগী ৬৭৫" },
      { name: "ডিম", amount: 135, raw: "ডিম ১৩৫" },
      { name: "আলু", amount: 60, raw: "আলু ৬০" },
      { name: "চিংড়ি", amount: 550, raw: "চিংড়ি ৫৫০" },
    ]);
    expect(r.total).toBe(70 + 675 + 135 + 60 + 550);
  });

  it("splits on newlines as well as commas", () => {
    const r = parseBazarText("Rice 120\nOil 250");
    expect(r.items.map((i) => i.amount)).toEqual([120, 250]);
    expect(r.total).toBe(370);
  });

  it("accepts dash and colon separators between name and amount", () => {
    const r = parseBazarText("মুরগী-675, চিংড়ি:550");
    expect(r.items[0]).toEqual({ name: "মুরগী", amount: 675, raw: "মুরগী-675" });
    expect(r.items[1]).toEqual({ name: "চিংড়ি", amount: 550, raw: "চিংড়ি:550" });
  });

  it("handles mixed Bengali and English digits", () => {
    const r = parseBazarText("চিনি 80, লবণ ৩০");
    expect(r.items.map((i) => i.amount)).toEqual([80, 30]);
  });

  it("sums additive amounts on a single item", () => {
    const r = parseBazarText("মশলা ৫০+১৬+১৬");
    expect(r.items[0]).toEqual({ name: "মশলা", amount: 82, raw: "মশলা ৫০+১৬+১৬" });
    expect(r.total).toBe(82);
  });

  it("surfaces unparseable tokens as editable chips (amount null), never drops them", () => {
    const r = parseBazarText("আলু ৬০, চিনি, ডিম ১৩৫");
    expect(r.items.map((i) => i.amount)).toEqual([60, null, 135]);
    expect(r.items[1].name).toBe("চিনি");
    // unparseable items contribute 0 to the total
    expect(r.total).toBe(195);
  });

  it("trims leading/trailing whitespace and skips empty tokens", () => {
    const r = parseBazarText("  আলু ৬০  , , মুরগী ৬৭৫ ,\n");
    expect(r.items).toHaveLength(2);
    expect(r.items.map((i) => i.name)).toEqual(["আলু", "মুরগী"]);
  });

  it("handles an amount-only token (empty name)", () => {
    const r = parseBazarText("৭০");
    expect(r.items[0]).toEqual({ name: "", amount: 70, raw: "৭০" });
  });

  it("returns an empty result for blank input", () => {
    expect(parseBazarText("   \n  ")).toEqual({ items: [], total: 0 });
  });
});

describe("sumLineItems", () => {
  it("sums amounts", () => {
    expect(sumLineItems([{ name: "a", amount: 10 }, { name: "b", amount: 5 }])).toBe(15);
  });
  it("treats missing amounts as zero", () => {
    expect(sumLineItems([{ name: "a", amount: 0 }])).toBe(0);
  });
});
