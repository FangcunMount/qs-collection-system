import React from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { StatusTag, RiskTag } from "../../../../../components/common";
import { formatWriteTime } from "../../../../common/utils/dateFormatters";
import { getAssessmentStatus } from "../../../../common/utils/statusFormatters";
import "./index.less";

/**
 * 测评卡片组件
 */
const AnswersheetCard = ({ answersheet }) => {
  const status = getAssessmentStatus(answersheet);

  // 跳转到答卷详情页
  const jumpToAnswersheetDetail = () => {
    if (!answersheet.answer_sheet_id) {
      Taro.showToast({ title: '答卷信息不存在', icon: 'none' });
      return;
    }
    Taro.navigateTo({
      url: `/pages/answersheet/detail/index?a=${answersheet.answer_sheet_id}`
    });
  };
  
  // 跳转到测评报告页
  const jumpToAssessmentReport = () => {
    if (!answersheet.answer_sheet_id) {
      Taro.showToast({ title: '答卷信息不存在', icon: 'none' });
      return;
    }
    Taro.navigateTo({
      url: `/pages/analysis/index?a=${answersheet.answer_sheet_id}`
    });
  };

  return (
    <View className="answersheet-card">
      {/* 标题和时间 */}
      <View className="card-header">
        <View className="card-title-wrapper">
          <Text className="card-title">{answersheet.title}</Text>
          {(answersheet.answer_sheet_id || answersheet.scale_code) && (
            <Text className="card-code">
              {answersheet.answer_sheet_id || answersheet.scale_code}
            </Text>
          )}
        </View>
        <Text className="card-time">{formatWriteTime(answersheet.createtime)}</Text>
      </View>
      
      {/* 状态标签和风险等级 */}
      <View className="card-tags">
        <StatusTag status={status} />
        {/* 显示风险等级（在 interpreted 或 completed 状态下显示） */}
        {answersheet.risk_level && (answersheet.status === 'interpreted' || answersheet.status === 'completed') && (
          <RiskTag riskLevel={answersheet.risk_level} />
        )}
      </View>
      
      {/* 操作区 */}
      <View className="card-actions">
        <View className="card-score">
          {status === 'pending' && (
            <Text className="score-text-pending">待解读</Text>
          )}
          {status === 'generating' && (
            <Text className="score-text-generating">分析中...</Text>
          )}
          {status === 'failed' && (
            <Text className="score-text-failed">解读失败</Text>
          )}
          {(status === 'normal' || status === 'abnormal') && answersheet.score !== undefined && answersheet.score !== null && (
            <Text className={`score-text-${status}`}>总分: {answersheet.score}</Text>
          )}
          {status === 'normal' && (answersheet.score === undefined || answersheet.score === null) && (
            <Text className="score-text-normal">已完成</Text>
          )}
        </View>
        
        <View className="card-buttons">
          {status === 'pending' && (
            <View className="btn btn-primary-full" onClick={jumpToAnswersheetDetail}>
              <Text className="btn-text">查看详情</Text>
            </View>
          )}
          {status === 'generating' && (
            <View className="btn btn-disabled">
              <Text className="btn-text">报告生成中</Text>
            </View>
          )}
          {status === 'failed' && (
            <View className="btn btn-secondary" onClick={jumpToAnswersheetDetail}>
              <Text className="btn-text">查看详情</Text>
            </View>
          )}
          {(status === 'normal' || status === 'abnormal') && (
            <>
              <View className="btn btn-secondary" onClick={jumpToAnswersheetDetail}>
                <Text className="btn-text">查看详情</Text>
              </View>
              <View 
                className={status === 'abnormal' ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={jumpToAssessmentReport}
              >
                <Text className="btn-text">查看报告</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

export default AnswersheetCard;

