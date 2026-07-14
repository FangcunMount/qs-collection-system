import React from "react";
import { View } from "@tarojs/components";

import "./index.less";

export interface BottomActionBarProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}

const BottomActionBar = ({
  children,
  className = "",
  elevated = true,
}: BottomActionBarProps) => (
  <View
    className={[
      "bottom-action-bar",
      elevated ? "bottom-action-bar--elevated" : "",
      className,
    ].filter(Boolean).join(" ")}
  >
    <View className="bottom-action-bar__content">{children}</View>
  </View>
);

export default BottomActionBar;

