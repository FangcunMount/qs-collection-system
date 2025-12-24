/**
 * 通用搜索框组件
 */
import React from "react";
import { View, Input } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import "./index.less";

const SearchBox = ({
  placeholder = "搜索...",
  value = "",
  onInput,
  onConfirm,
  onFocus,
  className = "",
  iconColor = "#9CA3AF",
  iconSize = 18
}) => {
  return (
    <View className={`search-box ${className}`}>
      <AtIcon value="search" size={iconSize} color={iconColor} />
      <Input
        className="search-input"
        placeholder={placeholder}
        value={value}
        onInput={onInput}
        onConfirm={onConfirm}
        onFocus={onFocus}
      />
    </View>
  );
};

export default SearchBox;

