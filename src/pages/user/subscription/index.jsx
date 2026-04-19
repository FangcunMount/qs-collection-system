import React, { useCallback, useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import "taro-ui/dist/style/components/icon.scss";

import config from "../../../config";
import {
  clearPlanSubscribeStatuses,
  listPlanSubscribeStatuses,
  requestPlanSubscribe
} from "../../../components/planSubscribeConfirm";
import "./index.less";

const STATUS_TEXT_MAP = {
  accepted: "已同意提醒",
  ban: "已拒绝提醒",
  cancelled: "本次未订阅"
};

const formatUpdatedAt = (updatedAt) => {
  if (!updatedAt) return "刚刚更新";
  const date = new Date(updatedAt);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
};

const SubscriptionManagePage = () => {
  const [records, setRecords] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const reloadRecords = useCallback(() => {
    setRecords(listPlanSubscribeStatuses());
  }, []);

  useEffect(() => {
    reloadRecords();
  }, [reloadRecords]);

  const handleManualSubscribe = async () => {
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await requestPlanSubscribe({
        planName: "测评开放提醒",
        entryTitle: "手动管理",
        force: true,
        scopeKeyOverride: "manual:task-opened"
      });

      if (result.status === "accepted") {
        Taro.showToast({
          title: "已订阅测评开放提醒",
          icon: "success"
        });
      } else if (result.status === "ban") {
        Taro.showToast({
          title: "请在微信中开启订阅消息",
          icon: "none"
        });
      } else {
        Taro.showToast({
          title: "本次未订阅提醒",
          icon: "none"
        });
      }
    } catch (error) {
      Taro.showToast({
        title: String(error?.errMsg || error?.message || "订阅失败，请稍后重试"),
        icon: "none"
      });
    } finally {
      reloadRecords();
      setSubmitting(false);
    }
  };

  const handleClearRecords = () => {
    Taro.showModal({
      title: "清空本地记录",
      content: "清空后，后续在“开始测评”时会再次弹出订阅提醒。",
      success: (res) => {
        if (!res.confirm) return;
        clearPlanSubscribeStatuses();
        reloadRecords();
        Taro.showToast({
          title: "已清空本地记录",
          icon: "success"
        });
      }
    });
  };

  return (
    <View className="subscription-manage-page">
      <View className="subscription-hero">
        <Text className="subscription-hero__eyebrow">订阅消息管理</Text>
        <Text className="subscription-hero__title">管理测评开放提醒</Text>
        <Text className="subscription-hero__desc">
          这里可以重新触发微信订阅授权，也可以清空本地已记住的提醒决定，方便后续重新弹出提醒。
        </Text>
      </View>

      <View className="subscription-card">
        <View className="subscription-card__head">
          <Text className="subscription-card__title">当前模板</Text>
          <Text className="subscription-card__meta">{config.taskOpenedTemplateId}</Text>
        </View>
        <View
          className={`subscription-primary ${submitting ? "subscription-primary--disabled" : ""}`}
          onClick={handleManualSubscribe}
        >
          <AtIcon value="bell" size="18" color="#FFFFFF" />
          <Text className="subscription-primary__text">
            {submitting ? "请求中..." : "重新触发订阅授权"}
          </Text>
        </View>
        <View className="subscription-secondary" onClick={handleClearRecords}>
          <Text className="subscription-secondary__text">清空本地订阅记录</Text>
        </View>
      </View>

      <View className="subscription-card">
        <View className="subscription-card__head">
          <Text className="subscription-card__title">本地记录</Text>
          <Text className="subscription-card__meta">{records.length} 条</Text>
        </View>
        {records.length === 0 ? (
          <View className="subscription-empty">
            <Text className="subscription-empty__title">暂无本地订阅记录</Text>
            <Text className="subscription-empty__desc">
              后续在“开始测评”或报告页浮动入口触发订阅后，这里会展示本地记住的结果。
            </Text>
          </View>
        ) : (
          <View className="subscription-records">
            {records.map((record) => (
              <View key={record.scope_key} className="subscription-record">
                <View className="subscription-record__main">
                  <Text className="subscription-record__title">{record.label || "测评开放提醒"}</Text>
                  <Text className="subscription-record__sub">
                    {record.plan_name || record.entry_title || record.scope_key}
                  </Text>
                </View>
                <View className="subscription-record__side">
                  <Text
                    className={`subscription-record__status subscription-record__status--${record.status || "unknown"}`}
                  >
                    {STATUS_TEXT_MAP[record.status] || record.status || "未知"}
                  </Text>
                  <Text className="subscription-record__time">{formatUpdatedAt(record.updated_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="subscription-tip">
        <Text className="subscription-tip__title">说明</Text>
        <Text className="subscription-tip__desc">
          小程序这里只能重新发起微信订阅授权，并管理本地是否已经提示过的记录。真正的消息接收结果仍以微信侧实际订阅状态为准。
        </Text>
      </View>
    </View>
  );
};

export default SubscriptionManagePage;
