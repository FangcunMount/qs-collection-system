import React from "react";
import { View, Text } from "@tarojs/components";
import BaseAnalysisShowCard from "./baseAnalysisShowCard";
import "./totalAnalysisShowCard.less";

const TotalAnalysisShowCard = ({ content, score }) => {
  return (
    <BaseAnalysisShowCard content={content}>
      <View className='total-score-section'>
        <View className='total-score-badge'>总体评估</View>
        <View className='total-score-display'>
          <Text className='score-number'>{score}</Text>
          <Text className='score-label'>总分</Text>
        </View>
      </View>
    </BaseAnalysisShowCard>
  );
};

export default TotalAnalysisShowCard;
