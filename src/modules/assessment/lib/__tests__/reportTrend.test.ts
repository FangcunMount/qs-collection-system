import { calculateReportDelta, formatReportDelta, formatRiskChange, getReportDeltaDirection, parseReportScore } from "../reportTrend";

describe("report trend formatting", () => {
  test("preserves flat, rising and falling score semantics", () => {
    expect(getReportDeltaDirection(0.001)).toBe("flat");
    expect(formatReportDelta(2.34)).toBe("上升 2.3 分");
    expect(formatReportDelta(-1.26)).toBe("下降 1.3 分");
  });
});

test.each([null, undefined, "", "  ", false, {}, NaN, Infinity, "not-a-score"])("unavailable score %s is not zero or a comparison", (value) => {
  expect(parseReportScore(value)).toBeNull();
  expect(calculateReportDelta(value, 0)).toBeNull();
  expect(calculateReportDelta(0, value)).toBeNull();
  expect(formatReportDelta(value)).toBe("数据不足，暂无法比较");
});

test("numeric zero and aliases keep their real meaning", () => {
  expect(parseReportScore("0")).toBe(0);
  expect(calculateReportDelta("0", "2.5")).toBe(-2.5);
  expect(formatReportDelta(0)).toBe("持平");
  expect(formatRiskChange("normal", "healthy")).toBe("等级持平");
  expect(formatRiskChange(undefined, undefined)).toBe("风险信息不足，暂无法比较");
});
