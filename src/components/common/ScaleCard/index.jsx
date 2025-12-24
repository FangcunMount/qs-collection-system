/**
 * 量表卡片组件
 */
import React from "react";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import "./index.less";

const ScaleCard = ({
  scale,
  onClick,
  className = ""
}) => {
  const {
    code,
    name,
    description,
    stages = [],
    tags = [],
    applicableAges = [],
    reporters = [],
    question_count = 0
  } = scale;

  // 格式化填报人
  const formatReporter = (reporter) => {
    const reporterMap = {
      'parent': '家长',
      'teacher': '教师',
      'self': '自评',
      'clinical': '临床'
    };
    return reporterMap[reporter] || reporter;
  };

  // 格式化适用年龄
  const formatApplicableAge = (age) => {
    const ageMap = {
      'infant': '婴儿',
      'preschool': '学龄前',
      'school_child': '学龄儿童',
      'adolescent': '青少年',
      'adult': '成人'
    };
    return ageMap[age] || age;
  };

  // 格式化阶段
  const formatStageLabel = (stageValue) => {
    const stageMap = {
      'screening': '筛查',
      'deep_assessment': '深度评估',
      'follow_up': '随访',
      'outcome': '结局'
    };
    return stageMap[stageValue] || stageValue;
  };

  return (
    <View
      className={`scale-card ${className}`}
      onClick={onClick}
    >
      {/* 标题行 */}
      <View className="scale-header">
        <View className="scale-title-wrapper">
          <Text className="scale-title">{name}</Text>
        </View>
      </View>

      {/* 标签行 */}
      {(stages.length > 0 || tags.length > 0) && (
        <View className="scale-tags-row">
          {stages.length > 0 && (
            <View className="tags-left">
              <Text className="stages-text">
                {stages.map(formatStageLabel).join(' / ')}
              </Text>
            </View>
          )}
          
          {tags.length > 0 && (
            <View className="tags-right">
              {tags.slice(0, 3).map((tag, idx) => (
                <View key={idx} className="tag tag-label">{tag}</View>
              ))}
              {tags.length > 3 && (
                <View className="tag tag-more">
                  <Text className="tag-more-text">+{tags.length - 3}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* 描述 */}
      <Text className="scale-desc">{description}</Text>

      {/* 底部信息栏 */}
      <View className="scale-footer">
        {applicableAges.length > 0 && (
          <View className="footer-row">
            <AtIcon value="user" size="14" color="#9CA3AF" />
            <Text className="footer-text">
              {applicableAges.map(formatApplicableAge).join('、')}
            </Text>
          </View>
        )}
        
        <View className="footer-row">
          {reporters.length > 0 && (
            <View className="footer-item">
              <AtIcon value="edit" size="14" color="#9CA3AF" />
              <Text className="footer-text">
                {reporters.map(formatReporter).join('、')}
              </Text>
            </View>
          )}
          {question_count > 0 && (
            <View className="footer-item footer-question-count">
              <AtIcon value="list" size="14" color="#1890FF" />
              <Text className="footer-text footer-question-text">
                {question_count} 道题目
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default ScaleCard;

