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
    return dateStr.split('T')[0];
  } catch (e) {
    return dateStr;
  }
};

