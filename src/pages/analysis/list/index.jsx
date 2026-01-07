import React, { useEffect, useState, useCallback } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import BottomMenu from "../../../components/bottomMenu";
import LoadingState from "../../common/components/LoadingState/LoadingState";
import EmptyState from "../../common/components/EmptyState/EmptyState";
import { getAssessments } from "../../../services/api/assessmentApi";
import { refreshTesteeList } from "../../../store/testeeStore.ts";
import {
  getTesteeList as getStoredTesteeList,
  getSelectedTesteeId,
  setSelectedTesteeId,
  findTesteeById
} from "../../../store";
import { formatWriteTime } from "../../common/utils/dateFormatters";
import { getAssessmentStatus, getRiskConfig } from "../../common/utils/statusFormatters";
import "./index.less";

const AnalysisListPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTesteeId, setSelectedTesteeIdState] = useState(() => getSelectedTesteeId() || '');

  const ensureTesteeReady = useCallback(async () => {
    await refreshTesteeList();
    const storedList = getStoredTesteeList();
    if (!storedList.length) {
      Taro.redirectTo({ url: "/pages/testee/register/index" });
      return null;
    }

    let currentSelectedId = getSelectedTesteeId();
    const exists = currentSelectedId && storedList.some(item => item.id === currentSelectedId);
    if (!exists) {
      currentSelectedId = storedList[0].id;
      setSelectedTesteeId(currentSelectedId);
    }

    setSelectedTesteeIdState(currentSelectedId);
    return findTesteeById(currentSelectedId) || storedList[0];
  }, []);

  const loadAssessments = useCallback(async (testeeId) => {
    const result = await getAssessments(testeeId, undefined, 1, 50);
    const data = result.data || result;
    const mapped = (data.items || []).map((item) => {
      const status = getAssessmentStatus(item);
      const statusLabelMap = {
        normal: "已生成",
        abnormal: "已生成",
        pending: "待解读",
        generating: "生成中",
        failed: "生成失败"
      };

      const summaryParts = [];
      if (item.risk_level) {
        summaryParts.push(`风险：${getRiskConfig(item.risk_level).label}`);
      }
      if (item.total_score !== undefined && item.total_score !== null) {
        summaryParts.push(`总分：${item.total_score}`);
      }
      if (!summaryParts.length) {
        summaryParts.push("暂无风险等级与分数");
      }

      return {
        id: item.answer_sheet_id || item.id,
        title: item.scale_name || item.questionnaire_code || "未知量表",
        date: item.submitted_at || item.created_at || "",
        status,
        statusLabel: statusLabelMap[status] || "已生成",
        summary: summaryParts.join(" · "),
        isReady: status === "normal" || status === "abnormal"
      };
    });
    setItems(mapped);
  }, []);

  useEffect(() => {
    let isActive = true;
    const init = async () => {
      try {
        setLoading(true);
        const testee = await ensureTesteeReady();
        if (!testee || !isActive) return;
        await loadAssessments(testee.id);
      } catch (error) {
        console.error("加载测评列表失败:", error);
        Taro.showToast({ title: "加载测评列表失败", icon: "none" });
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    init();
    return () => {
      isActive = false;
    };
  }, [ensureTesteeReady, loadAssessments]);

  const handleOpenDetail = (id) => {
    // 跳转到解读详情页（后续实现）
    Taro.navigateTo({ url: `/pages/analysis/detail/index?a=${id}` });
  };

  return (
    <View className="analysis-list-page">
      <View className="page-header">
        <Text className="page-title">解读列表</Text>
        <Text className="page-subtitle">最近生成的评估与报告</Text>
      </View>

      <View className="list-container">
        {loading ? (
          <LoadingState content="加载中..." />
        ) : items.length ? (
          items.map((it) => (
            <View key={it.id} className="list-card" onClick={() => handleOpenDetail(it.id)}>
              <View className="card-header">
                <Text className="card-title">{it.title}</Text>
                <Text className={`card-status ${it.isReady ? 'is-ready' : 'is-pending'}`}>{it.statusLabel}</Text>
              </View>
              <Text className="card-summary">{it.summary}</Text>
              <View className="card-meta">
                <Text className="meta-id">编号：{it.id}</Text>
                <Text className="meta-date">日期：{formatWriteTime(it.date)}</Text>
              </View>
            </View>
          ))
        ) : (
          <EmptyState text="暂无测评记录" icon="📋" />
        )}
      </View>

      <BottomMenu activeKey="历史" />
    </View>
  );
};

export default AnalysisListPage;
