import React from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import LoadingState from "@/shared/ui/LoadingState";
import EmptyState from "@/shared/ui/EmptyState";
import AssessmentRecordCard from "../AssessmentRecordCard";
import ScaleSheet from "../ScaleSheet";
import "./index.less";

/**
 * 测评列表组件
 */
const AssessmentRecordList = ({
  testeeId = "",
  scaleList = [],
  selectedScaleCode = '',
  onSelectScale,
  showScaleSheet = false,
  onCloseScaleSheet,
  records = [],
  pagination = { page: 1, page_size: 20, total: 0, total_pages: 0 },
  loading = false,
  onLoadMore,
  onEmptyScan
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
      <View className="assessment-record-list-container">
        {loading ? (
          <LoadingState content="加载中..." />
        ) : records.length > 0 ? (
          <View className="assessment-record-list">
            {records.map(record => (
              <AssessmentRecordCard key={record.id} record={record} testeeId={testeeId} />
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
            buttonText="重新扫码"
            onButtonClick={onEmptyScan}
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

export default AssessmentRecordList;
