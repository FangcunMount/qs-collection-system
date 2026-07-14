import React from "react";
import { TaroifyEmpty } from "../internal/taroify";

export interface EmptyProps {
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const Empty = ({ description = "暂无内容", children, className = "" }: EmptyProps) => (
  <TaroifyEmpty className={className}>
    <TaroifyEmpty.Image />
    <TaroifyEmpty.Description>{description}</TaroifyEmpty.Description>
    {children}
  </TaroifyEmpty>
);

export default Empty;
