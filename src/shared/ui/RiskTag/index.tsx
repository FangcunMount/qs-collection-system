import React from "react";
import { Text, View } from "@tarojs/components";

import { getRiskConfig } from "@/shared/lib/statusFormatters";
import "./index.less";

export type RiskLevel = "high" | "medium" | "low" | "normal";

export interface RiskTagProps {
  riskLevel?: RiskLevel | string | null;
  className?: string;
}

const RiskTag = ({ riskLevel, className = "" }: RiskTagProps) => {
  const config = getRiskConfig(riskLevel);

  return (
    <View className={`risk-tag ${config.className} ${className}`.trim()}>
      <Text className="risk-text">{config.label}</Text>
    </View>
  );
};

export default RiskTag;
