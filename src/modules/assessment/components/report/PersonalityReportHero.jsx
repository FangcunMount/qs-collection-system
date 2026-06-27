import React from "react";
import { View, Text } from "@tarojs/components";
import "./PersonalityReportHero.less";

const PersonalityReportHero = ({ modelExtra = {}, conclusion = "", modelTitle = "" }) => {
  const typeCode = modelExtra.type_code || modelExtra.typeCode || "";
  const tagline = modelExtra.tagline || modelExtra.one_liner || modelExtra.summary || "";
  const rarity = modelExtra.rarity || modelExtra.rarity_label || "";
  const nickname = modelExtra.nickname || modelExtra.type_name || "";
  const heroTitle = typeCode || nickname || "人格画像";

  return (
    <View className="personality-report-hero">
      <View className="personality-report-hero__badge">
        <Text>{modelTitle || "人格类型"}</Text>
      </View>

      <Text className="personality-report-hero__type">{heroTitle}</Text>

      {typeCode && nickname ? (
        <Text className="personality-report-hero__nickname">{nickname}</Text>
      ) : null}

      {tagline ? (
        <Text className="personality-report-hero__tagline">{tagline}</Text>
      ) : null}

      {conclusion ? (
        <View className="personality-report-hero__conclusion">
          <Text>{conclusion}</Text>
        </View>
      ) : null}

      {rarity ? (
        <View className="personality-report-hero__rarity">
          <Text>人群占比 {rarity}</Text>
        </View>
      ) : null}
    </View>
  );
};

export default PersonalityReportHero;
