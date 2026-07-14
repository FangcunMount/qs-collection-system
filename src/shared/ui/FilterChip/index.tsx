import React from "react";
import { Button, Text } from "@tarojs/components";

import type { DomainTone } from "../types";
import "./index.less";

export interface FilterChipProps {
  children: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  tone?: DomainTone;
  className?: string;
  onClick?: (event: unknown) => void;
}

const FilterChip = ({
  children,
  selected = false,
  disabled = false,
  tone = "medical",
  className = "",
  onClick,
}: FilterChipProps) => (
  <Button
    className={[
      "filter-chip",
      `filter-chip--${tone}`,
      selected ? "filter-chip--selected" : "",
      disabled ? "filter-chip--disabled" : "",
      className,
    ].filter(Boolean).join(" ")}
    disabled={disabled}
    hoverClass={disabled ? "none" : "filter-chip--pressed"}
    onClick={onClick}
  >
    <Text className="filter-chip__label">{children}</Text>
  </Button>
);

export default FilterChip;
