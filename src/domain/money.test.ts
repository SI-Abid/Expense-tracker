import { describe, expect, it } from "vitest";
import {
  bengaliToEnglishDigits,
  formatNumber,
  formatTaka,
  parseAmountExpression,
  parseTakaInput,
} from "./money";

describe("bengaliToEnglishDigits", () => {
  it("converts Bengali digits", () => {
    expect(bengaliToEnglishDigits("৭০")).toBe("70");
    expect(bengaliToEnglishDigits("১৩৫")).toBe("135");
  });
  it("passes non-digits through", () => {
    expect(bengaliToEnglishDigits("কুমড়া ৭০")).toBe("কুমড়া 70");
  });
  it("handles mixed digit scripts", () => {
    expect(bengaliToEnglishDigits("1২3৪")).toBe("1234");
  });
});

describe("parseAmountExpression", () => {
  it("parses plain Bengali and English numbers", () => {
    expect(parseAmountExpression("৭০")).toBe(70);
    expect(parseAmountExpression("675")).toBe(675);
  });
  it("sums additive expressions", () => {
    // additive amounts are summed (handover §8). 84 + 16 = 100.
    expect(parseAmountExpression("৮৪+১৬")).toBe(100);
    expect(parseAmountExpression("50+16+16")).toBe(82);
    expect(parseAmountExpression("৫০ + ১৬ + ১৬")).toBe(82);
  });
  it("returns null when there is no number", () => {
    expect(parseAmountExpression("চিনি")).toBeNull();
    expect(parseAmountExpression("   ")).toBeNull();
  });
  it("ignores surrounding whitespace", () => {
    expect(parseAmountExpression("  ৫৫০  ")).toBe(550);
  });
});

describe("parseTakaInput", () => {
  it("returns 0 for invalid input", () => {
    expect(parseTakaInput("")).toBe(0);
    expect(parseTakaInput("abc")).toBe(0);
  });
  it("parses valid input", () => {
    expect(parseTakaInput("১০০০")).toBe(1000);
  });
});

describe("formatTaka", () => {
  it("formats with thousands grouping and the Taka sign", () => {
    expect(formatTaka(14840)).toBe("৳ 14,840");
    expect(formatTaka(0)).toBe("৳ 0");
    expect(formatTaka(75000)).toBe("৳ 75,000");
  });
  it("handles negatives", () => {
    expect(formatTaka(-1200)).toBe("-৳ 1,200");
  });
  it("rounds to whole Taka", () => {
    expect(formatTaka(99.6)).toBe("৳ 100");
  });
});

describe("formatNumber", () => {
  it("groups thousands without a sign", () => {
    expect(formatNumber(30120)).toBe("30,120");
  });
});
