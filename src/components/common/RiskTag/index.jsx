/**
 * 风险等级标签组件
 */
import React from "react";
import { View, Text } from "@tarojs/components";
import "./index.less";

const RISK_CONFIG = {
  high: {
    label: '高风险',
    className: 'risk-high',
  },
  medium: {
    label: '中风险',
    className: 'risk-medium',
  },
  low: {
    label: '低风险',
    className: 'risk-low',
  },
  normal: {
    label: '正常',
    className: 'risk-normal',
  },
};

const RiskTag = ({ riskLevel, className = "" }) => {
  const risk = riskLevel?.toLowerCase?.() || riskLevel;
  const config = RISK_CONFIG[risk] || RISK_CONFIG.normal;
  
  return (
    <View className={`risk-tag ${config.className} ${className}`}>
      <Text className="risk-text">{config.label}</Text>
    </View>
  );
};

export default RiskTag;

