import React from "react";
import { TaroifyLoading } from "../internal/taroify";

export interface LoadingProps {
  size?: number | string;
  color?: string;
  vertical?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const Loading = ({ size = 28, color, vertical = false, children, className = "" }: LoadingProps) => (
  <TaroifyLoading
    size={size}
    direction={vertical ? "vertical" : "horizontal"}
    className={className}
    style={color ? { color } : undefined}
  >
    {children}
  </TaroifyLoading>
);

export default Loading;
