import React from "react";
import { View, Text, Image, ScrollView } from "@tarojs/components";
import "./InfoConfirm.less";

/**
 * 问卷填写信息确认页面
 * 展示问卷详情信息
 */
const InfoConfirm = ({ questionnaire, testee, onConfirm }) => {
  if (!questionnaire || !testee) {
    return null;
  }

  const questionCount = questionnaire.questions?.length || 0;
  const estimatedTime = questionnaire.estimated_time || Math.ceil(questionCount * 0.5);

  return (
    <View className="info-confirm-page">

      <ScrollView scrollY className="info-confirm-scroll">
        {/* 问卷封面图 */}
        <View className="questionnaire-cover">
          <Image
            className="cover-image"
            src={questionnaire.thumbnail || 'https://picsum.photos/400/400'}
            mode="aspectFill"
          />
        </View>

        {/* 问卷标题信息 */}
        <View className="questionnaire-header">
          <Text className="questionnaire-title">{questionnaire.title}</Text>
          {questionnaire.subtitle && (
            <Text className="questionnaire-subtitle">{questionnaire.subtitle}</Text>
          )}
          
          <View className="questionnaire-meta">
            <View className="meta-item">
              <Text className="meta-icon">📄</Text>
              <Text className="meta-text">{questionCount}道题</Text>
            </View>
            <View className="meta-item">
              <Text className="meta-icon">⏱</Text>
              <Text className="meta-text">预计{estimatedTime}分钟</Text>
            </View>
          </View>
        </View>

        {/* 受试者信息 */}
        <View className="info-section">
          <Text className="section-title">受试者信息</Text>
          <View className="testee-info">
            <View className="testee-item">
              <Text className="testee-label">姓名</Text>
              <Text className="testee-value">{testee.name}</Text>
            </View>
            <View className="testee-item">
              <Text className="testee-label">性别</Text>
              <Text className="testee-value">
                {testee.gender === 1 ? "男" : testee.gender === 2 ? "女" : "其他"}
              </Text>
            </View>
            {testee.birthday && (
              <View className="testee-item">
                <Text className="testee-label">出生日期</Text>
                <Text className="testee-value">{testee.birthday}</Text>
              </View>
            )}
            {testee.age && (
              <View className="testee-item">
                <Text className="testee-label">年龄</Text>
                <Text className="testee-value">{testee.age}岁</Text>
              </View>
            )}
          </View>
        </View>

        {/* 量表简介 */}
        <View className="info-section">
          <Text className="section-title">量表简介</Text>
          <Text className="section-content">
            {questionnaire.introduction || questionnaire.description || 
            `${questionnaire.title}是一个专业的心理测评工具，旨在帮助您了解自己在相关维度上的状况。通过完成问卷，您将获得详细的测评报告和专业的解读。`}
          </Text>
        </View>

      
        {/* 底部占位，避免被按钮遮挡 */}
        <View className="bottom-placeholder" />
      </ScrollView>

      {/* 底部固定按钮 */}
      <View className="info-confirm-footer">
        <View className="start-button" onClick={onConfirm}>
          <Text className="button-text">开始测评</Text>
        </View>
      </View>
    </View>
  );
};

export default InfoConfirm;
