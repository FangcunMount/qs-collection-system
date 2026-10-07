/** Logging is an allowlist, not a redaction blacklist. Never traverse business payloads. */
const numberFields = new Set([
  'statusCode', 'elapsedMs', 'retryAfterMs', 'delayMs', 'attempt', 'limit', 'count',
  'answerCount', 'answersCount', 'questionsCount', 'authRetryCount', 'qpsRetryCount',
]);
const booleanFields = new Set(['hasToken', 'hasAuthorizationHeader', 'needToken', 'shouldHandleAuth']);
const identityFields = new Set([
  'requestId', 'idempotencyKey', 'assessmentId', 'answersheetId',
  'questionnaireCode', 'questionnaireVersion', 'modelCode', 'executionId', 'invocationId',
]);
const statuses = new Set(['pending', 'accepted', 'ready', 'completed', 'failed', 'canceled', 'blocked', 'success', 'unknown', 'no_assessment_required']);
const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const errorCodes = new Set(['REQUEST_CANCELLED', 'SESSION_EXPIRED', 'UNREGISTERED', 'NETWORK_ERROR']);
const allowedFields = [...numberFields, ...booleanFields, ...identityFields, 'method', 'status', 'code'];

export function safeLogMetadata(values = []) {
  const result = {};
  for (const value of values) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    try {
      if (value instanceof Error) {
        // Classify built-in errors without reading a potentially overridden name getter.
        result.errorClass = [TypeError, RangeError, SyntaxError, URIError, ReferenceError]
          .find(Type => value instanceof Type)?.name || 'Error';
      }
      // Inspect only allowed keys. Enumerating an Error's lazy stack can execute name getters.
      for (const key of allowedFields) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor) continue;
        // Do not execute getters or retain object references at the log boundary.
        if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) continue;
        const field = descriptor.value;
        if (numberFields.has(key) && typeof field === 'number' && Number.isFinite(field) && field >= 0) result[key] = field;
        else if (booleanFields.has(key) && typeof field === 'boolean') result[key] = field;
        else if (identityFields.has(key) && typeof field === 'string' && /^[A-Za-z0-9_.:-]{1,96}$/.test(field)) result[key] = field;
        else if (key === 'method' && methods.has(field)) result[key] = field;
        else if (key === 'status' && statuses.has(field)) result[key] = field;
        else if (key === 'code' && (((typeof field === 'number' || typeof field === 'string') && /^-?\d{1,6}$/.test(String(field))) || errorCodes.has(field))) result[key] = String(field);
      }
    } catch (_) { /* Logging must not interfere with the business operation. */ }
  }
  return result;
}
