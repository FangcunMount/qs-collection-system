import React, { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import BottomMenu from "../../../components/bottomMenu";
import "./index.less";

// 占位：后续可改为真实 API
const mockInterpretations = [
  {
    id: "rep-2025-0001",
    title: "SCL-90 综合心理健康评估",
    date: "2025-12-01",
    status: "已生成",
    summary: "总体状况较好，个别维度需关注，如焦虑、强迫。",
  },
  {
    id: "rep-2025-0002",
    title: "焦虑自评量表（SAS）",
    date: "2025-12-03",
    status: "已生成",
    summary: "轻度焦虑表现，建议规律作息与适度运动。",
  },
  {
    id: "rep-2025-0003",
    title: "抑郁自评量表（SDS）",
    date: "2025-12-10",
    status: "待生成",
    summary: "数据分析中，请稍后查看。",
  },
];

const AnalysisListPage = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    // TODO: 替换为 answersheet/analysis 的真实接口
    setItems(mockInterpretations);
  }, []);

  const handleOpenDetail = (id) => {
    // 跳转到解读详情页（后续实现）
    Taro.navigateTo({ url: `/pages/analysis/detail/index?id=${id}` });
  };

  return (
    <View className="analysis-list-page">
      <View className="page-header">
        <Text className="page-title">解读列表</Text>
        <Text className="page-subtitle">最近生成的评估与报告</Text>
      </View>

      <View className="list-container">
        {items.map((it) => (
          <View key={it.id} className="list-card" onClick={() => handleOpenDetail(it.id)}>
            <View className="card-header">
              <Text className="card-title">{it.title}</Text>
              <Text className={`card-status ${it.status === '已生成' ? 'is-ready' : 'is-pending'}`}>{it.status}</Text>
            </View>
            <Text className="card-summary">{it.summary}</Text>
            <View className="card-meta">
              <Text className="meta-id">编号：{it.id}</Text>
              <Text className="meta-date">日期：{it.date}</Text>
            </View>
          </View>
        ))}
      </View>

      <BottomMenu activeKey="历史" />
    </View>
  );
};

export default AnalysisListPage;
