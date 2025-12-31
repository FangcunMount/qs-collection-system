import React, { useMemo } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import LoadingState from "../../../../common/components/LoadingState/LoadingState";
import EmptyState from "../../../../common/components/EmptyState/EmptyState";
import AnswersheetCard from "../AnswersheetCard";
import ScaleSheet from "../ScaleSheet";
import { parseDateSafe } from "../../../../common/utils/dateFormatters";
import "./index.less";

/**
 * 测评列表组件
 */
const AnswersheetList = ({ 
  testee,
  scaleList = [],
  selectedScaleCode = '',
  onSelectScale,
  showScaleSheet = false,
  onCloseScaleSheet,
  timeRange = '7',
  riskLevel = '',
  answersheetList = [],
  pagination = { page: 1, page_size: 20, total: 0, total_pages: 0 },
  loading = false,
  onLoadMore
}) => {


  // 根据选中的量表、时间范围、风险等级过滤答卷列表
  const filteredAnswersheetList = useMemo(() => {
    let filtered = [...answersheetList];
    
    // 根据量表代码过滤
    if (selectedScaleCode) {
      filtered = filtered.filter(item => 
        item.scale_code === selectedScaleCode || 
        item.questionnaire_code === selectedScaleCode
      );
    }
    
    // 根据时间范围过滤
    if (timeRange === '7') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filtered = filtered.filter(item => {
        const itemDate = parseDateSafe(item.createtime);
        return itemDate >= oneWeekAgo;
      });
    } else if (timeRange === '30') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      filtered = filtered.filter(item => {
        const itemDate = parseDateSafe(item.createtime);
        return itemDate >= oneMonthAgo;
      });
    }
    
    // 根据风险等级过滤
    if (riskLevel) {
      filtered = filtered.filter(item => {
        if (riskLevel === 'high') {
          return item.risk_level === 'high';
        } else if (riskLevel === 'medium') {
          return item.risk_level === 'medium';
        } else if (riskLevel === 'low') {
          return item.risk_level === 'low';
        }
        return true;
      });
    }

    return filtered;
  }, [answersheetList, selectedScaleCode, timeRange, riskLevel]);

  const handleLoadMore = () => {
    if (pagination.page >= pagination.total_pages) {
      Taro.showToast({
        title: '没有更多数据了',
        icon: 'none'
      });
      return;
    }
    
    onLoadMore && onLoadMore();
  };

  return (
    <>
      <View className="answersheet-list-container">
        {loading ? (
          <LoadingState content="加载中..." />
        ) : filteredAnswersheetList.length > 0 ? (
          <View className="answersheet-list">
            {filteredAnswersheetList.map(answersheet => (
              <AnswersheetCard key={answersheet.id} answersheet={answersheet} />
            ))}
            
            {/* 加载更多 */}
            {pagination.page < pagination.total_pages && (
              <View className="load-more" onClick={handleLoadMore}>
                <Text className="load-more-text">加载更多</Text>
              </View>
            )}
          </View>
        ) : (
          <EmptyState 
            text={selectedScaleCode ? "该量表暂无测评记录" : "暂无测评记录"} 
            icon="📋"
          />
        )}
      </View>

      {/* 量表选择弹层 */}
      <ScaleSheet
        scaleList={scaleList}
        selectedScaleCode={selectedScaleCode}
        onSelectScale={onSelectScale}
        showScaleSheet={showScaleSheet}
        onClose={onCloseScaleSheet}
      />
    </>
  );
};

export default AnswersheetList;

