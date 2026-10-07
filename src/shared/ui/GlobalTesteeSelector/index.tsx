import React, { useEffect, useState } from "react";
import { Picker, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { getTesteeStoreState, setSelectedTesteeId, subscribeTesteeStore } from "@/shared/stores/testees";
import type { TesteeStoreState } from "@/store/testeeStore";
import { routes } from "@/shared/config/routes";
import Icon from "../Icon";
import "./index.less";

// This component only selects from the account's existing store. Pages keep
// ownership of loading and errors; opening a selector never starts a request.
export default function GlobalTesteeSelector() {
  const [state, setState] = useState<TesteeStoreState>(() => getTesteeStoreState());
  useEffect(() => subscribeTesteeStore(setState), []);
  const selected = state.testeeList.find(member => member.id === state.selectedTesteeId);
  const needsChoice = !selected;
  const range = [
    ...(needsChoice ? ["请选择受试者"] : []),
    ...state.testeeList.map(member => member.legalName || "未命名成员"),
    "添加 / 管理家庭成员",
  ];
  const content = <View className="global-testee-selector" role="button" aria-label="全局受试者选择" hoverClass="global-testee-selector--pressed">
    <View className="global-testee-selector__icon"><Icon name="user" size={22} /></View>
    <View className="global-testee-selector__identity">
      <Text className="global-testee-selector__label">当前受试者 · 全局生效</Text>
      <Text className="global-testee-selector__name">{selected?.legalName || (selected ? "未命名成员" : "选择受试者")}</Text>
    </View>
    <Text className="global-testee-selector__action">{state.testeeList.length ? "切换 ⌄" : "管理 ›"}</Text>
  </View>;
  if (!state.testeeList.length) return <View className="global-testee-selector-wrap" onClick={() => Taro.navigateTo({ url: routes.testeeList() })}>{content}</View>;
  return <Picker className="global-testee-selector-wrap" mode="selector" range={range}
    value={selected ? state.testeeList.findIndex(member => member.id === selected.id) : 0}
    onChange={event => {
      const index = Number(event.detail.value);
      if (!Number.isInteger(index) || index < 0 || index >= range.length || (needsChoice && index === 0)) return;
      const member = state.testeeList[index - (needsChoice ? 1 : 0)];
      if (member) setSelectedTesteeId(member.id);
      else Taro.navigateTo({ url: routes.testeeList() });
    }}>{content}</Picker>;
}
