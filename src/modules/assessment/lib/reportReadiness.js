/** 已落库的报告可读取；列表 outcome 投影使用 evaluated，等待接口兼容 interpreted。 */
export const isReportReadable = (status) => {
  return ['evaluated', 'interpreted'].includes(String(status || '').toLowerCase());
};

export function assertReportReadable(statusData = {}) {
  if (!isReportReadable(statusData.status)) {
    throw new Error(statusData.reason || statusData.message || '报告尚未生成，请稍后再试');
  }
  return statusData;
}
