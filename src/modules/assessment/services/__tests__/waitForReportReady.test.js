import { resetReportEventsCapability } from "../reportEventsClient";
import { waitForReportReady } from "../waitForReportReady";

describe("waitForReportReady fallback seam", () => {
  beforeEach(() => resetReportEventsCapability());

  test("announces websocket degradation without changing report-status completion", async () => {
    const onFallback = jest.fn();
    const statusData = { status: "interpreted", stage: "interpreted" };
    const strategy = {
      kind: "medical",
      pollReportStatus: jest.fn().mockResolvedValue(statusData),
      isCompleted: (status) => status === "interpreted",
      isFailed: () => false,
    };

    await expect(waitForReportReady({
      strategy,
      assessmentId: "a1",
      testeeId: "t1",
      onFallback,
      watchReport: jest.fn().mockResolvedValue({
        completed: false,
        unavailable: true,
        reason: "socket_error",
      }),
    })).resolves.toEqual({ statusData, source: "report-status" });

    expect(onFallback).toHaveBeenCalledWith("socket_error");
    expect(strategy.pollReportStatus).toHaveBeenCalledTimes(1);
  });

  test("uses the strategy event kind for behavior websocket subscriptions", async () => {
    const watchReport = jest.fn().mockResolvedValue({
      completed: true,
      statusData: { status: "interpreted", stage: "interpreted" },
    });
    const strategy = {
      kind: "ability",
      eventKind: "behavior",
      pollReportStatus: jest.fn(),
      isCompleted: (status) => status === "interpreted",
      isFailed: () => false,
    };

    await waitForReportReady({
      strategy,
      assessmentId: "a1",
      testeeId: "t1",
      watchReport,
    });

    expect(watchReport).toHaveBeenCalledWith(expect.objectContaining({ kind: "behavior" }));
    expect(strategy.pollReportStatus).not.toHaveBeenCalled();
  });
});
