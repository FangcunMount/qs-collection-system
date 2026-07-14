import React from "react";
import { Text, View } from "@tarojs/components";
import { AtIcon } from "taro-ui";

import "./index.less";

export type StatusTagStatus = "abnormal" | "normal" | "pending" | "generating" | "failed";

export interface StatusTagProps {
  status?: StatusTagStatus | string | null;
  className?: string;
}

const STATUS_CONFIG: Record<StatusTagStatus, {
  icon: string;
  text: string;
  className: string;
}> = {
  abnormal: { icon: "alert-circle", text: "结果异常", className: "status-tag-abnormal" },
  normal: { icon: "check-circle", text: "结果正常", className: "status-tag-normal" },
  pending: { icon: "clock", text: "待解读", className: "status-tag-pending" },
  generating: { icon: "reload", text: "报告生成中", className: "status-tag-generating" },
  failed: { icon: "close-circle", text: "解读失败", className: "status-tag-failed" },
};

const StatusTag = ({ status, className = "" }: StatusTagProps) => {
  const normalized = String(status || "normal").toLowerCase() as StatusTagStatus;
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.normal;

  return (
    <View className={`status-tag ${config.className} ${className}`.trim()}>
      <AtIcon value={config.icon} size="12" />
      <Text className="status-tag-text">{config.text}</Text>
    </View>
  );
};

export default StatusTag;
