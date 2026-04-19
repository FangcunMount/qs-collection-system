import React, { useEffect, useMemo, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import config from "../../config";
import "./index.less";

const STORAGE_KEY_PREFIX = "plan_task_subscribe_status";

const buildStorageKey = (scopeKey) => `${STORAGE_KEY_PREFIX}:${scopeKey}`;

const normalizeScopePart = (value) => String(value || "")
  .trim()
  .replace(/\s+/g, "_")
  .replace(/[^a-zA-Z0-9:_-]/g, "");

const buildScopeKey = ({ taskId, planName, entryTitle, clinicianName, entryContext }) => {
  if (taskId) {
    return `task:${normalizeScopePart(taskId)}`;
  }

  const raw = entryContext?.raw || {};
  const planIdentity =
    raw.plan_id ||
    raw.planId ||
    entryContext?.plan_name ||
    planName;
  const entryIdentity =
    raw.entry_id ||
    raw.entryId ||
    entryContext?.token ||
    entryContext?.mpqrcodeid ||
    entryContext?.target_code ||
    raw.target_code ||
    raw.targetCode ||
    entryTitle ||
    clinicianName;

  const normalizedPlanIdentity = normalizeScopePart(planIdentity);
  const normalizedEntryIdentity = normalizeScopePart(entryIdentity);

  if (normalizedPlanIdentity) {
    return `plan:${normalizedPlanIdentity}:${normalizedEntryIdentity || "entry"}`;
  }

  if (!normalizedEntryIdentity) {
    return "";
  }

  return `entry:${normalizedEntryIdentity}`;
};

const getTemplateId = () => config.taskOpenedTemplateId || "";

const humanizeScopeKey = (scopeKey) => {
  if (!scopeKey) return "测评开放提醒";
  if (scopeKey.startsWith("task:")) {
    return `任务 ${scopeKey.slice(5)}`;
  }
  if (scopeKey.startsWith("plan:")) {
    return scopeKey.slice(5).replace(/:/g, " · ");
  }
  if (scopeKey.startsWith("entry:")) {
    return scopeKey.slice(6);
  }
  return scopeKey;
};

const buildScopeMeta = ({ taskId, planName, entryTitle, clinicianName, entryContext }) => ({
  task_id: taskId || "",
  plan_name: entryContext?.plan_name || planName || "",
  entry_title: entryContext?.entry_title || entryTitle || "",
  clinician_name: entryContext?.clinician_name || clinicianName || ""
});

const buildScopeLabel = (scopeKey, meta = {}) => {
  const parts = [meta.plan_name, meta.entry_title, meta.clinician_name].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" · ");
  }
  return humanizeScopeKey(scopeKey);
};

const readPlanSubscribeStatus = (scopeKey) => {
  if (!scopeKey) return null;
  try {
    const cached = Taro.getStorageSync(buildStorageKey(scopeKey));
    if (!cached?.status) {
      return null;
    }
    return {
      scope_key: scopeKey,
      label: cached.label || humanizeScopeKey(scopeKey),
      status: cached.status,
      updated_at: cached.updated_at || 0,
      task_id: cached.task_id || "",
      plan_name: cached.plan_name || "",
      entry_title: cached.entry_title || "",
      clinician_name: cached.clinician_name || ""
    };
  } catch (error) {
    console.error("[PlanSubscribeConfirm] read status failed:", error);
    return null;
  }
};

export const getPlanSubscribeScopeKey = (options = {}) => buildScopeKey(options);

export const hasPlanSubscribeHandled = (scopeKey) => {
  return Boolean(readPlanSubscribeStatus(scopeKey)?.status);
};

export const persistPlanSubscribeStatus = (scopeKey, status, meta = {}) => {
  if (!scopeKey) return;
  try {
    Taro.setStorageSync(buildStorageKey(scopeKey), {
      status,
      updated_at: Date.now(),
      label: buildScopeLabel(scopeKey, meta),
      ...meta
    });
  } catch (error) {
    console.error("[PlanSubscribeConfirm] save status failed:", error);
  }
};

export const listPlanSubscribeStatuses = () => {
  try {
    const { keys = [] } = Taro.getStorageInfoSync();
    return keys
      .filter((key) => key.startsWith(`${STORAGE_KEY_PREFIX}:`))
      .map((key) => key.slice(STORAGE_KEY_PREFIX.length + 1))
      .map((scopeKey) => readPlanSubscribeStatus(scopeKey))
      .filter(Boolean)
      .sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
  } catch (error) {
    console.error("[PlanSubscribeConfirm] list status failed:", error);
    return [];
  }
};

export const clearPlanSubscribeStatuses = (scopeKey) => {
  try {
    if (scopeKey) {
      Taro.removeStorageSync(buildStorageKey(scopeKey));
      return;
    }

    const { keys = [] } = Taro.getStorageInfoSync();
    keys
      .filter((key) => key.startsWith(`${STORAGE_KEY_PREFIX}:`))
      .forEach((key) => Taro.removeStorageSync(key));
  } catch (error) {
    console.error("[PlanSubscribeConfirm] clear status failed:", error);
  }
};

export const requestPlanSubscribe = async ({
  taskId,
  planName,
  entryTitle,
  clinicianName,
  entryContext,
  force = false,
  scopeKeyOverride = ""
} = {}) => {
  const templateId = getTemplateId();
  const scopeKey = scopeKeyOverride || buildScopeKey({
    taskId,
    planName,
    entryTitle,
    clinicianName,
    entryContext
  });
  const scopeMeta = buildScopeMeta({
    taskId,
    planName,
    entryTitle,
    clinicianName,
    entryContext
  });

  if (!templateId || (!scopeKey && !force)) {
    return { status: "unavailable", templateId, scopeKey };
  }

  if (!force && hasPlanSubscribeHandled(scopeKey)) {
    return { status: "handled", templateId, scopeKey };
  }

  const result = await requestSubscribe([templateId]);
  const decision = result?.[templateId];
  if (decision === "accept") {
    if (scopeKey) {
      persistPlanSubscribeStatus(scopeKey, "accepted", scopeMeta);
    }
    return { status: "accepted", templateId, scopeKey };
  }
  if (decision === "ban") {
    if (scopeKey) {
      persistPlanSubscribeStatus(scopeKey, "ban", scopeMeta);
    }
    return { status: "ban", templateId, scopeKey };
  }
  return { status: "cancelled", templateId, scopeKey };
};

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
  clinicianName,
  entryContext,
  variant = "inline"
}) {
  const templateId = getTemplateId();
  const scopeKey = useMemo(() => buildScopeKey({
    taskId,
    planName,
    entryTitle,
    clinicianName,
    entryContext
  }), [clinicianName, entryContext, entryTitle, planName, taskId]);
  const canSubscribe = Boolean(templateId && scopeKey);
  const [handled, setHandled] = useState(false);
  const [expanded, setExpanded] = useState(variant !== "floating");

  useEffect(() => {
    if (!canSubscribe) {
      setHandled(true);
      return;
    }
    try {
      setHandled(hasPlanSubscribeHandled(scopeKey));
    } catch (_error) {
      setHandled(false);
    }
  }, [canSubscribe, scopeKey]);

  const subtitle = useMemo(() => {
    const parts = [];
    if (planName) parts.push(planName);
    if (entryTitle) parts.push(entryTitle);
    if (clinicianName) parts.push(clinicianName);
    return parts.join(" · ");
  }, [clinicianName, entryTitle, planName]);

  const persistStatus = (status) => {
    if (!scopeKey) return;
    persistPlanSubscribeStatus(scopeKey, status, buildScopeMeta({
      taskId,
      planName,
      entryTitle,
      clinicianName,
      entryContext
    }));
    setHandled(true);
  };

  const handleDismiss = () => {
    setExpanded(false);
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

      setExpanded(false);
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

  if (!canSubscribe || handled) {
    return null;
  }

  if (variant === "floating" && !expanded) {
    return (
      <View className="plan-subscribe-launcher" onClick={() => setExpanded(true)}>
        <Text className="plan-subscribe-launcher__icon">🔔</Text>
        <Text className="plan-subscribe-launcher__text">订阅提醒</Text>
      </View>
    );
  }

  return (
    <View className={`plan-subscribe-card ${variant === "floating" ? "plan-subscribe-card--floating" : ""}`}>
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
