import React from "react";
import { Text, View } from "@tarojs/components";

import { formatSimpleDate } from "@/shared/lib/dateFormatters";
import { getRiskConfig } from "@/shared/lib/statusFormatters";

import type { MedicalReportViewModel } from "../../types";

interface MedicalReportOverviewProps {
  report: MedicalReportViewModel;
}

const MedicalReportOverview = ({ report }: MedicalReportOverviewProps) => {
  const risk = getRiskConfig(report.riskLevel || "normal");
  const firstSuggestion = report.suggestions[0]?.content || "";
  return (
    <View className="report-overview-card">
      <View className="report-header">
        <Text className="report-title">{report.scaleName || "量表测评报告"}</Text>
        {report.testeeName ? <Text className="report-testee">{report.testeeName}</Text> : null}
      </View>
      {report.createdAt ? (
        <View className="report-context">
          <Text className="report-context__text">生成时间 · {formatSimpleDate(report.createdAt)}</Text>
        </View>
      ) : null}
      <View className="score-display-area" style={{ background: risk.scoreBadgeBg || undefined }}>
        <View className="score-number" style={{ color: risk.scoreBadgeColor || undefined }}>
          <Text className="score-main">{report.total?.score ?? 0}</Text>
          <Text className="score-unit">分</Text>
        </View>
        <View className="risk-level-badge" style={{ backgroundColor: "#FFFFFF", color: risk.scoreBadgeColor || "#F97316" }}>
          <Text className="risk-level-text">
            {risk.label}{report.total?.content ? `:${report.total.content}` : ""}
          </Text>
        </View>
        {firstSuggestion ? (
          <View className="suggestion-section">
            <Text className="suggestion-content-text">{firstSuggestion}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default MedicalReportOverview;
