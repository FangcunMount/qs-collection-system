import React from "react";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import "./factorAnalysisShowCard.less";

const FactorAnalysisShowCard = ({ title, content, score, riskLevel }) => {
  // 根据 risk_level 获取样式配置
  const getRiskConfig = (riskLevel) => {
    const riskMap = {
      'high': {
        className: 'risk-high',
        label: '高风险',
        icon: 'alert-circle',
        bgColor: '#FFF1F0',
        borderColor: '#FF4D4F',
        textColor: '#FF4D4F',
        scoreBg: 'rgba(255, 77, 79, 0.1)'
      },
      'medium': {
        className: 'risk-medium',
        label: '中风险',
        icon: 'alert-circle',
        bgColor: '#FFF7E6',
        borderColor: '#FA8C16',
        textColor: '#FA8C16',
        scoreBg: 'rgba(250, 140, 22, 0.1)'
      },
      'low': {
        className: 'risk-low',
        label: '低风险',
        icon: 'check-circle',
        bgColor: '#F6FFED',
        borderColor: '#52C41A',
        textColor: '#52C41A',
        scoreBg: 'rgba(82, 196, 26, 0.1)'
      },
      'normal': {
        className: 'risk-normal',
        label: '正常',
        icon: 'check-circle',
        bgColor: '#F0F5FF',
        borderColor: '#1890FF',
        textColor: '#1890FF',
        scoreBg: 'rgba(24, 144, 255, 0.1)'
      },
      'none': {
        className: 'risk-none',
        label: '',
        icon: '',
        bgColor: '#F5F5F5',
        borderColor: '#D9D9D9',
        textColor: '#666666',
        scoreBg: 'rgba(0, 0, 0, 0.05)'
      }
    };
    
    return riskMap[riskLevel] || riskMap['none'];
  };
  
  const riskConfig = getRiskConfig(riskLevel);
  
  return (
    <View className={`factor-card ${riskConfig.className}`}>
      {/* 卡片头部：因子名称和风险标签 */}
      <View className="factor-header">
        <View className="factor-title-wrapper">
          <Text className="factor-title">{title}</Text>
        </View>
        {riskConfig.label && (
          <View className={`risk-badge ${riskConfig.className}`}>
            {riskConfig.icon && (
              <AtIcon value={riskConfig.icon} size="14" color={riskConfig.textColor} />
            )}
            <Text className="risk-label">{riskConfig.label}</Text>
          </View>
        )}
      </View>
      
      {/* 分数展示区域 */}
      <View className="factor-score-section">
        <View 
          className={`score-display ${riskConfig.className}`}
          style={{ backgroundColor: riskConfig.scoreBg }}
        >
          <Text className="score-label">得分</Text>
          <Text className={`score-value ${riskConfig.className}`}>
            {score !== undefined && score !== null ? score : '--'}
          </Text>
        </View>
      </View>
      
      {/* 描述内容 */}
      {content && (
        <View className="factor-content">
          <Text className="content-text">{content}</Text>
        </View>
      )}
    </View>
  );
};

export default FactorAnalysisShowCard;
