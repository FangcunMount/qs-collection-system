import React, { useState } from "react";
import { Image, Text, View } from "@tarojs/components";

import "./PersonalityReportHero.less";

type ModelExtra = Record<string, unknown>;

interface PersonalityReportHeroProps {
  modelExtra?: ModelExtra;
  conclusion?: string;
  modelTitle?: string;
  imageUrl?: string;
  testeeName?: string;
  createdAtText?: string;
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
  imageUrl = "",
  testeeName = "",
  createdAtText = "",
}: PersonalityReportHeroProps) => {
  const [failedImageUrl, setFailedImageUrl] = useState("");
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
  const showImage = Boolean(imageUrl && imageUrl !== failedImageUrl);

  return (
    <View className={`personality-report-hero ${showImage ? "personality-report-hero--with-image" : "personality-report-hero--text-only"}`}>
      <View className="personality-report-hero__topline">
        <Text className="personality-report-hero__eyebrow">人格报告总览</Text>
        {rarity ? <Text className="personality-report-hero__rarity">人群占比 {rarity}</Text> : null}
      </View>
      <View className="personality-report-hero__body">
        <View className="personality-report-hero__copy">
          <Text className="personality-report-hero__model">{modelTitle || "人格类型"}</Text>
          <View className="personality-report-hero__identity">
            <Text className="personality-report-hero__type">{heroTitle}</Text>
            {typeCode && nickname ? <Text className="personality-report-hero__nickname">{nickname}</Text> : null}
          </View>
          {tagline ? <Text className="personality-report-hero__tagline">{tagline}</Text> : null}
        </View>
        {showImage ? (
          <View className="personality-report-hero__visual">
            <Image
              className="personality-report-hero__image"
              src={imageUrl}
              mode="aspectFit"
              lazyLoad
              onError={() => setFailedImageUrl(imageUrl)}
            />
          </View>
        ) : null}
      </View>
      {showConclusion ? <View className="personality-report-hero__conclusion"><Text>{conclusion}</Text></View> : null}
      {testeeName || createdAtText ? (
        <View className="personality-report-hero__meta">
          {testeeName ? <Text className="personality-report-hero__testee">{testeeName}</Text> : null}
          {createdAtText ? <Text className="personality-report-hero__time">生成于 {createdAtText}</Text> : null}
        </View>
      ) : null}
    </View>
  );
};

export default PersonalityReportHero;
