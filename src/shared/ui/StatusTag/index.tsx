import React from "react";
import { Text, View } from "@tarojs/components";
import Icon from "../Icon";
import type { IconName } from "../Icon";

import "./index.less";

export type StatusTagStatus = "abnormal" | "normal" | "pending" | "generating" | "failed";

export interface StatusTagProps {
  status?: StatusTagStatus | string | null;
  className?: string;
}

const STATUS_CONFIG: Record<StatusTagStatus, {
  icon: IconName;
  text: string;
  className: string;
}> = {
  abnormal: { icon: "warning", text: "结果异常", className: "status-tag-abnormal" },
  normal: { icon: "success", text: "结果正常", className: "status-tag-normal" },
  pending: { icon: "clock", text: "待解读", className: "status-tag-pending" },
  generating: { icon: "refresh", text: "报告生成中", className: "status-tag-generating" },
  failed: { icon: "error", text: "解读失败", className: "status-tag-failed" },
};

const StatusTag = ({ status, className = "" }: StatusTagProps) => {
  const normalized = String(status || "normal").toLowerCase() as StatusTagStatus;
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.normal;

  return (
    <View className={`status-tag ${config.className} ${className}`.trim()}>
      <Icon name={config.icon} size={12} />
      <Text className="status-tag-text">{config.text}</Text>
    </View>
  );
};

export default StatusTag;
