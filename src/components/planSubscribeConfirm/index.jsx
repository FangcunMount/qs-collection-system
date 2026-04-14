import React, { useEffect, useMemo, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import config from "../../config";
import "./index.less";

const STORAGE_KEY_PREFIX = "plan_task_subscribe_status";

const buildStorageKey = (taskId) => `${STORAGE_KEY_PREFIX}:${taskId}`;

const requestSubscribe = (tmplIds) => {
  if (Taro.requestSubscribeMessage) {
    return Taro.requestSubscribeMessage({ tmplIds });
  }
  if (typeof wx !== "undefined" && wx.requestSubscribeMessage) {
    return new Promise((resolve, reject) => {
      wx.requestSubscribeMessage({
        tmplIds,
        success: resolve,
        fail: reject
      });
    });
  }
  return Promise.reject(new Error("当前微信版本不支持订阅消息"));
};

export default function PlanSubscribeConfirm({
  taskId,
  planName,
  entryTitle,
  clinicianName
}) {
  const templateId = config.taskOpenedTemplateId || "";
  const [handled, setHandled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!taskId || !templateId) {
      setHandled(true);
      return;
    }
    try {
      const cached = Taro.getStorageSync(buildStorageKey(taskId));
      setHandled(Boolean(cached?.status));
    } catch (error) {
      console.error("[PlanSubscribeConfirm] load status failed:", error);
      setHandled(false);
    }
  }, [taskId, templateId]);

  const subtitle = useMemo(() => {
    const parts = [];
    if (planName) parts.push(planName);
    if (entryTitle) parts.push(entryTitle);
    if (clinicianName) parts.push(clinicianName);
    return parts.join(" · ");
  }, [clinicianName, entryTitle, planName]);

  const persistStatus = (status) => {
    if (!taskId) return;
    try {
      Taro.setStorageSync(buildStorageKey(taskId), {
        status,
        updated_at: Date.now()
      });
    } catch (error) {
      console.error("[PlanSubscribeConfirm] save status failed:", error);
    }
    setHandled(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleConfirm = async () => {
    try {
      const result = await requestSubscribe([templateId]);
      const decision = result?.[templateId];
      if (decision === "accept") {
        persistStatus("accepted");
        Taro.showToast({
          title: "已订阅下一次测评开放提醒",
          icon: "success"
        });
        return;
      }

      if (decision === "ban") {
        persistStatus("ban");
        Taro.showToast({
          title: "请在微信设置中开启测评提醒",
          icon: "none"
        });
        return;
      }

      setDismissed(true);
      Taro.showToast({
        title: "未订阅下一次测评开放提醒",
        icon: "none"
      });
    } catch (error) {
      console.error("[PlanSubscribeConfirm] request subscribe failed:", error);
      Taro.showToast({
        title: String(error?.errMsg || error?.message || "订阅失败，请稍后重试"),
        icon: "none"
      });
    }
  };

  if (!taskId || !templateId || handled || dismissed) {
    return null;
  }

  return (
    <View className="plan-subscribe-card">
      <View className="plan-subscribe-card__header">
        <Text className="plan-subscribe-card__eyebrow">计划任务提醒</Text>
        <Text className="plan-subscribe-card__title">订阅下一次测评开放提醒</Text>
      </View>
      <Text className="plan-subscribe-card__desc">
        开启后，小程序会在下一次计划测评开放时提醒您，避免错过后续测评安排。
      </Text>
      {subtitle && (
        <Text className="plan-subscribe-card__meta">{subtitle}</Text>
      )}
      <View className="plan-subscribe-card__actions">
        <View className="plan-subscribe-card__ghost" onClick={handleDismiss}>
          <Text className="plan-subscribe-card__ghost-text">暂不订阅</Text>
        </View>
        <View className="plan-subscribe-card__primary" onClick={handleConfirm}>
          <Text className="plan-subscribe-card__primary-text">订阅提醒</Text>
        </View>
      </View>
    </View>
  );
}
