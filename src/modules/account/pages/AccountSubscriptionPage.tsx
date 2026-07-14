import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import config from "@/config.js";
import PageShell from "@/shared/ui/PageShell";
import StatePanel from "@/shared/ui/StatePanel";
import ActionButton from "@/shared/ui/ActionButton";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import {
  clearPlanSubscribeStatuses,
  listPlanSubscribeStatuses,
  requestPlanSubscribe,
} from "@/shared/ui/PlanSubscribeConfirm";
import { formatSubscriptionStatus, formatSubscriptionUpdatedAt } from "../lib/subscriptionView";
import "./AccountSubscriptionPage.less";

interface SubscriptionRecord {
  scope_key: string;
  label?: string;
  plan_name?: string;
  entry_title?: string;
  status?: string;
  updated_at?: string | number;
}

const getMessage = (error: unknown): string => {
  const value = error && typeof error === "object" ? error as { errMsg?: string; message?: string } : {};
  return value.errMsg || value.message || "订阅失败，请稍后重试";
};

const AccountSubscriptionPage = () => {
  const [records, setRecords] = useState<SubscriptionRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reloadRecords = useCallback(() => {
    setRecords(listPlanSubscribeStatuses() as SubscriptionRecord[]);
  }, []);

  useEffect(() => { reloadRecords(); }, [reloadRecords]);

  const handleManualSubscribe = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await requestPlanSubscribe({
        planName: "测评开放提醒",
        entryTitle: "手动管理",
        force: true,
        scopeKeyOverride: "manual:task-opened",
      });
      const status = String(result.status || "cancelled");
      Taro.showToast({
        title: status === "accepted"
          ? "已订阅测评开放提醒"
          : status === "ban" ? "请在微信中开启订阅消息" : "本次未订阅提醒",
        icon: status === "accepted" ? "success" : "none",
      });
    } catch (error: unknown) {
      Taro.showToast({ title: getMessage(error), icon: "none" });
    } finally {
      reloadRecords();
      setSubmitting(false);
    }
  };

  const handleClearRecords = () => {
    Taro.showModal({
      title: "清空本地记录",
      content: "清空后，后续在“开始测评”时会再次弹出订阅提醒。",
      success: (result) => {
        if (!result.confirm) return;
        clearPlanSubscribeStatuses();
        reloadRecords();
        Taro.showToast({ title: "已清空本地记录", icon: "success" });
      },
    });
  };

  return (
    <PageShell tone="medical" contentClassName="subscription-manage-page">
      <View className="subscription-hero">
        <Text className="subscription-hero__eyebrow">订阅消息管理</Text>
        <Text className="subscription-hero__title">管理测评开放提醒</Text>
        <Text className="subscription-hero__desc">重新触发微信订阅授权，或清空本地已记住的提醒决定。</Text>
      </View>

      <SurfaceCard className="subscription-card">
        <View className="subscription-card__head">
          <Text className="subscription-card__title">当前模板</Text>
          <Text className="subscription-card__meta">{config.taskOpenedTemplateId}</Text>
        </View>
        <ActionButton tone="medical" block loading={submitting} onClick={() => void handleManualSubscribe()}>
          {submitting ? "请求中..." : "重新触发订阅授权"}
        </ActionButton>
        <ActionButton variant="secondary" tone="medical" block className="subscription-clear" onClick={handleClearRecords}>
          清空本地订阅记录
        </ActionButton>
      </SurfaceCard>

      <SurfaceCard className="subscription-card">
        <View className="subscription-card__head">
          <Text className="subscription-card__title">本地记录</Text>
          <Text className="subscription-card__meta">{records.length} 条</Text>
        </View>
        {!records.length ? (
          <StatePanel
            state="empty"
            tone="medical"
            compact
            title="暂无本地订阅记录"
            description="后续触发订阅后，这里会展示本地记住的结果。"
          />
        ) : (
          <View className="subscription-records">
            {records.map((record) => (
              <View key={record.scope_key} className="subscription-record">
                <View className="subscription-record__main">
                  <Text className="subscription-record__title">{record.label || "测评开放提醒"}</Text>
                  <Text className="subscription-record__sub">{record.plan_name || record.entry_title || record.scope_key}</Text>
                </View>
                <View className="subscription-record__side">
                  <Text className={`subscription-record__status subscription-record__status--${record.status || "unknown"}`}>
                    {formatSubscriptionStatus(record.status)}
                  </Text>
                  <Text className="subscription-record__time">{formatSubscriptionUpdatedAt(record.updated_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>

      <SurfaceCard className="subscription-tip">
        <Text className="subscription-tip__title">说明</Text>
        <Text className="subscription-tip__desc">小程序只能重新发起授权并管理本地提示记录，实际消息接收状态以微信侧为准。</Text>
      </SurfaceCard>
    </PageShell>
  );
};

export default AccountSubscriptionPage;
