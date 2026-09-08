import React from "react";
import { Text, View } from "@tarojs/components";
import Icon from "@/shared/ui/Icon";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { SCALE_COMMON_CATEGORIES } from "@/shared/config/scaleCatalogHome";
import type { CatalogCardViewModel } from "../viewModels/catalogCard";
import CatalogAssessmentFacts from "./CatalogAssessmentFacts";
import "./MedicalScaleCard.less";

export default function MedicalScaleCard({ card, onSelect, className = "", compact = false }: {
  card: CatalogCardViewModel; onSelect: () => void; className?: string; compact?: boolean;
}) {
  const category = SCALE_COMMON_CATEGORIES.find(item => item.value === card.category)?.title;
  return <SurfaceCard className={className} interactive={!card.disabled} onClick={card.disabled ? undefined : onSelect}>
    <View className={`medical-scale-card ${compact ? "medical-scale-card--compact" : ""} ${card.disabled ? "medical-scale-card--disabled" : ""}`}>
      {category ? <Text className="medical-scale-card__category">{category}</Text> : null}
      <Text className="medical-scale-card__title">{card.title}</Text>
      {card.description ? <Text className="medical-scale-card__description">{card.description}</Text> : null}
      <View className="medical-scale-card__footer">
        <View className="medical-scale-card__facts">
          <CatalogAssessmentFacts card={card} />
          {!card.audienceLabel && !card.reporterLabel ? <Text className="medical-scale-card__note">请结合量表说明确认填写要求</Text> : null}
        </View>
        <View className="medical-scale-card__action">
          <Text>{card.disabled ? "暂不可用" : "开始评估"}</Text>
          {!card.disabled ? <Icon name="arrow-right" size={16} /> : null}
        </View>
      </View>
    </View>
  </SurfaceCard>;
}
