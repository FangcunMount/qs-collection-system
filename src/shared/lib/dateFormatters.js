/**
 * 日期格式化工具函数
 */
import moment from "moment";

/**
 * 格式化答卷填写时间
 * 今天显示：今天 HH:mm
 * 昨天显示：昨天 HH:mm
 * 当年显示：MM/DD
 * 其他显示：YYYY/MM/DD
 */
export const formatWriteTime = (time) => {
  if (!time) return '';
  
  const now = moment();
  const createTime = moment(time);
  
  // 今天
  if (createTime.isSame(now, 'day')) {
    return `今天 ${createTime.format('HH:mm')}`;
  }
  
  // 昨天
  if (createTime.isSame(now.clone().subtract(1, 'day'), 'day')) {
    return `昨天 ${createTime.format('HH:mm')}`;
  }
  
  // 当年，显示月-日
  if (createTime.isSame(now, 'year')) {
    return createTime.format('MM/DD');
  }

  // 不是当年，显示完整日期
  return createTime.format('YYYY/MM/DD');
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
    return moment(parsed).format('YYYY-MM-DD');
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
    return moment(parsed).format('MM-DD');
  } catch (e) {
    return String(dateStr).split('T')[0].split(' ')[0].slice(5).replace('/', '-');
  }
};

/**
 * 安全解析日期字符串，兼容 iOS
 * 将 "YYYY-MM-DD HH:mm:ss" 格式转换为 iOS 兼容的 "YYYY-MM-DDTHH:mm:ss" 格式
 * @param {string} dateStr - 日期字符串，格式如 "2025-12-26 13:22:49"
 * @returns {Date} Date 对象
 */
export const parseDateSafe = (dateStr) => {
  if (!dateStr) return new Date();
  
  try {
    // 如果已经是 ISO 格式或包含 T，直接使用
    if (dateStr.includes('T')) {
      return new Date(dateStr);
    }
    
    // 将 "YYYY-MM-DD HH:mm:ss" 转换为 "YYYY-MM-DDTHH:mm:ss"
    const isoFormat = dateStr.replace(' ', 'T');
    return new Date(isoFormat);
  } catch (e) {
    console.warn('日期解析失败:', dateStr, e);
    // 如果解析失败，尝试使用 moment
    try {
      return moment(dateStr).toDate();
    } catch (momentError) {
      console.warn('moment 解析也失败:', momentError);
      return new Date();
    }
  }
};
