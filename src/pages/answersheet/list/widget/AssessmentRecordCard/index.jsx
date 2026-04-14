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
const AssessmentRecordCard = ({ record, testeeId = "" }) => {
  const status = getAssessmentStatus(record);

  // 跳转到答卷详情页
  const jumpToAnswersheetDetail = () => {
    if (!record.answer_sheet_id) {
      Taro.showToast({ title: '答卷信息不存在', icon: 'none' });
      return;
    }
    Taro.navigateTo({
      url: `/pages/answersheet/detail/index?a=${record.answer_sheet_id}`
    });
  };
  
  // 跳转到测评报告页
  const jumpToAssessmentReport = () => {
    if (!record.answer_sheet_id) {
      Taro.showToast({ title: '答卷信息不存在', icon: 'none' });
      return;
    }
    Taro.navigateTo({
      url: `/pages/analysis/index?a=${record.answer_sheet_id}`
    });
  };

  const jumpToTrendDetail = () => {
    if (!record.id || !testeeId) {
      Taro.showToast({ title: "趋势参数不完整", icon: "none" });
      return;
    }
    Taro.navigateTo({
      url: `/pages/analysis/trend/index?aid=${record.id}&t=${testeeId}`
    });
  };

  return (
    <View className="assessment-record-card">
      {/* 标题和时间 */}
      <View className="card-header">
        <View className="card-title-wrapper">
          <Text className="card-title">{record.title}</Text>
          {(record.answer_sheet_id || record.scale_code) && (
            <Text className="card-code">
              {record.answer_sheet_id || record.scale_code}
            </Text>
          )}
        </View>
        <Text className="card-time">{formatWriteTime(record.createtime)}</Text>
      </View>
      
      {/* 状态标签和风险等级 */}
      <View className="card-tags">
        <StatusTag status={status} />
        {/* 显示风险等级（在 interpreted 或 completed 状态下显示） */}
        {record.risk_level && (record.status === 'interpreted' || record.status === 'completed') && (
          <RiskTag riskLevel={record.risk_level} />
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
          {(status === 'normal' || status === 'abnormal') && record.score !== undefined && record.score !== null && (
            <Text className={`score-text-${status}`}>总分: {record.score}</Text>
          )}
          {status === 'normal' && (record.score === undefined || record.score === null) && (
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
              <View className="btn btn-light" onClick={jumpToTrendDetail}>
                <Text className="btn-text">查看趋势</Text>
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

export default AssessmentRecordCard;
