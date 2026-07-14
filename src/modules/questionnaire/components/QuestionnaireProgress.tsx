import React from "react";
import { Text, View } from "@tarojs/components";

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
  <View className="questionnaire-progress" aria-label={`第${current}题，共${total}题`}>
    <View className="questionnaire-progress__label">
      <Text className="questionnaire-progress__current">{current}</Text>
      <Text className="questionnaire-progress__total">/{total}</Text>
    </View>
    <View className="questionnaire-progress__track">
      <View
        className="questionnaire-progress__value"
        style={{ width: `${percentage}%` }}
      />
    </View>
  </View>
);

export default QuestionnaireProgress;
