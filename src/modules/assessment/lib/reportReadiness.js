/** 当前 collection 契约中，仅 interpreted 报告允许读取正文。 */
export const isReportReadable = (status) => {
  return String(status || '').toLowerCase() === 'interpreted';
};

export function assertReportReadable(statusData = {}) {
  if (!isReportReadable(statusData.status)) {
    throw new Error(statusData.reason || statusData.message || '报告尚未生成，请稍后再试');
  }
  return statusData;
}
