/**
 * 日期格式化工具函数（原生 Date 实现，避免引入 moment）
 */

const pad = (num) => `${num}`.padStart(2, '0');

const toDate = (value) => {
  if (value instanceof Date) {
    return value;
  }
  return parseDateSafe(value);
};

const isSameDay = (a, b) => (
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate()
);

const isSameYear = (a, b) => a.getFullYear() === b.getFullYear();

const formatTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const formatMonthDay = (date) => `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;

const formatYearMonthDay = (date) => (
  `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`
);

const formatIsoDate = (date) => (
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
);

const formatMonthDayDash = (date) => `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * 格式化答卷填写时间
 * 今天显示：今天 HH:mm
 * 昨天显示：昨天 HH:mm
 * 当年显示：MM/DD
 * 其他显示：YYYY/MM/DD
 */
export const formatWriteTime = (time) => {
  if (!time) return '';

  const now = new Date();
  const createTime = toDate(time);

  if (Number.isNaN(createTime.getTime())) {
    return '';
  }

  if (isSameDay(createTime, now)) {
    return `今天 ${formatTime(createTime)}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(createTime, yesterday)) {
    return `昨天 ${formatTime(createTime)}`;
  }

  if (isSameYear(createTime, now)) {
    return formatMonthDay(createTime);
  }

  return formatYearMonthDay(createTime);
};

/**
 * 格式化日期（简单格式）
 */
export const formatSimpleDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parsed = parseDateSafe(dateStr);
    if (Number.isNaN(parsed.getTime())) {
      return String(dateStr).split('T')[0].split(' ')[0];
    }
    return formatIsoDate(parsed);
  } catch (e) {
    return dateStr;
  }
};

/**
 * 格式化图表日期标签
 * 图表 x 轴只展示月-日，避免时间字符串过长
 */
export const formatChartDateLabel = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parsed = parseDateSafe(dateStr);
    if (Number.isNaN(parsed.getTime())) {
      return String(dateStr).split('T')[0].split(' ')[0].slice(5).replace('/', '-');
    }
    return formatMonthDayDash(parsed);
  } catch (e) {
    return String(dateStr).split('T')[0].split(' ')[0].slice(5).replace('/', '-');
  }
};

/**
 * 安全解析日期字符串，兼容 iOS
 * 将 "YYYY-MM-DD HH:mm:ss" 格式转换为 iOS 兼容的 "YYYY-MM-DDTHH:mm:ss" 格式
 * @param {string|Date} dateStr - 日期字符串，格式如 "2025-12-26 13:22:49"
 * @returns {Date} Date 对象
 */
export const parseDateSafe = (dateStr) => {
  if (!dateStr) return new Date();

  if (dateStr instanceof Date) {
    return dateStr;
  }

  const raw = String(dateStr).trim();
  if (!raw) return new Date();

  try {
    if (raw.includes('T')) {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    const normalized = raw
      .replace(/\//g, '-')
      .replace(' ', 'T');
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (e) {
    console.warn('日期解析失败:', dateStr, e);
  }

  return new Date();
};
