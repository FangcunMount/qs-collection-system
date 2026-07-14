import {
  formatQuestionDate,
  getRatingForScoreCode,
  getScoreCodeForRating,
  normalizeCheckboxValues,
  normalizeRadioValue,
} from "../questionValueAdapters";

const options = [
  { code: "A", content: 2 },
  { code: "B", content: 3, is_select: "1" },
  { code: "C", content: 4 },
];

describe("question value adapters", () => {
  test("radio always restores and emits original option code", () => {
    expect(normalizeRadioValue(options, "B")).toBe("B");
    expect(normalizeRadioValue(options, "missing")).toBe("");
  });

  test("checkbox prefers explicit values and preserves legacy is_select", () => {
    expect(normalizeCheckboxValues(options, ["A", "C"])).toEqual(["A", "C"]);
    expect(normalizeCheckboxValues(options, undefined)).toEqual(["B"]);
  });

  test("date keeps the questionnaire format", () => {
    expect(formatQuestionDate(new Date(2026, 6, 14), "YYYY/MM/DD")).toBe("2026/07/14");
    expect(formatQuestionDate(new Date(2026, 6, 14), "yyyy-MM-dd")).toBe("2026-07-14");
  });

  test("rating maps back to the original code even when scores do not start at one", () => {
    expect(getRatingForScoreCode(options, "B")).toBe(2);
    expect(getScoreCodeForRating(options, 3)).toBe("C");
  });
});
