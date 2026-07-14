import React from "react";
import type { ComponentProps } from "react";
import { Input, View } from "@tarojs/components";
import Icon from "../Icon";

import "./index.less";

type InputComponentProps = ComponentProps<typeof Input>;

export interface SearchBoxProps {
  placeholder?: string;
  value?: string;
  onInput?: InputComponentProps["onInput"];
  onConfirm?: InputComponentProps["onConfirm"];
  onFocus?: InputComponentProps["onFocus"];
  className?: string;
  iconColor?: string;
  iconSize?: number;
  disabled?: boolean;
}

const SearchBox = ({
  placeholder = "搜索...",
  value = "",
  onInput,
  onConfirm,
  onFocus,
  className = "",
  iconColor = "#66738E",
  iconSize = 18,
  disabled = false,
}: SearchBoxProps) => (
  <View className={`search-box ${disabled ? "search-box--disabled" : ""} ${className}`.trim()}>
    <Icon name="search" size={iconSize} color={iconColor} />
    <Input
      className="search-input"
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onInput={onInput}
      onConfirm={onConfirm}
      onFocus={onFocus}
    />
  </View>
);

export default SearchBox;
