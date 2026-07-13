import Taro from '@tarojs/taro';

import config from '@/config';
import sessionManager from '@/services/auth/sessionManager';
import { getAccessToken } from '@/store/tokenStore';
import { normalizeReportStatus } from '@/services/api/personality/mappers';

const RECOVERABLE_WS_ERROR_CODES = new Set([
  'forbidden',
  'rate_limited',
  'capacity_exhausted',
]);

const REPORT_EVENTS_CAPABILITY = Object.freeze({
  UNKNOWN: 'unknown',
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
});

const capabilityByHost = new Map();

const normalizeCapabilityHost = (collectionHost = config.collectionHost) => {
  return String(collectionHost || '').replace(/\/$/, '');
};

export const getReportEventsCapability = (collectionHost = config.collectionHost) => {
  return capabilityByHost.get(normalizeCapabilityHost(collectionHost)) || REPORT_EVENTS_CAPABILITY.UNKNOWN;
};

export const setReportEventsCapability = (capability, collectionHost = config.collectionHost) => {
  capabilityByHost.set(normalizeCapabilityHost(collectionHost), capability);
};

export const resetReportEventsCapability = () => {
  capabilityByHost.clear();
};

const isReportEventsUnavailable = (error = {}) => {
  const code = String(error?.statusCode ?? error?.code ?? '');
  const message = String(error?.errMsg ?? error?.message ?? '').toLowerCase();
  return code === '404' || /(^|\D)404(\D|$)/.test(message);
};

export const buildReportEventsUrl = (collectionHost = config.collectionHost) => {
  const trimmed = normalizeCapabilityHost(collectionHost);
  return `${trimmed.replace(/^http/i, 'ws')}/report-events`;
};

const parseStatusFrame = (frame = {}) => {
  if (frame.op === 'status' && frame.data) {
    return normalizeReportStatus(frame.data);
  }

  if (frame.op === 'subscribed' && frame.data?.status) {
    return normalizeReportStatus(frame.data);
  }

  return null;
};

const isTerminalReportStatus = (status) => {
  return ['interpreted', 'failed'].includes(String(status || '').toLowerCase());
};

/**
 * 通过 WebSocket 订阅报告状态（文档 12 §4）。
 * 订阅帧要求 assessment_id、testee_id、kind 均已就绪。
 */
export function watchReportViaWebSocket({
  assessmentId,
  testeeId,
  kind,
  onStatus,
  shouldContinue = () => true,
  firstStatusTimeoutMs = 15000,
  logger = console,
  collectionHost = config.collectionHost,
  connectSocket = Taro.connectSocket,
  getToken = getAccessToken,
  ensureAccessToken = sessionManager.ensureValidAccessToken,
}) {
  return new Promise((resolve) => {
    let settled = false;
    let socketTask = null;
    let firstStatusTimer = null;
    let receivedStatus = false;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      if (firstStatusTimer) {
        clearTimeout(firstStatusTimer);
        firstStatusTimer = null;
      }
      try {
        socketTask?.close({});
      } catch (_) {
        // ignore close errors
      }
      resolve(result);
    };

    const handleStatus = (statusData) => {
      if (!statusData || !shouldContinue()) {
        return;
      }

      receivedStatus = true;
      if (firstStatusTimer) {
        clearTimeout(firstStatusTimer);
        firstStatusTimer = null;
      }

      onStatus?.(statusData);

      if (isTerminalReportStatus(statusData.status)) {
        finish({
          completed: true,
          shouldFallback: false,
          statusData,
        });
      }
    };

    const handleRecoverableFailure = (reason, error) => {
      logger?.WARN?.('[ReportEvents] WebSocket 不可用，降级短轮询', { reason });
      finish({
        completed: false,
        shouldFallback: true,
        reason,
        unavailable: isReportEventsUnavailable(error),
      });
    };

    const startFirstStatusTimer = () => {
      if (firstStatusTimer || receivedStatus) {
        return;
      }
      firstStatusTimer = setTimeout(() => {
        if (!receivedStatus) {
          handleRecoverableFailure('first_status_timeout');
        }
      }, firstStatusTimeoutMs);
    };

    if (!assessmentId) {
      handleRecoverableFailure('missing_assessment_id');
      return;
    }

    (async () => {
      let token = getToken();
      if (!token) {
        try {
          token = await ensureAccessToken({ allowInteractiveLogin: true });
        } catch (error) {
          handleRecoverableFailure(error?.reason || 'no_token');
          return;
        }
      }

      if (!token) {
        handleRecoverableFailure('no_token');
        return;
      }

      const url = buildReportEventsUrl(collectionHost);

      try {
        socketTask = await connectSocket({
          url,
          header: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        handleRecoverableFailure('connect_failed', error);
        return;
      }

      socketTask.onOpen(() => {
        if (!shouldContinue()) {
          finish({ completed: false, shouldFallback: true, reason: 'cancelled' });
          return;
        }

        socketTask.send({
          data: JSON.stringify({
            op: 'subscribe',
            assessment_id: String(assessmentId),
            testee_id: String(testeeId),
            kind,
          }),
        });
        setReportEventsCapability(REPORT_EVENTS_CAPABILITY.AVAILABLE, collectionHost);
        startFirstStatusTimer();
      });

      socketTask.onMessage((message) => {
        if (!shouldContinue()) {
          finish({ completed: false, shouldFallback: true, reason: 'cancelled' });
          return;
        }

        let frame;
        try {
          frame = JSON.parse(message.data);
        } catch (_) {
          return;
        }

        if (frame.op === 'error') {
          const code = String(frame.code || frame.data?.code || 'error');
          if (code === 'already_subscribed') {
            return;
          }
          if (RECOVERABLE_WS_ERROR_CODES.has(code)) {
            handleRecoverableFailure(code);
            return;
          }
          handleRecoverableFailure(code);
          return;
        }

        const statusData = parseStatusFrame(frame);
        if (statusData) {
          handleStatus(statusData);
        }
      });

      socketTask.onError((error) => {
        if (!settled) {
          handleRecoverableFailure('socket_error', error);
        }
      });

      socketTask.onClose(() => {
        if (!settled) {
          if (receivedStatus && shouldContinue()) {
            handleRecoverableFailure('socket_closed');
            return;
          }
          handleRecoverableFailure('socket_closed');
        }
      });
    })();
  });
}

export { REPORT_EVENTS_CAPABILITY };
