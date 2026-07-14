import React from "react";
import { Text, View } from "@tarojs/components";

import "./index.less";

export type RiskLevel = "high" | "medium" | "low" | "normal";

export interface RiskTagProps {
  riskLevel?: RiskLevel | string | null;
  className?: string;
}

const RISK_CONFIG: Record<RiskLevel, { label: string; className: string }> = {
  high: { label: "高风险", className: "risk-high" },
  medium: { label: "中风险", className: "risk-medium" },
  low: { label: "低风险", className: "risk-low" },
  normal: { label: "正常", className: "risk-normal" },
};

const RiskTag = ({ riskLevel, className = "" }: RiskTagProps) => {
  const normalized = String(riskLevel || "normal").toLowerCase() as RiskLevel;
  const config = RISK_CONFIG[normalized] || RISK_CONFIG.normal;

  return (
    <View className={`risk-tag ${config.className} ${className}`.trim()}>
      <Text className="risk-text">{config.label}</Text>
    </View>
  );
};

export default RiskTag;
