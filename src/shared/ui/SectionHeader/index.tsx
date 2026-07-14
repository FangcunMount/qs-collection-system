import React from "react";
import { Text, View } from "@tarojs/components";

import type { DomainTone } from "../types";
import "./index.less";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: DomainTone;
  className?: string;
}

const SectionHeader = ({
  title,
  description,
  actionLabel,
  onAction,
  tone = "neutral",
  className = "",
}: SectionHeaderProps) => (
  <View className={`section-header section-header--${tone} ${className}`.trim()}>
    <View className="section-header__copy">
      <Text className="section-header__title">{title}</Text>
      {description ? (
        <Text className="section-header__description">{description}</Text>
      ) : null}
    </View>
    {actionLabel && onAction ? (
      <View
        className="section-header__action"
        hoverClass="section-header__action--pressed"
        onClick={onAction}
      >
        <Text className="section-header__action-label">{actionLabel}</Text>
        <Text className="section-header__action-arrow">›</Text>
      </View>
    ) : null}
  </View>
);

export default SectionHeader;
