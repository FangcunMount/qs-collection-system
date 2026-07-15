import React, { useCallback, useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";

import {
  findTesteeById,
  getSelectedTesteeId,
  getTesteeList as getStoredTesteeList,
  refreshTesteeList,
  subscribeTesteeStore,
} from "@/shared/stores/testees";
import { routes } from "@/shared/config/routes";
import { normalizeAssessmentKind } from "@/shared/lib/assessmentKind";
import AssessmentRecordListController from "./AssessmentRecordListController";
import "./AssessmentKindReportSection.less";

const resolveDisplayTestee = (testeeList = getStoredTesteeList(), selectedId = getSelectedTesteeId()) => {
  if (!testeeList.length) {
    return null;
  }

  if (selectedId) {
    return findTesteeById(selectedId) || testeeList.find((item) => String(item.id) === String(selectedId)) || testeeList[0];
  }

  return testeeList.length === 1 ? testeeList[0] : null;
};

const AssessmentKindReportSection = ({
  kind,
  title,
  subtitle,
  emptyText,
  tone = "default",
  statusFilter = "",
  pageSize = 3,
  showViewAll = true,
}) => {
  const [selectedTestee, setSelectedTestee] = useState(() => resolveDisplayTestee());
  const normalizedKind = normalizeAssessmentKind(kind);

  const refreshSelectedTestee = useCallback(() => {
    setSelectedTestee(resolveDisplayTestee());
  }, []);

  const handleViewAll = useCallback(() => {
    Taro.navigateTo({
      url: routes.assessmentRecords(normalizedKind ? { kind: normalizedKind } : {}),
    });
  }, [normalizedKind]);

  useEffect(() => {
    const unsubscribe = subscribeTesteeStore(({ testeeList, selectedTesteeId }) => {
      setSelectedTestee(resolveDisplayTestee(testeeList, selectedTesteeId));
    });

    refreshTesteeList()
      .then(refreshSelectedTestee)
      .catch((error) => {
        console.warn("[AssessmentKindReportSection] 刷新档案失败:", error);
        refreshSelectedTestee();
      });

    return unsubscribe;
  }, [refreshSelectedTestee]);

  return (
    <View className={`assessment-kind-report assessment-kind-report--${tone}`}>
      <View className="assessment-kind-report__header">
        <View className="assessment-kind-report__title-group">
          <Text className="assessment-kind-report__title">{title}</Text>
          {subtitle ? (
            <Text className="assessment-kind-report__subtitle">{subtitle}</Text>
          ) : null}
        </View>
        <View className="assessment-kind-report__meta">
          {selectedTestee ? (
            <Text className="assessment-kind-report__testee">
              {selectedTestee.legalName || selectedTestee.name || "当前档案"}
            </Text>
          ) : null}
          {showViewAll && normalizedKind ? (
            <Text className="assessment-kind-report__view-all" onClick={handleViewAll}>
              查看全部
            </Text>
          ) : null}
        </View>
      </View>

      {selectedTestee ? (
        <AssessmentRecordListController
          testee={selectedTestee}
          assessmentKind={kind}
          statusFilter={statusFilter}
          pageSize={pageSize}
          showFilterBar={false}
          showEmptyButton={false}
          showLoadMore={true}
          emptyText={emptyText}
        />
      ) : (
        <View className="assessment-kind-report__empty">
          <Text>选择受试档案后，这里会展示对应测评报告。</Text>
        </View>
      )}
    </View>
  );
};

export default AssessmentKindReportSection;
