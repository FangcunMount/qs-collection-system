import React from "react";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";

const getTesteeDisplayName = (testee) => {
  if (!testee) return "我自己";
  return testee.legalName || testee.name || "我自己";
};

const hasAssessmentTask = (entryContext) => {
  return Boolean(
    entryContext?.entry_title ||
    entryContext?.clinician_name ||
    entryContext?.q ||
    entryContext?.target_code ||
    entryContext?.task_id ||
    entryContext?.token
  );
};

const getTaskTitle = (entryContext) => {
  if (!hasAssessmentTask(entryContext)) return "暂无待完成任务";
  return entryContext.entry_title || "扫码测评入口";
};

const getTaskMeta = (entryContext) => {
  if (!hasAssessmentTask(entryContext)) return "可通过扫码开始机构测评";
  if (entryContext?.clinician_name || entryContext?.clinician_title) {
    return `${entryContext?.clinician_name || "专业人员"}${entryContext?.clinician_title ? ` · ${entryContext.clinician_title}` : ""}`;
  }
  return "继续完成上次打开的测评";
};

const HomeStatusPanel = ({
  currentTestee,
  entryContext,
  onManageTestee,
  onContinueTask,
  onScanTask,
}) => {
  const taskAvailable = hasAssessmentTask(entryContext);
  const handleTaskClick = taskAvailable ? onContinueTask : onScanTask;

  return (
    <View className="home-status-panel">
      <View className="home-status-card" onClick={onManageTestee}>
        <View className="home-status-card__icon home-status-card__icon--testee">
          <AtIcon value="user" size="17" color="#2F80ED" />
        </View>
        <View className="home-status-card__content">
          <Text className="home-status-card__label">测评对象</Text>
          <Text className="home-status-card__title">
            {getTesteeDisplayName(currentTestee)}
          </Text>
          <Text className="home-status-card__meta">记录归属于该对象</Text>
        </View>
        <View className="home-status-card__action">
          <AtIcon value="chevron-right" size="12" color="#2F80ED" />
        </View>
      </View>

      <View className="home-status-card" onClick={handleTaskClick}>
        <View className="home-status-card__icon home-status-card__icon--task">
          <AtIcon value={taskAvailable ? "edit" : "camera"} size="17" color="#00B894" />
        </View>
        <View className="home-status-card__content">
          <Text className="home-status-card__label">测评任务</Text>
          <Text className="home-status-card__title">
            {getTaskTitle(entryContext)}
          </Text>
          <Text className="home-status-card__meta">
            {getTaskMeta(entryContext)}
          </Text>
        </View>
        <View className="home-status-card__action">
          <AtIcon value="chevron-right" size="12" color="#2F80ED" />
        </View>
      </View>
    </View>
  );
};

export default HomeStatusPanel;
