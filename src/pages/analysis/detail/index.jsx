import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { AtActivityIndicator } from "taro-ui";
import { getAssessmentReportByAnswersheetId } from "../../../services/api/analysisApi";
import { formatSimpleDate } from "../../common/utils/dateFormatters";
import { getRiskConfig } from "../../common/utils/statusFormatters";
import { PrivacyAuthorization } from "../../../components/privacyAuthorization/privacyAuthorization";
import LoadingState from "../../common/components/LoadingState/LoadingState";
import EmptyState from "../../common/components/EmptyState/EmptyState";
import "./index.less";

const AnalysisDetailPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = Taro.getCurrentInstance().router.params;
      const answersheetId = params.a || params.id;
      
      if (!answersheetId) {
        throw new Error('缺少必要参数');
      }

      const result = await getAssessmentReportByAnswersheetId(answersheetId);
      const reportData = result.data || result;
      
      // 映射数据格式
      const mappedReport = {
        id: answersheetId,
        title: reportData.scale_name || '测评报告',
        date: reportData.created_at || '',
        testeeName: reportData.testee_name || '',
        summary: reportData.conclusion || reportData.summary || '',
        dimensions: (reportData.dimensions || []).map(dim => ({
          name: dim.factor_name || dim.name,
          score: dim.raw_score || dim.score,
          level: dim.risk_level || 'normal',
          desc: dim.description || dim.desc || ''
        })),
        suggestions: Array.isArray(reportData.suggestions) 
          ? reportData.suggestions.map(s => 
              typeof s === 'string' ? s : (s.content || s)
            )
          : []
      };
      
      setReport(mappedReport);
    } catch (err) {
      console.error('加载报告失败:', err);
      setError(err.message || '加载报告失败');
      Taro.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const getLevelColor = (level) => {
    const config = getRiskConfig(level);
    return config.bgColor;
  };

  const getLevelLabel = (level) => {
    const config = getRiskConfig(level);
    return config.label;
  };

  if (loading) {
    return (
      <>
        <PrivacyAuthorization />
        <LoadingState content="加载中..." />
      </>
    );
  }

  if (error || !report) {
    return (
      <>
        <PrivacyAuthorization />
        <EmptyState 
          text={error || "加载失败"} 
          icon="⚠️"
        />
      </>
    );
  }

  return (
    <>
      <PrivacyAuthorization />
      <ScrollView scrollY className="analysis-detail-page">
        <View className="detail-header">
          <Text className="header-title">{report.title}</Text>
          <View className="header-meta">
            {report.testeeName && (
              <Text className="meta-item">受试者：{report.testeeName}</Text>
            )}
            {report.date && (
              <Text className="meta-item">日期：{formatSimpleDate(report.date)}</Text>
            )}
          </View>
        </View>

      <View className="detail-section">
        <Text className="section-title">整体评价</Text>
        <View className="summary-card">
          <Text className="summary-text">{report.summary}</Text>
        </View>
      </View>

      <View className="detail-section">
        <Text className="section-title">维度分析</Text>
        <View className="dimensions-list">
          {report.dimensions.map((dim, idx) => (
            <View key={idx} className="dimension-item">
              <View className="dim-header">
                <Text className="dim-name">{dim.name}</Text>
                <Text className="dim-level" style={{ color: getLevelColor(dim.level) }}>
                  {getLevelLabel(dim.level)}
                </Text>
              </View>
              <View className="dim-score">
                <Text className="score-label">得分：</Text>
                <Text className="score-value">{dim.score}</Text>
              </View>
              <Text className="dim-desc">{dim.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="detail-section">
        <Text className="section-title">建议与干预</Text>
        <View className="suggestions-list">
          {report.suggestions.map((sug, idx) => (
            <View key={idx} className="suggestion-item">
              <Text className="suggestion-index">{idx + 1}</Text>
              <Text className="suggestion-text">{sug}</Text>
            </View>
          ))}
        </View>
      </View>

        <View style={{ height: "80rpx" }} />
      </ScrollView>
    </>
  );
};

export default AnalysisDetailPage;
