import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import "./index.less";

const AnalysisDetailPage = () => {
  const [report, setReport] = useState(null);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router.params;
    const reportId = params.id;

    // TODO: 接入真实 API
    // 占位数据
    setReport({
      id: reportId || "rep-2025-0001",
      title: "SCL-90 综合心理健康评估",
      date: "2025-12-01",
      testeeName: "张三",
      summary: "总体心理状态良好，无明显异常，个别维度需适当关注。",
      dimensions: [
        { name: "躯体化", score: 1.2, level: "正常", desc: "无明显躯体不适" },
        { name: "强迫症状", score: 1.8, level: "轻度", desc: "存在轻微强迫思维" },
        { name: "人际关系敏感", score: 1.5, level: "正常", desc: "人际交往良好" },
        { name: "抑郁", score: 1.3, level: "正常", desc: "情绪稳定" },
        { name: "焦虑", score: 2.1, level: "轻度", desc: "存在轻度焦虑表现" },
        { name: "敌对", score: 1.1, level: "正常", desc: "无明显敌对情绪" },
        { name: "恐怖", score: 1.0, level: "正常", desc: "无恐怖倾向" },
        { name: "偏执", score: 1.2, level: "正常", desc: "思维正常" },
        { name: "精神病性", score: 1.0, level: "正常", desc: "无精神症状" },
      ],
      suggestions: [
        "保持规律作息，保证充足睡眠",
        "适度运动，每周3-5次有氧运动",
        "学习放松技巧，如深呼吸、冥想",
        "必要时寻求专业心理咨询",
      ],
    });
  }, []);

  const getLevelColor = (level) => {
    switch (level) {
      case "正常": return "#52C41A"; // success
      case "轻度": return "#FA8C16"; // warning
      case "中度": return "#F5222D"; // error
      case "重度": return "#9b2c2c"; // severe (keep darker tone)
      default: return "#718096";
    }
  };

  if (!report) {
    return <View className="analysis-detail-page loading">加载中...</View>;
  }

  return (
    <ScrollView scrollY className="analysis-detail-page">
      <View className="detail-header">
        <Text className="header-title">{report.title}</Text>
        <View className="header-meta">
          <Text className="meta-item">受试者：{report.testeeName}</Text>
          <Text className="meta-item">日期：{report.date}</Text>
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
                  {dim.level}
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
  );
};

export default AnalysisDetailPage;
