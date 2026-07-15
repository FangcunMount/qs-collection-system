import type { PersonalityReportDimensionViewModel } from "../../types";
import { resolvePersonalityDimensionScale } from "../personalityDimensionScale";

const dimension = (
  overrides: Partial<PersonalityReportDimensionViewModel> = {},
): PersonalityReportDimensionViewModel => ({
  factor_code: "EI",
  title: "外向-内向",
  description: "",
  score: 72,
  max_score: 100,
  left_pole: "",
  right_pole: "",
  preference: "",
  strength: null,
  risk_level: "",
  suggestion: "",
  ...overrides,
});

describe("personality dimension scale", () => {
  test("renders the canonical E to I scale from a normalized score", () => {
    expect(resolvePersonalityDimensionScale(dimension(), "ISTJ")).toMatchObject({
      left: { code: "E", label: "外向" },
      right: { code: "I", label: "内向" },
      position: 72,
      leftPercent: 28,
      rightPercent: 72,
      hasValue: true,
    });
  });

  test("corrects a reversed raw scoring direction before display", () => {
    expect(resolvePersonalityDimensionScale(dimension({
      score: 30,
      max_score: 40,
      left_pole: "I",
      right_pole: "E",
    }), "ESTJ")).toMatchObject({
      left: { code: "E" },
      right: { code: "I" },
      position: 25,
      leftPercent: 75,
      rightPercent: 25,
    });
  });

  test("uses structured preference strength when it is available", () => {
    expect(resolvePersonalityDimensionScale(dimension({
      score: null,
      max_score: null,
      preference: "I",
      strength: 60,
    }))).toMatchObject({
      position: 80,
      leftPercent: 20,
      rightPercent: 80,
      hasValue: true,
    });
  });
});
