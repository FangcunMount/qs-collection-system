import React from "react";
import { View, Text } from "@tarojs/components";
import "./index.less";

/**
 * 筛选弹层组件
 */
const FilterSheet = ({
  timeRange = '7',
  riskLevel = '',
  onTimeRangeChange,
  onRiskLevelChange
}) => {
  return (
    <View className="filter-sheet-content">
      {/* 时间范围 */}
      <View className="filter-sheet-section">
        <Text className="filter-sheet-section-title">时间范围</Text>
        <View className="filter-sheet-options">
          <View 
            className={`filter-sheet-option ${timeRange === '' ? 'selected' : ''}`}
            onClick={() => onTimeRangeChange && onTimeRangeChange('')}
          >
            <View className={`filter-sheet-radio ${timeRange === '' ? 'checked' : ''}`}>
              {timeRange === '' && <View className="filter-sheet-radio-dot" />}
            </View>
            <Text className="filter-sheet-option-text">全部</Text>
          </View>
          <View 
            className={`filter-sheet-option ${timeRange === '7' ? 'selected' : ''}`}
            onClick={() => onTimeRangeChange && onTimeRangeChange('7')}
          >
            <View className={`filter-sheet-radio ${timeRange === '7' ? 'checked' : ''}`}>
              {timeRange === '7' && <View className="filter-sheet-radio-dot" />}
            </View>
            <Text className="filter-sheet-option-text">过去7天</Text>
          </View>
          <View 
            className={`filter-sheet-option ${timeRange === '30' ? 'selected' : ''}`}
            onClick={() => onTimeRangeChange && onTimeRangeChange('30')}
          >
            <View className={`filter-sheet-radio ${timeRange === '30' ? 'checked' : ''}`}>
              {timeRange === '30' && <View className="filter-sheet-radio-dot" />}
            </View>
            <Text className="filter-sheet-option-text">过去30天</Text>
          </View>
        </View>
      </View>

      {/* 风险等级 */}
      <View className="filter-sheet-section">
        <Text className="filter-sheet-section-title">风险等级</Text>
        <View className="filter-sheet-options">
          <View 
            className={`filter-sheet-option ${riskLevel === '' ? 'selected' : ''}`}
            onClick={() => onRiskLevelChange && onRiskLevelChange('')}
          >
            <View className={`filter-sheet-radio ${riskLevel === '' ? 'checked' : ''}`}>
              {riskLevel === '' && <View className="filter-sheet-radio-dot" />}
            </View>
            <Text className="filter-sheet-option-text">全部</Text>
          </View>
          <View 
            className={`filter-sheet-option ${riskLevel === 'high' ? 'selected' : ''}`}
            onClick={() => onRiskLevelChange && onRiskLevelChange('high')}
          >
            <View className={`filter-sheet-radio filter-sheet-radio-high ${riskLevel === 'high' ? 'checked' : ''}`}>
              {riskLevel === 'high' && <View className="filter-sheet-radio-dot" />}
            </View>
            <Text className="filter-sheet-option-text">高风险</Text>
          </View>
          <View 
            className={`filter-sheet-option ${riskLevel === 'medium' ? 'selected' : ''}`}
            onClick={() => onRiskLevelChange && onRiskLevelChange('medium')}
          >
            <View className={`filter-sheet-radio filter-sheet-radio-medium ${riskLevel === 'medium' ? 'checked' : ''}`}>
              {riskLevel === 'medium' && <View className="filter-sheet-radio-dot" />}
            </View>
            <Text className="filter-sheet-option-text">中风险</Text>
          </View>
          <View 
            className={`filter-sheet-option ${riskLevel === 'low' ? 'selected' : ''}`}
            onClick={() => onRiskLevelChange && onRiskLevelChange('low')}
          >
            <View className={`filter-sheet-radio filter-sheet-radio-low ${riskLevel === 'low' ? 'checked' : ''}`}>
              {riskLevel === 'low' && <View className="filter-sheet-radio-dot" />}
            </View>
            <Text className="filter-sheet-option-text">低风险</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default FilterSheet;
