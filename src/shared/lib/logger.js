import Taro from "@tarojs/taro";
import { safeLogMetadata } from './logMetadata';

const { miniProgram: { version } } = Taro.getAccountInfoSync();
const VERSION = version ?? "0.0.0";
const logger = Taro.canIUse("getLogManager") ? Taro.getLogManager({ level: 0 }) : null;
const realtimeLogger = Taro.getRealtimeLogManager ? Taro.getRealtimeLogManager() : null;

// The first argument is a static source event label. All remaining data is allowlisted.
function emit(level, file, args) {
  const event = typeof args[0] === 'string' ? args[0].slice(0, 160) : 'event';
  const metadata = safeLogMetadata(typeof args[0] === 'string' ? args.slice(1) : args);
  const output = [`[${VERSION}]`, file, event, metadata];
  const sinks = [
    [console, level === 'info' ? 'log' : level],
    [logger, level === 'info' ? 'log' : level === 'error' ? 'debug' : 'warn'],
    [realtimeLogger, level],
  ];
  sinks.forEach(([sink, method]) => {
    try { sink?.[method]?.(...output); } catch (_) { /* A failed log sink is not a business failure. */ }
  });
}
export function RUN(file, ...args) { emit('info', file, args); }
export function WARN(file, ...args) { emit('warn', file, args); }
export function ERROR(file, ...args) { emit('error', file, args); }
export function getLogger(fileName) {
  return { RUN: (...args) => RUN(fileName, ...args), WARN: (...args) => WARN(fileName, ...args), ERROR: (...args) => ERROR(fileName, ...args) };
}
export default { RUN, WARN, ERROR, getLogger };
