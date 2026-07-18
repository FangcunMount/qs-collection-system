import { buildReportWaitViewModel } from "../reportWaitViewState";

describe("report wait view state", () => {
  test.each([
    ["processing", true, false],
    ["delayed", true, false],
    ["degraded", true, false],
    ["success", true, false],
    ["failure", false, true],
  ] as const)("maps %s without changing lifecycle semantics", (phase, showAnimation, canRetry) => {
    expect(buildReportWaitViewModel({ phase, stage: "scoring" })).toMatchObject({
      phase,
      showAnimation,
      canRetry,
      stageLabel: "当前阶段：scoring",
    });
  });
});
