import React, { useCallback, useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";

import {
  findTesteeById,
  getSelectedTesteeId,
  getTesteeList as getStoredTesteeList,
  refreshTesteeList,
  subscribeTesteeStore,
} from "@/shared/stores/testees";
import AssessmentRecordListContainer from "./AssessmentRecordListContainer";
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
}) => {
  const [selectedTestee, setSelectedTestee] = useState(() => resolveDisplayTestee());

  const refreshSelectedTestee = useCallback(() => {
    setSelectedTestee(resolveDisplayTestee());
  }, []);

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
        {selectedTestee ? (
          <Text className="assessment-kind-report__testee">
            {selectedTestee.legalName || selectedTestee.name || "当前档案"}
          </Text>
        ) : null}
      </View>

      {selectedTestee ? (
        <AssessmentRecordListContainer
          testee={selectedTestee}
          assessmentKind={kind}
          statusFilter="done"
          pageSize={3}
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
