import React from 'react';
import { Text, View } from '@tarojs/components';
import type { CatalogCardViewModel } from '../viewModels/catalogCard';
import './CatalogAssessmentFacts.less';

export default function CatalogAssessmentFacts({ card }: { card: CatalogCardViewModel }) {
  return <View className="catalog-assessment-facts">
    {card.audienceLabel ? <Text className="catalog-assessment-facts__line">适用对象 · {card.audienceLabel}</Text> : null}
    {card.reporterLabel ? <Text className="catalog-assessment-facts__line">填写者 · {card.reporterLabel}</Text> : null}
    <Text className="catalog-assessment-facts__line">{[card.questionCount > 0 ? `${card.questionCount} 题` : '', card.durationLabel, card.statusLabel].filter(Boolean).join(' · ')}</Text>
  </View>;
}
