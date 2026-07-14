import React from "react";
import { View } from "@tarojs/components";

import type { DomainTone } from "../types";
import "./index.less";

export interface SurfaceCardProps {
  children: React.ReactNode;
  tone?: DomainTone;
  interactive?: boolean;
  className?: string;
  onClick?: (event: unknown) => void;
}

const SurfaceCard = ({
  children,
  tone = "neutral",
  interactive = false,
  className = "",
  onClick,
}: SurfaceCardProps) => {
  const clickable = interactive || Boolean(onClick);
  return (
    <View
      className={[
        "surface-card",
        `surface-card--${tone}`,
        clickable ? "surface-card--interactive" : "",
        className,
      ].filter(Boolean).join(" ")}
      hoverClass={clickable ? "surface-card--pressed" : "none"}
      onClick={onClick}
    >
      {children}
    </View>
  );
};

export default SurfaceCard;
