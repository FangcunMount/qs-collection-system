import React from "react";
import { Text, View } from "@tarojs/components";

import "./PersonalityReportHero.less";

type ModelExtra = Record<string, unknown>;

interface PersonalityReportHeroProps {
  modelExtra?: ModelExtra;
  conclusion?: string;
  modelTitle?: string;
}

const text = (value: unknown): string => (
  value === undefined || value === null ? "" : String(value)
);

const PersonalityReportHero = ({
  modelExtra = {},
  conclusion = "",
  modelTitle = "",
}: PersonalityReportHeroProps) => {
  const typeCode = text(modelExtra.type_code || modelExtra.typeCode);
  const tagline = text(modelExtra.tagline || modelExtra.one_liner || modelExtra.summary);
  const rarityValue = modelExtra.rarity || modelExtra.rarity_label;
  const raritySource = rarityValue && typeof rarityValue === "object"
    ? rarityValue as Record<string, unknown>
    : null;
  const rarity = raritySource
    ? text(raritySource.label || (raritySource.percent != null ? `${raritySource.percent}%` : ""))
    : text(rarityValue);
  const nickname = text(modelExtra.nickname || modelExtra.type_name);
  const heroTitle = typeCode || nickname || "人格画像";

  return (
    <View className="personality-report-hero">
      <View className="personality-report-hero__badge">
        <Text>{modelTitle || "人格类型"}</Text>
      </View>
      <Text className="personality-report-hero__type">{heroTitle}</Text>
      {typeCode && nickname ? <Text className="personality-report-hero__nickname">{nickname}</Text> : null}
      {tagline ? <Text className="personality-report-hero__tagline">{tagline}</Text> : null}
      {conclusion ? <View className="personality-report-hero__conclusion"><Text>{conclusion}</Text></View> : null}
      {rarity ? <View className="personality-report-hero__rarity"><Text>人群占比 {rarity}</Text></View> : null}
    </View>
  );
};

export default PersonalityReportHero;
