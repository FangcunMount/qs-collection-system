/**
 * 状态标签组件
 * 用于显示答卷状态、风险等级等
 */
import React from "react";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";

const STATUS_CONFIG = {
  abnormal: {
    icon: 'alert-circle',
    text: '结果异常',
    className: 'status-tag-abnormal',
  },
  normal: {
    icon: 'check-circle',
    text: '结果正常',
    className: 'status-tag-normal',
  },
  pending: {
    icon: 'clock',
    text: '待解读',
    className: 'status-tag-pending',
  },
  generating: {
    icon: 'reload',
    text: '报告生成中',
    className: 'status-tag-generating',
  },
  failed: {
    icon: 'close-circle',
    text: '解读失败',
    className: 'status-tag-failed',
  },
};

const StatusTag = ({ status, className = "" }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.normal;
  
  return (
    <View className={`status-tag ${config.className} ${className}`}>
      <AtIcon value={config.icon} size="12" />
      <Text className="status-tag-text">{config.text}</Text>
    </View>
  );
};

export default StatusTag;
