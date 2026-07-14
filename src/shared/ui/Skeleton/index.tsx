import React from "react";
import { TaroifySkeleton } from "../internal/taroify";

export interface SkeletonProps {
  rows?: number;
  title?: boolean;
  avatar?: boolean;
  className?: string;
}

const Skeleton = ({ rows = 3, title = true, avatar = false, className = "" }: SkeletonProps) => (
  <TaroifySkeleton className={className} row={rows} title={title} avatar={avatar} />
);

export default Skeleton;
