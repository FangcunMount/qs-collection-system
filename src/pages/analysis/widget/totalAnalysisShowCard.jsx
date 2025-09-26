import React from "react";
import { View, Text } from "@tarojs/components";
import BaseAnalysisShowCard from "./baseAnalysisShowCard";

const TotalAnalysisShowCard = ({ content, score }) => {
  return (
    <BaseAnalysisShowCard content={content}>
      <View className='s-mt-xs s-mb-sm s-text-h4'>
        总分（<Text className='s-text-color-primary'>{score}</Text>）
      </View>
    </BaseAnalysisShowCard>
  );
};

export default TotalAnalysisShowCard;
