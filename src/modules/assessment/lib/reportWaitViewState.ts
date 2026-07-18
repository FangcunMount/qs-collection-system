import type { ReportWaitPhase, ReportWaitViewModel } from "../types";

const DEFAULT_COPY: Record<ReportWaitPhase, { title: string; description: string }> = {
  processing: { title: "正在生成报告", description: "正在解析测评结果，请稍候。" },
  delayed: { title: "答卷已接收", description: "测评生成有所延迟，我们会继续等待。" },
  degraded: { title: "正在继续处理", description: "实时连接不可用，已切换为安全轮询。" },
  success: { title: "报告已生成", description: "即将为你打开报告。" },
  failure: { title: "报告生成失败", description: "请重试或返回测评记录稍后查看。" },
};

export const buildReportWaitViewModel = ({
  phase,
  message,
  stage,
}: {
  phase: ReportWaitPhase;
  message?: string;
  stage?: string;
}): ReportWaitViewModel => ({
  phase,
  title: DEFAULT_COPY[phase].title,
  description: message || DEFAULT_COPY[phase].description,
  stageLabel: stage ? `当前阶段：${stage}` : "",
  showAnimation: phase === "processing" || phase === "delayed" || phase === "degraded" || phase === "success",
  canRetry: phase === "failure",
});
