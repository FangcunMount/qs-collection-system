import React from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import LoadingState from "../../../../common/components/LoadingState/LoadingState";
import EmptyState from "../../../../common/components/EmptyState/EmptyState";
import AnswersheetCard from "../AnswersheetCard";
import ScaleSheet from "../ScaleSheet";
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
  answersheetList = [],
  pagination = { page: 1, page_size: 20, total: 0, total_pages: 0 },
  loading = false,
  onLoadMore
}) => {
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
        ) : answersheetList.length > 0 ? (
          <View className="answersheet-list">
            {answersheetList.map(answersheet => (
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
