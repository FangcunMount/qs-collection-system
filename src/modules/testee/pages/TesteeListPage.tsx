import React, { useEffect, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { routes } from "@/shared/config/routes";
import { buildAssessmentScanTargetUrl, isScanCancelError } from "@/shared/lib/entryScan";
import {
  getTesteeStoreState,
  initTesteeStore,
  refreshTesteeList,
  setSelectedTesteeId,
  subscribeTesteeStore,
} from "@/shared/stores/testees";
import PageShell from "@/shared/ui/PageShell";
import StatePanel from "@/shared/ui/StatePanel";
import ActionButton from "@/shared/ui/ActionButton";
import BottomActionBar from "@/shared/ui/BottomActionBar";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { getTesteeCareContext } from "@/services/api/testees";
import type { Testee, TesteeStoreState } from "@/store/testeeStore";
import TesteeCard, { type TesteeCareContext } from "../components/TesteeCard";
import "./TesteeListPage.less";

const getMessage = (error: unknown): string => error instanceof Error ? error.message : "加载失败";

const TesteeListPage = () => {
  const initial = getTesteeStoreState() as TesteeStoreState;
  const [testees, setTestees] = useState<Testee[]>(initial.testeeList);
  const [loading, setLoading] = useState(!initial.isInitialized || initial.isLoading);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(initial.selectedTesteeId);
  const [careContextMap, setCareContextMap] = useState<Record<string, TesteeCareContext | null>>({});

  const loadTestees = async () => {
    try {
      await initTesteeStore();
    } catch (loadError: unknown) {
      const message = getMessage(loadError);
      setError(message);
      Taro.showToast({ title: message || "加载档案列表失败", icon: "none" });
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeTesteeStore((state: TesteeStoreState) => {
      setTestees(state.testeeList);
      setLoading(state.isLoading);
      setSelectedId(state.selectedTesteeId);
      setError(!state.isLoading && !state.isInitialized ? "加载失败" : "");
    });
    void loadTestees();
    return unsubscribe;
  }, []);

  useEffect(() => {
    let active = true;
    const loadCareContext = async () => {
      if (!testees.length) {
        setCareContextMap({});
        return;
      }
      const pairs = await Promise.all(testees.map(async (testee) => {
        try {
          const result = await getTesteeCareContext(testee.id) as unknown;
          const wrapper = result && typeof result === "object" ? result as { data?: TesteeCareContext } : null;
          return [testee.id, wrapper?.data || result as TesteeCareContext] as const;
        } catch (_error: unknown) {
          return [testee.id, null] as const;
        }
      }));
      if (active) setCareContextMap(Object.fromEntries(pairs));
    };
    void loadCareContext();
    return () => { active = false; };
  }, [testees]);

  const refresh = async () => {
    try {
      await refreshTesteeList();
      Taro.showToast({ title: "刷新成功", icon: "success" });
    } catch (_error: unknown) {
      Taro.showToast({ title: "刷新失败", icon: "none" });
    }
  };

  const rescan = async () => {
    try {
      const result = await Taro.scanCode({ onlyFromCamera: false, scanType: ["qrCode"] });
      const targetUrl = buildAssessmentScanTargetUrl(result);
      if (!targetUrl) {
        Taro.showToast({ title: "未识别到可用测评入口", icon: "none" });
        return;
      }
      Taro.navigateTo({ url: targetUrl });
    } catch (scanError: unknown) {
      if (isScanCancelError(scanError)) return;
      Taro.showToast({ title: "扫码失败，请重试", icon: "none" });
    }
  };

  const fixedAction = (
    <BottomActionBar>
      <ActionButton tone="medical" block onClick={() => Taro.navigateTo({ url: routes.testeeCreate() })}>+ 添加档案</ActionButton>
    </BottomActionBar>
  );

  return (
    <PageShell tone="medical" fixedAction={fixedAction} contentClassName="testee-list-page">
      <View className="testee-list-page__header">
        <Text className="testee-list-page__title">档案管理</Text>
        <Text className="testee-list-page__description">共 {testees.length} 份档案</Text>
      </View>

      {loading ? <StatePanel state="loading" tone="medical" title="正在加载档案" /> : null}
      {!loading && error ? <StatePanel state="error" tone="medical" description={error} actionText="重试" onAction={() => void refresh()} /> : null}
      {!loading && !error && !testees.length ? (
        <SurfaceCard className="testee-list-empty">
          <StatePanel state="empty" tone="medical" title="暂无档案信息" description="添加档案后即可开始测评。" />
          <ActionButton variant="secondary" tone="medical" block onClick={() => void rescan()}>重新扫码</ActionButton>
        </SurfaceCard>
      ) : null}
      {!loading && !error && testees.length ? (
        <View className="testee-list">
          {testees.map((testee) => (
            <TesteeCard
              key={testee.id}
              testee={testee}
              selected={selectedId === testee.id}
              careContext={careContextMap[testee.id]}
              onOpen={() => Taro.navigateTo({ url: routes.testeeEdit({ testeeId: testee.id }) })}
              onSelect={() => {
                setSelectedTesteeId(testee.id);
                Taro.showToast({ title: "已切换当前档案", icon: "success" });
              }}
            />
          ))}
        </View>
      ) : null}
    </PageShell>
  );
};

export default TesteeListPage;
