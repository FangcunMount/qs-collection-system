import React from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import ActionButton from '@/shared/ui/ActionButton';
import SurfaceCard from '@/shared/ui/SurfaceCard';
import { routes } from '@/shared/config/routes';
import type { AIScope } from '@/services/api/aiExplanationApi';
import { useAIExplanation } from '../../hooks/useAIExplanation';
import { aiStateCopy } from '../../viewModels/aiExplanation';
import AIExplanationIllustration from './AIExplanationIllustration';
import './index.less';

interface EntryAction { label: string; onClick: () => void }
export default function AIExplanationEntryCard({ tone = 'medical', render, ...scope }: AIScope & {
  tone?: 'medical' | 'personality';
  render?: (entry: React.ReactNode, action?: EntryAction) => React.ReactNode;
}) {
  const { state, refresh } = useAIExplanation(scope, { poll: false });
  const copy = aiStateCopy(state);
  const statusLabel = state.view === 'generated' ? '已生成' : state.view === 'waiting'
    ? state.output?.status === 'pending' ? '等待开始' : '正在生成' : state.view === 'failed' ? '未完成' : '';
  const navigable = ['ready','waiting','generated','failed'].includes(state.view);
  const label = state.view === 'generated' ? '查看深度解读' : state.view === 'waiting' ? '解读正在生成 · 查看进度' :
    state.view === 'failed' ? '本次解读未完成 · 查看状态' : '请求深度解读';
  const onOpen = () => { void Taro.navigateTo({ url: routes.aiExplanation({ aid: scope.assessmentId, t: scope.testeeId, gid: state.requestId, kind: tone === 'personality' ? 'personality' : undefined }) }); };
  const entry = <SurfaceCard tone={tone} className={`ai-explanation ai-explanation__entry ai-explanation__entry--${tone} ai-explanation__stack`}>
    <View className="ai-explanation__row">
      <View><Text className="ai-explanation__label">可选补充</Text><Text className="ai-explanation__title">深度解读</Text></View>
      <AIExplanationIllustration size="small" />
    </View>
    {state.view === 'checking' ? <Text className="ai-explanation__caption">正在查询可用状态…</Text> : navigable ? <>
      {statusLabel && <Text className={`ai-explanation__entry-status-label ai-explanation__entry-status-label--${state.view}`}>{statusLabel}</Text>}
      {state.view === 'waiting' || state.view === 'failed' ? <View className="ai-explanation__entry-status">
        <Text className="ai-explanation__heading">{copy.title}</Text>
        <Text className="ai-explanation__caption">{copy.description}</Text>
      </View> : <Text className="ai-explanation__caption">{tone === 'personality' ? '从性格、职业与关系三个主题继续探索。仅作补充参考，不替代标准报告。' : '帮助理解维度之间的关系与日常建议，仅作补充参考，不替代标准报告。'}</Text>}
      <ActionButton tone={tone} className={tone === 'personality' ? 'mbti-report-entry-action' : ''} variant="secondary" block onClick={onOpen}>{label}</ActionButton>
    </> : <>
      <Text className="ai-explanation__heading">{copy.title}</Text>
      <Text className="ai-explanation__caption">{copy.description}</Text>
      {copy.action && <ActionButton variant="ghost" onClick={refresh}>刷新状态</ActionButton>}
    </>}
  </SurfaceCard>;
  return render ? <>{render(entry, navigable ? { label, onClick: onOpen } : undefined)}</> : entry;
}
