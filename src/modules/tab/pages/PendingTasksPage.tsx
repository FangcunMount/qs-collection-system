import React, { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { Picker, Text, View } from "@tarojs/components";
import { getTesteeStoreState, initTesteeStore, setSelectedTesteeId, subscribeTesteeStore } from "@/shared/stores/testees";
import type { TesteeStoreState } from "@/store/testeeStore";
import { routes } from "@/shared/config/routes";
import PageShell from "@/shared/ui/PageShell";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import StatePanel from "@/shared/ui/StatePanel";
import PendingTaskList from "../components/PendingTaskList";
import "./PendingTasksPage.less";

export default function PendingTasksPage() {
  const [members, setMembers] = useState<TesteeStoreState>(() => getTesteeStoreState() as TesteeStoreState);
  const [loading, setLoading] = useState(!members.isInitialized);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeTesteeStore((state: TesteeStoreState) => setMembers(state));
    setError(false);
    setLoading(true);
    void initTesteeStore().catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, [retry]);
  const selected = members.testeeList.find(member => member.id === members.selectedTesteeId);
  return <PageShell className="task-inbox-page" contentClassName="task-inbox-content" navigation={<AppNavigationBar title="待填写任务" showBack />}>
    <Text className="task-inbox-page__intro">查看机构为你或家人安排的测评</Text>
    {loading ? <StatePanel state="loading" title="正在加载家庭档案" />
      : error ? <StatePanel state="error" title="家庭档案加载失败" actionText="重新加载" onAction={() => setRetry(value => value + 1)} />
      : members.testeeList.length ? <>
        <Picker mode="selector" range={[...members.testeeList.map(member => member.legalName || "未命名成员"), "添加 / 管理家庭成员"]}
          value={Math.max(0, members.testeeList.findIndex(member => member.id === selected?.id))}
          onChange={event => {
            const member = members.testeeList[Number(event.detail.value)];
            if (member) setSelectedTesteeId(member.id);
            else Taro.navigateTo({ url: routes.testeeList() });
          }}>
          <View className="task-inbox-page__member"><View><Text className="task-inbox-page__label">当前家庭档案</Text><Text className="task-inbox-page__name">{selected?.legalName || "请选择家庭成员"}</Text></View><Text>切换 ⌄</Text></View>
        </Picker>
        <PendingTaskList key={selected?.id || ""} testeeId={selected?.id || ""} />
      </> : <StatePanel state="empty" title="还没有家庭档案" description="建立档案后，可查看机构安排的测评。" actionText="管理家庭档案" onAction={() => Taro.navigateTo({ url: routes.testeeList() })} />}
  </PageShell>;
}
