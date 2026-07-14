import React from "react";
import { View } from "@tarojs/components";

import ActionButton from "@/shared/ui/ActionButton";
import StatePanel from "@/shared/ui/StatePanel";
import type { DomainTone } from "@/shared/ui/types";

import type { AssessmentRecordPagination, AssessmentRecordViewModel } from "../../types";
import AssessmentRecordCard from "./AssessmentRecordCard";
import "./AssessmentRecordList.less";

interface AssessmentRecordListProps {
  tone: DomainTone;
  testeeId: string;
  records: AssessmentRecordViewModel[];
  pagination: AssessmentRecordPagination;
  loading: boolean;
  loadingMore: boolean;
  error: string;
  emptyText: string;
  emptyActionText?: string;
  showEmptyAction?: boolean;
  showLoadMore?: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onEmptyAction: () => void;
}

const AssessmentRecordList = ({
  tone,
  testeeId,
  records,
  pagination,
  loading,
  loadingMore,
  error,
  emptyText,
  emptyActionText = "重新扫码",
  showEmptyAction = true,
  showLoadMore = true,
  onRetry,
  onLoadMore,
  onEmptyAction,
}: AssessmentRecordListProps) => {
  if (loading) {
    return <StatePanel state="loading" tone={tone} title="正在加载测评记录" />;
  }
  if (error) {
    return (
      <StatePanel
        state="error"
        tone={tone}
        title="测评记录加载失败"
        description={error}
        actionText="重新加载"
        onAction={onRetry}
      />
    );
  }
  if (!records.length) {
    return (
      <StatePanel
        state="empty"
        tone={tone}
        title="暂无测评记录"
        description={emptyText}
        actionText={showEmptyAction ? emptyActionText : undefined}
        onAction={showEmptyAction ? onEmptyAction : undefined}
      />
    );
  }

  const hasMore = pagination.page < pagination.totalPages;
  return (
    <View className="record-list">
      {records.map((record, index) => (
        <AssessmentRecordCard
          key={record.id || record.answerSheetId || `${record.title}-${index}`}
          record={record}
          testeeId={testeeId}
        />
      ))}
      {loadingMore ? (
        <StatePanel state="loading" tone={tone} compact title="正在加载更多" />
      ) : null}
      {showLoadMore && hasMore && !loadingMore ? (
        <ActionButton variant="ghost" tone={tone} block onClick={onLoadMore}>加载更多</ActionButton>
      ) : null}
    </View>
  );
};

export default AssessmentRecordList;
