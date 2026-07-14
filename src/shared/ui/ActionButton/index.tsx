import React from "react";
import { Text, View } from "@tarojs/components";

import type { ActionButtonProps } from "../types";
import { TaroifyButton } from "../internal/taroify";
import "./index.less";

const ActionButton = ({
  children,
  variant = "primary",
  tone = "medical",
  block = false,
  disabled = false,
  loading = false,
  className = "",
  formType,
  openType,
  onClick,
}: ActionButtonProps) => {
  const unavailable = disabled || loading;
  return (
    <TaroifyButton
      className={[
        "action-button",
        `action-button--${variant}`,
        `action-button--${tone}`,
        block ? "action-button--block" : "",
        unavailable ? "action-button--disabled" : "",
        className,
      ].filter(Boolean).join(" ")}
      disabled={unavailable}
      loading={loading}
      formType={formType}
      openType={openType as never}
      hoverClass={unavailable ? "none" : "action-button--pressed"}
      variant="contained"
      size="medium"
      block={block}
      onClick={onClick}
    >
      <View className="action-button__content">
        <Text className="action-button__label">{children}</Text>
      </View>
    </TaroifyButton>
  );
};

export default ActionButton;
