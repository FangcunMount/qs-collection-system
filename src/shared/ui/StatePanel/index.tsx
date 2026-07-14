import React from "react";
import { Text, View } from "@tarojs/components";

import ActionButton from "../ActionButton";
import Loading from "../Loading";
import type { StatePanelProps } from "../types";
import "./index.less";

const DEFAULT_COPY = {
  loading: {
    title: "正在加载",
    description: "请稍候，我们正在准备内容。",
    symbol: "",
  },
  empty: {
    title: "暂无内容",
    description: "当前还没有可展示的数据。",
    symbol: "◇",
  },
  error: {
    title: "加载失败",
    description: "网络似乎开小差了，请稍后重试。",
    symbol: "!",
  },
} as const;

const StatePanel = ({
  state,
  title,
  description,
  actionText,
  onAction,
  tone = "neutral",
  compact = false,
  className = "",
  illustration,
}: StatePanelProps) => {
  const copy = DEFAULT_COPY[state];
  return (
    <View
      className={[
        "state-panel",
        `state-panel--${state}`,
        `state-panel--${tone}`,
        compact ? "state-panel--compact" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      <View className="state-panel__visual">
        {illustration || (state === "loading" ? (
          <Loading size={36} />
        ) : (
          <Text className="state-panel__symbol">{copy.symbol}</Text>
        ))}
      </View>
      <Text className="state-panel__title">{title || copy.title}</Text>
      <Text className="state-panel__description">{description || copy.description}</Text>
      {actionText && onAction ? (
        <ActionButton
          variant="secondary"
          tone={tone}
          className="state-panel__action"
          onClick={onAction}
        >
          {actionText}
        </ActionButton>
      ) : null}
    </View>
  );
};

export default StatePanel;
