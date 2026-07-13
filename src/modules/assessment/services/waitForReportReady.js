import {
  getReportEventsCapability,
  REPORT_EVENTS_CAPABILITY,
  setReportEventsCapability,
  watchReportViaWebSocket,
} from '@/modules/assessment/services/reportEventsClient';

const DEFAULT_POLL_INTERVAL_MS = 3000;
const MIN_POLL_INTERVAL_MS = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const resolvePollDelayMs = (statusData = {}) => {
  const suggested = Number(statusData.nextPollAfterMs) > 0
    ? Number(statusData.nextPollAfterMs)
    : DEFAULT_POLL_INTERVAL_MS;
  return Math.max(suggested, MIN_POLL_INTERVAL_MS);
};

export const resolveRetryAfterMs = (error, fallbackMs = DEFAULT_POLL_INTERVAL_MS) => {
  const retryAfterMs = Number(error?.retryAfterMs || 0);
  const bodyRetryAfterMs = Number(
    error?.data?.retry_after_ms || error?.data?.next_poll_after_ms || 0
  );
  return Math.max(retryAfterMs, bodyRetryAfterMs, fallbackMs, MIN_POLL_INTERVAL_MS);
};

/**
 * 等待报告进入终态：优先 WebSocket，失败后 report-status 短轮询。
 */
export async function waitForReportReady({
  strategy,
  assessmentId,
  testeeId,
  onStatus,
  shouldContinue = () => true,
  logger,
  tryWebSocket = true,
  watchReport = watchReportViaWebSocket,
}) {
  const wsAvailable = getReportEventsCapability() !== REPORT_EVENTS_CAPABILITY.UNAVAILABLE;
  if (tryWebSocket && wsAvailable) {
    const wsResult = await watchReport({
      assessmentId,
      testeeId,
      kind: strategy.kind,
      onStatus,
      shouldContinue,
      logger,
    });

    if (wsResult.completed) {
      return { statusData: wsResult.statusData, source: 'websocket' };
    }

    if (wsResult.unavailable) {
      setReportEventsCapability(REPORT_EVENTS_CAPABILITY.UNAVAILABLE);
    }

    if (!shouldContinue()) {
      return { cancelled: true };
    }

    logger?.RUN?.('[waitForReportReady] WebSocket 未达终态，切换 report-status 短轮询', {
      reason: wsResult.reason,
    });
  }

  while (shouldContinue()) {
    try {
      const statusData = await strategy.pollReportStatus({
        assessmentId,
        testeeId,
      });

      onStatus?.(statusData);

      if (strategy.isCompleted(statusData.status)) {
        return { statusData, source: 'report-status' };
      }

      if (strategy.isFailed(statusData.status)) {
        return { statusData, source: 'report-status', failed: true };
      }

      await sleep(resolvePollDelayMs(statusData));
    } catch (error) {
      if (String(error?.statusCode) === '429' || error?.code === '429') {
        logger?.WARN?.('[waitForReportReady] report-status 限流，退避重试');
        onStatus?.({
          status: 'processing',
          stage: 'queued',
          message: '请求过于频繁，稍后继续等待...',
          nextPollAfterMs: resolveRetryAfterMs(error),
        });
        await sleep(resolveRetryAfterMs(error));
        continue;
      }

      throw error;
    }
  }

  return { cancelled: true };
}
