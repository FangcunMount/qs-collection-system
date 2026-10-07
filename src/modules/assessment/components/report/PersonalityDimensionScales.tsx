import React from "react";
import { Text, View } from "@tarojs/components";
import { resolvePersonalityDimensionScale } from "../../lib/personalityDimensionScale";
import type { PersonalityReportDimensionViewModel } from "../../types";
import "./PersonalityDimensionScales.less";

const comparableText = (value: string): string => value.replace(/\s+/g, "").toLowerCase();

export const PersonalityDimensionScale = ({
  dimension,
  outcomeCode,
}: {
  dimension: PersonalityReportDimensionViewModel;
  outcomeCode: string;
}) => {
  const scale = resolvePersonalityDimensionScale(dimension, outcomeCode);
  const fillStart = Math.min(scale.position, 50);
  const fillWidth = Math.abs(scale.position - 50);
  const leftActive = scale.hasValue && scale.leftPercent > scale.rightPercent;
  const rightActive = scale.hasValue && scale.rightPercent > scale.leftPercent;
  const balanced = scale.hasValue && scale.leftPercent === scale.rightPercent;
  const preferredPole = leftActive ? scale.left : scale.right;
  const preferredPercent = leftActive ? scale.leftPercent : scale.rightPercent;
  const pairCode = `${scale.left.code}${scale.right.code}`;
  const dimensionTitle = dimension.title && comparableText(dimension.title) !== comparableText(pairCode)
    ? dimension.title
    : "";

  return (
    <View className="pr-dimension-scale">
      <View className="pr-dimension-scale__summary">
        <View className="pr-dimension-scale__heading">
          <Text className="pr-dimension-scale__pair">{pairCode}</Text>
          {dimensionTitle ? <Text className="pr-dimension-scale__title">{dimensionTitle}</Text> : null}
        </View>
        {scale.hasValue ? (
          <Text className="pr-dimension-scale__result">
            {balanced ? "倾向均衡 · 50%" : `偏向 ${preferredPole.code} · ${preferredPercent}%`}
          </Text>
        ) : (
          <Text className="pr-dimension-scale__result pr-dimension-scale__result--empty">暂无数据</Text>
        )}
      </View>
      <View className="pr-dimension-scale__poles">
        <View className={`pr-dimension-pole pr-dimension-pole--left ${leftActive ? "pr-dimension-pole--active" : ""}`}>
          <View className="pr-dimension-pole__identity">
            <Text className="pr-dimension-pole__code">{scale.left.code}</Text>
            <Text className="pr-dimension-pole__label">{scale.left.label}</Text>
          </View>
        </View>
        <View className={`pr-dimension-pole pr-dimension-pole--right ${rightActive ? "pr-dimension-pole--active" : ""}`}>
          <View className="pr-dimension-pole__identity">
            <Text className="pr-dimension-pole__code">{scale.right.code}</Text>
            <Text className="pr-dimension-pole__label">{scale.right.label}</Text>
          </View>
        </View>
      </View>
      <View className={`pr-dimension-scale__track ${scale.hasValue ? "" : "pr-dimension-scale__track--empty"}`}>
        <View className="pr-dimension-scale__center" />
        {scale.hasValue ? (
          <>
            <View
              className="pr-dimension-scale__fill"
              style={{ left: `${fillStart}%`, width: `${fillWidth}%` }}
            />
            <View className="pr-dimension-scale__marker" style={{ left: `${scale.position}%` }} />
          </>
        ) : null}
      </View>
      {dimension.description ? <Text className="pr-dimension-scale__description">{dimension.description}</Text> : null}
    </View>
  );
};

export default function PersonalityDimensionScales({ dimensions, outcomeCode }: {
  dimensions: PersonalityReportDimensionViewModel[];
  outcomeCode: string;
}) {
  return <View className="pr-dimension-list">
    {dimensions.map((dimension, index) => <PersonalityDimensionScale
      key={dimension.factor_code || index} dimension={dimension} outcomeCode={outcomeCode}
    />)}
  </View>;
}
