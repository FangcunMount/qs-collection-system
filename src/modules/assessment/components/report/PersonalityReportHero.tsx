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

const comparableText = (value: string): string => value
  .replace(/\s+/g, "")
  .toLowerCase();

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
  const identity = [typeCode, nickname].filter(Boolean).join(" ");
  const showConclusion = Boolean(
    conclusion
      && comparableText(conclusion) !== comparableText(identity)
      && comparableText(conclusion) !== comparableText(heroTitle),
  );

  return (
    <View className="personality-report-hero">
      <View className="personality-report-hero__topline">
        <View className="personality-report-hero__badge">
          <Text>{modelTitle || "人格类型"}</Text>
        </View>
        {rarity ? <Text className="personality-report-hero__rarity">人群占比 {rarity}</Text> : null}
      </View>
      <View className="personality-report-hero__identity">
        <Text className="personality-report-hero__type">{heroTitle}</Text>
        {typeCode && nickname ? <Text className="personality-report-hero__nickname">{nickname}</Text> : null}
      </View>
      {tagline ? <Text className="personality-report-hero__tagline">{tagline}</Text> : null}
      {showConclusion ? <View className="personality-report-hero__conclusion"><Text>{conclusion}</Text></View> : null}
    </View>
  );
};

export default PersonalityReportHero;
