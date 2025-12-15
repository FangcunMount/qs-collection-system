import React from "react";
import { View, Text } from "@tarojs/components";
import BaseAnalysisShowCard from "./baseAnalysisShowCard";
import "./factorAnalysisShowCard.less";

const FactorAnalysisShowCard = ({ total, title, content, score }) => {
  const percentage = total > 0 ? (score / total) * 100 : 0;
  
  return (
    <BaseAnalysisShowCard title={title} content={content}>
      <View className='factor-score-section'>
        <View className='factor-progress-container'>
          <View className='factor-progress-bar'>
            <View 
              className='progress-fill' 
              style={{ width: `${percentage}%` }}
            />
          </View>
          <View className='factor-score-text'>
            <Text className='score-current'>{score}</Text>
            <Text className='score-divider'>/</Text>
            <Text className='score-total'>{total}</Text>
          </View>
        </View>
      </View>
    </BaseAnalysisShowCard>
  );
};

export default FactorAnalysisShowCard;
