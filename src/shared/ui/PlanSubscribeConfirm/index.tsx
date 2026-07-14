import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import config from "@/config.js";
import "./index.less";

type SubscribeStatus = "accepted" | "ban" | "cancelled";

interface EntryContext {
  raw?: Record<string, unknown>;
  plan_name?: string;
  entry_title?: string;
  clinician_name?: string;
  token?: string;
  mpqrcodeid?: string;
  target_code?: string;
}

export interface PlanSubscribeScopeOptions {
  taskId?: string;
  planName?: string;
  entryTitle?: string;
  clinicianName?: string;
  entryContext?: EntryContext | null;
}

interface ScopeMeta {
  task_id: string;
  plan_name: string;
  entry_title: string;
  clinician_name: string;
}

export interface PlanSubscribeStatusRecord extends ScopeMeta {
  scope_key: string;
  label: string;
  status: SubscribeStatus;
  updated_at: number;
}

export interface RequestPlanSubscribeOptions extends PlanSubscribeScopeOptions {
  force?: boolean;
  scopeKeyOverride?: string;
}

export type RequestPlanSubscribeResultStatus =
  | SubscribeStatus
  | "handled"
  | "unavailable";

export interface RequestPlanSubscribeResult {
  status: RequestPlanSubscribeResultStatus;
  templateId: string;
  scopeKey: string;
}

export interface PlanSubscribeConfirmProps extends PlanSubscribeScopeOptions {
  variant?: "inline" | "floating";
}

type SubscribeDecisionMap = Record<string, string | undefined>;

interface WeappSubscribeApi {
  requestSubscribeMessage?: (options: {
    tmplIds: string[];
    success: (result: SubscribeDecisionMap) => void;
    fail: (error: unknown) => void;
  }) => void;
}

declare const wx: WeappSubscribeApi | undefined;

const STORAGE_KEY_PREFIX = "plan_task_subscribe_status";

const buildStorageKey = (scopeKey: string) => `${STORAGE_KEY_PREFIX}:${scopeKey}`;

const normalizeScopePart = (value: unknown): string => String(value || "")
  .trim()
  .replace(/\s+/g, "_")
  .replace(/[^a-zA-Z0-9:_-]/g, "");

const buildScopeKey = ({
  taskId,
  planName,
  entryTitle,
  clinicianName,
  entryContext,
}: PlanSubscribeScopeOptions): string => {
  if (taskId) {
    return `task:${normalizeScopePart(taskId)}`;
  }

  const raw = entryContext?.raw || {};
  const planIdentity = raw.plan_id
    || raw.planId
    || entryContext?.plan_name
    || planName;
  const entryIdentity = raw.entry_id
    || raw.entryId
    || entryContext?.token
    || entryContext?.mpqrcodeid
    || entryContext?.target_code
    || raw.target_code
    || raw.targetCode
    || entryTitle
    || clinicianName;

  const normalizedPlanIdentity = normalizeScopePart(planIdentity);
  const normalizedEntryIdentity = normalizeScopePart(entryIdentity);

  if (normalizedPlanIdentity) {
    return `plan:${normalizedPlanIdentity}:${normalizedEntryIdentity || "entry"}`;
  }
  return normalizedEntryIdentity ? `entry:${normalizedEntryIdentity}` : "";
};

const getTemplateId = (): string => config.taskOpenedTemplateId || "";

const humanizeScopeKey = (scopeKey: string): string => {
  if (!scopeKey) return "测评开放提醒";
  if (scopeKey.startsWith("task:")) return `任务 ${scopeKey.slice(5)}`;
  if (scopeKey.startsWith("plan:")) return scopeKey.slice(5).replace(/:/g, " · ");
  if (scopeKey.startsWith("entry:")) return scopeKey.slice(6);
  return scopeKey;
};

const buildScopeMeta = ({
  taskId,
  planName,
  entryTitle,
  clinicianName,
  entryContext,
}: PlanSubscribeScopeOptions): ScopeMeta => ({
  task_id: taskId || "",
  plan_name: entryContext?.plan_name || planName || "",
  entry_title: entryContext?.entry_title || entryTitle || "",
  clinician_name: entryContext?.clinician_name || clinicianName || "",
});

const buildScopeLabel = (scopeKey: string, meta: Partial<ScopeMeta> = {}): string => {
  const parts = [meta.plan_name, meta.entry_title, meta.clinician_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : humanizeScopeKey(scopeKey);
};

const readPlanSubscribeStatus = (scopeKey: string): PlanSubscribeStatusRecord | null => {
  if (!scopeKey) return null;
  try {
    const cached = Taro.getStorageSync(buildStorageKey(scopeKey)) as Partial<PlanSubscribeStatusRecord>;
    if (!cached?.status) return null;
    return {
      scope_key: scopeKey,
      label: cached.label || humanizeScopeKey(scopeKey),
      status: cached.status,
      updated_at: cached.updated_at || 0,
      task_id: cached.task_id || "",
      plan_name: cached.plan_name || "",
      entry_title: cached.entry_title || "",
      clinician_name: cached.clinician_name || "",
    };
  } catch (error: unknown) {
    console.error("[PlanSubscribeConfirm] read status failed:", error);
    return null;
  }
};

export const getPlanSubscribeScopeKey = (
  options: PlanSubscribeScopeOptions = {},
): string => buildScopeKey(options);

export const hasPlanSubscribeHandled = (scopeKey: string): boolean => (
  Boolean(readPlanSubscribeStatus(scopeKey)?.status)
);

export const persistPlanSubscribeStatus = (
  scopeKey: string,
  status: SubscribeStatus,
  meta: Partial<ScopeMeta> = {},
): void => {
  if (!scopeKey) return;
  try {
    Taro.setStorageSync(buildStorageKey(scopeKey), {
      status,
      updated_at: Date.now(),
      label: buildScopeLabel(scopeKey, meta),
      ...meta,
    });
  } catch (error: unknown) {
    console.error("[PlanSubscribeConfirm] save status failed:", error);
  }
};

export const listPlanSubscribeStatuses = (): PlanSubscribeStatusRecord[] => {
  try {
    const { keys = [] } = Taro.getStorageInfoSync();
    return keys
      .filter((key) => key.startsWith(`${STORAGE_KEY_PREFIX}:`))
      .map((key) => key.slice(STORAGE_KEY_PREFIX.length + 1))
      .map(readPlanSubscribeStatus)
      .filter((item): item is PlanSubscribeStatusRecord => Boolean(item))
      .sort((left, right) => right.updated_at - left.updated_at);
  } catch (error: unknown) {
    console.error("[PlanSubscribeConfirm] list status failed:", error);
    return [];
  }
};

export const clearPlanSubscribeStatuses = (scopeKey?: string): void => {
  try {
    if (scopeKey) {
      Taro.removeStorageSync(buildStorageKey(scopeKey));
      return;
    }

    const { keys = [] } = Taro.getStorageInfoSync();
    keys
      .filter((key) => key.startsWith(`${STORAGE_KEY_PREFIX}:`))
      .forEach((key) => Taro.removeStorageSync(key));
  } catch (error: unknown) {
    console.error("[PlanSubscribeConfirm] clear status failed:", error);
  }
};

const requestSubscribe = (tmplIds: string[]): Promise<SubscribeDecisionMap> => {
  if (Taro.requestSubscribeMessage) {
    const requestSubscribeMessage = Taro.requestSubscribeMessage as unknown as (
      options: { tmplIds: string[] },
    ) => Promise<SubscribeDecisionMap>;
    return requestSubscribeMessage({ tmplIds });
  }
  const weapp = typeof wx !== "undefined" ? wx : undefined;
  if (weapp?.requestSubscribeMessage) {
    return new Promise((resolve, reject) => {
      weapp.requestSubscribeMessage?.({ tmplIds, success: resolve, fail: reject });
    });
  }
  return Promise.reject(new Error("当前微信版本不支持订阅消息"));
};

export const requestPlanSubscribe = async ({
  taskId,
  planName,
  entryTitle,
  clinicianName,
  entryContext,
  force = false,
  scopeKeyOverride = "",
}: RequestPlanSubscribeOptions = {}): Promise<RequestPlanSubscribeResult> => {
  const templateId = getTemplateId();
  const scopeKey = scopeKeyOverride || buildScopeKey({
    taskId,
    planName,
    entryTitle,
    clinicianName,
    entryContext,
  });
  const scopeMeta = buildScopeMeta({
    taskId,
    planName,
    entryTitle,
    clinicianName,
    entryContext,
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
    if (scopeKey) persistPlanSubscribeStatus(scopeKey, "accepted", scopeMeta);
    return { status: "accepted", templateId, scopeKey };
  }
  if (decision === "ban") {
    if (scopeKey) persistPlanSubscribeStatus(scopeKey, "ban", scopeMeta);
    return { status: "ban", templateId, scopeKey };
  }
  return { status: "cancelled", templateId, scopeKey };
};

const readErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object") {
    const candidate = error as { errMsg?: unknown; message?: unknown };
    return String(candidate.errMsg || candidate.message || "订阅失败，请稍后重试");
  }
  return "订阅失败，请稍后重试";
};

export default function PlanSubscribeConfirm({
  taskId,
  planName,
  entryTitle,
  clinicianName,
  entryContext,
  variant = "inline",
}: PlanSubscribeConfirmProps) {
  const templateId = getTemplateId();
  const scopeKey = useMemo(() => buildScopeKey({
    taskId,
    planName,
    entryTitle,
    clinicianName,
    entryContext,
  }), [clinicianName, entryContext, entryTitle, planName, taskId]);
  const canSubscribe = Boolean(templateId && scopeKey);
  const [handled, setHandled] = useState(false);
  const [expanded, setExpanded] = useState(variant !== "floating");

  useEffect(() => {
    if (!canSubscribe) {
      setHandled(true);
      return;
    }
    setHandled(hasPlanSubscribeHandled(scopeKey));
  }, [canSubscribe, scopeKey]);

  const subtitle = useMemo(
    () => [planName, entryTitle, clinicianName].filter(Boolean).join(" · "),
    [clinicianName, entryTitle, planName],
  );

  const persistStatus = (status: SubscribeStatus) => {
    if (!scopeKey) return;
    persistPlanSubscribeStatus(scopeKey, status, buildScopeMeta({
      taskId,
      planName,
      entryTitle,
      clinicianName,
      entryContext,
    }));
    setHandled(true);
  };

  const handleConfirm = async () => {
    try {
      const result = await requestSubscribe([templateId]);
      const decision = result?.[templateId];
      if (decision === "accept") {
        persistStatus("accepted");
        Taro.showToast({ title: "已订阅下一次测评开放提醒", icon: "success" });
        return;
      }
      if (decision === "ban") {
        persistStatus("ban");
        Taro.showToast({ title: "请在微信设置中开启测评提醒", icon: "none" });
        return;
      }

      setExpanded(false);
      Taro.showToast({ title: "未订阅下一次测评开放提醒", icon: "none" });
    } catch (error: unknown) {
      console.error("[PlanSubscribeConfirm] request subscribe failed:", error);
      Taro.showToast({ title: readErrorMessage(error), icon: "none" });
    }
  };

  if (!canSubscribe || handled) return null;

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
      {subtitle ? <Text className="plan-subscribe-card__meta">{subtitle}</Text> : null}
      <View className="plan-subscribe-card__actions">
        <View className="plan-subscribe-card__ghost" onClick={() => setExpanded(false)}>
          <Text className="plan-subscribe-card__ghost-text">暂不订阅</Text>
        </View>
        <View className="plan-subscribe-card__primary" onClick={handleConfirm}>
          <Text className="plan-subscribe-card__primary-text">订阅提醒</Text>
        </View>
      </View>
    </View>
  );
}
