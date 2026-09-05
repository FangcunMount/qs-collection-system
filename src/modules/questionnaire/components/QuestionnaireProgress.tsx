import React from "react";
import { Text, View } from "@tarojs/components";

import "./QuestionnaireProgress.less";

export interface QuestionnaireProgressProps {
  current: number;
  total: number;
  percentage: number;
}

const QuestionnaireProgress = ({
  current,
  total,
  percentage,
}: QuestionnaireProgressProps) => (
  <View className="questionnaire-progress">
    <View className="questionnaire-progress__label">
      <Text className="questionnaire-progress__caption">当前题目 </Text>
      <Text className="questionnaire-progress__current">{current}</Text>
      <Text className="questionnaire-progress__total">/{total}</Text>
    </View>
    <View className="questionnaire-progress__track">
      <View
        className="questionnaire-progress__value"
        style={{ transform: `scaleX(${Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) / 100 : 0})` }}
      />
    </View>
  </View>
);

export default QuestionnaireProgress;
