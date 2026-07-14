import { formatReportDelta, getReportDeltaDirection } from "../reportTrend";

describe("report trend formatting", () => {
  test("preserves flat, rising and falling score semantics", () => {
    expect(getReportDeltaDirection(0.001)).toBe("flat");
    expect(formatReportDelta(2.34)).toBe("上升 2.3 分");
    expect(formatReportDelta(-1.26)).toBe("下降 1.3 分");
  });
});
