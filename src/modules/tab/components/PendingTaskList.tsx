import React, { useCallback, useEffect, useRef, useState } from "react";
import Taro, { useDidShow, useDidHide, usePullDownRefresh } from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { listPlanTasks } from "@/services/api/planTaskEntries";
import { routes } from "@/shared/config/routes";
import StatePanel from "@/shared/ui/StatePanel";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { getSessionRevision, onSessionCleared } from "@/shared/stores/sessionPrivacy";
import "./PendingTaskList.less";

type Task = { task_id: string; title: string; plan_id: string; open_at: string; due_at: string; expires_at: string; can_start: boolean };
const dateText = (value: string) => {
  const stamp = Date.parse(value);
  return Number.isFinite(stamp) ? new Date(stamp + 8 * 3600000).toISOString().replace("T", " ").slice(0, 16) : "待开放";
};
export default function PendingTaskList({ testeeId }: { testeeId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const request = useRef(0);
  const member = useRef(testeeId);
  member.current = testeeId;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = useCallback(() => { if (timer.current) clearInterval(timer.current); timer.current = null; }, []);
  const load = useCallback(async () => {
    const attempt = ++request.current;
    const revision = getSessionRevision();
    const valid = () => attempt === request.current && member.current === testeeId && revision === getSessionRevision();
    if (!testeeId) { setTasks([]); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const result = await listPlanTasks(testeeId);
      if (valid()) { setTasks(result?.items || []); setNow(Date.now()); }
    } catch (_) {
      if (valid()) { setTasks([]); setError("任务同步失败，请重试"); }
    } finally { if (valid()) setLoading(false); }
  }, [testeeId]);
  const start = useCallback(() => {
    stop();
    timer.current = setInterval(() => { setNow(Date.now()); void load(); }, 15000);
  }, [load, stop]);
  useEffect(() => {
    setTasks([]); void load(); start();
    const unsubscribe = onSessionCleared(() => { ++request.current; setTasks([]); setError(""); setLoading(false); stop(); });
    return () => { ++request.current; stop(); unsubscribe(); };
  }, [load, start, stop]);
  useDidShow(() => { void load(); start(); });
  useDidHide(() => { ++request.current; stop(); });
  usePullDownRefresh(() => { void load().finally(() => Taro.stopPullDownRefresh()); });
  return <View className="pending-tasks">
    <Text className="pending-tasks__heading">待填写任务</Text>
    {!testeeId ? <StatePanel state="empty" title="选择家庭档案后查看任务" compact />
      : error ? <StatePanel state="error" title={error} actionText="重新加载" onAction={load} compact />
      : loading && !tasks.length ? <StatePanel state="loading" title="正在同步任务" compact />
      : !tasks.length ? <StatePanel state="empty" title="该成员暂无待填写任务" compact />
      : tasks.map(task => {
        const canStart = task.can_start && Date.parse(task.open_at) <= now && now < Date.parse(task.expires_at);
        return <SurfaceCard key={task.task_id} className="pending-tasks__row">
          <Text className="pending-tasks__title">{task.title}</Text>
          <Text>所属计划：{task.title}测评计划 · {task.plan_id}</Text>
          <Text>开放时间：{dateText(task.open_at)}</Text>
          <Text>截止时间：{dateText(task.expires_at || task.due_at)}</Text>
          <View className={`pending-tasks__start ${canStart ? "" : "pending-tasks__start--disabled"}`}
            onClick={() => { if (canStart && Date.now() < Date.parse(task.expires_at)) Taro.navigateTo({ url: routes.assessmentFill({ task_id: task.task_id }) }); }}>
            <Text>{canStart ? "开始填写" : now >= Date.parse(task.expires_at) ? "已失效" : "尚未开放"}</Text>
          </View>
        </SurfaceCard>;
      })}
  </View>;
}
