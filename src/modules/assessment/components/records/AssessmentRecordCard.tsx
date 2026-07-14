import React from "react";
import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";

import ActionButton from "@/shared/ui/ActionButton";
import RiskTag from "@/shared/ui/RiskTag";
import StatusTag from "@/shared/ui/StatusTag";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { routes } from "@/shared/config/routes";
import { formatWriteTime } from "@/shared/lib/dateFormatters";

import type { AssessmentRecordViewModel } from "../../types";
import "./AssessmentRecordCard.less";

interface AssessmentRecordCardProps {
  record: AssessmentRecordViewModel;
  testeeId?: string;
}

const AssessmentRecordCard = ({ record, testeeId = "" }: AssessmentRecordCardProps) => {
  const openResponse = () => {
    if (!record.answerSheetId) {
      Taro.showToast({ title: "答卷信息不存在", icon: "none" });
      return;
    }
    Taro.navigateTo({ url: routes.assessmentResponse({ a: record.answerSheetId }) });
  };

  const openReport = () => {
    if (!record.answerSheetId) {
      Taro.showToast({ title: "答卷信息不存在", icon: "none" });
      return;
    }
    const reportRoute = record.assessmentKind === "personality"
      ? routes.personalityReport
      : routes.assessmentReport;
    Taro.navigateTo({
      url: reportRoute({
        a: record.answerSheetId,
        aid: record.id || undefined,
        t: testeeId || undefined,
        kind: record.assessmentKind === "medical" ? undefined : record.assessmentKind,
      }),
    });
  };

  const openTrend = () => {
    if (!record.id || !testeeId) {
      Taro.showToast({ title: "趋势参数不完整", icon: "none" });
      return;
    }
    Taro.navigateTo({ url: routes.assessmentReportTrend({ aid: record.id, t: testeeId }) });
  };

  const scoreText = (() => {
    if (record.status === "pending") return "待解读";
    if (record.status === "generating") return "分析中…";
    if (record.status === "failed") return "解读失败";
    if (record.reportReadable && record.score != null) return `总分 ${record.score}`;
    return record.reportReadable ? "已完成" : "";
  })();

  return (
    <SurfaceCard tone={record.tone} className="record-card">
      <View className="record-card__header">
        <View className="record-card__heading">
          <Text className="record-card__title">{record.title}</Text>
          {record.description ? <Text className="record-card__code">{record.description}</Text> : null}
          {record.answerSheetId ? (
            <Text className="record-card__answer-id">答卷 ID · {record.answerSheetId}</Text>
          ) : null}
        </View>
        <Text className="record-card__time">{formatWriteTime(record.createdAt)}</Text>
      </View>
      <View className="record-card__tags">
        <StatusTag status={record.status} />
        {record.riskLevel && record.reportReadable ? <RiskTag riskLevel={record.riskLevel} /> : null}
      </View>
      <View className="record-card__footer">
        <Text className={`record-card__score record-card__score--${record.status}`}>{scoreText}</Text>
        <View className="record-card__actions">
          {record.status === "generating" ? (
            <ActionButton variant="secondary" tone={record.tone} disabled>报告生成中</ActionButton>
          ) : (
            <ActionButton variant="secondary" tone={record.tone} onClick={openResponse}>查看详情</ActionButton>
          )}
          {record.reportReadable && record.showTrendAction ? (
            <ActionButton variant="ghost" tone={record.tone} onClick={openTrend}>查看趋势</ActionButton>
          ) : null}
          {record.reportReadable ? (
            <ActionButton tone={record.tone} onClick={openReport}>查看报告</ActionButton>
          ) : null}
        </View>
      </View>
    </SurfaceCard>
  );
};

export default AssessmentRecordCard;
