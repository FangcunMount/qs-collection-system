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

export default function AIExplanationEntryCard({ tone = 'medical', ...scope }: AIScope & { tone?: 'medical' | 'personality' }) {
  const { state, refresh } = useAIExplanation(scope, { poll: false });
  const copy = aiStateCopy(state);
  const navigable = ['ready','waiting','generated','failed'].includes(state.view);
  const label = state.view === 'generated' ? '查看 AI 解读' : state.view === 'waiting' ? '解读正在生成 · 查看进度' :
    state.view === 'failed' ? '本次解读未完成 · 查看状态' : '请求 AI 解读';
  return <SurfaceCard tone={tone} className={`ai-explanation ai-explanation__entry ai-explanation__entry--${tone} ai-explanation__stack`}>
    <View className="ai-explanation__row">
      <View><Text className="ai-explanation__label">可选补充</Text><Text className="ai-explanation__title">AI 补充解读</Text></View>
      <AIExplanationIllustration size="small" />
    </View>
    {state.view === 'checking' ? <Text className="ai-explanation__caption">正在查询可用状态…</Text> : navigable ? <>
      <Text className="ai-explanation__caption">帮助理解维度之间的关系与日常建议，仅作补充参考，不替代标准报告。</Text>
      <ActionButton variant="secondary" block onClick={() => Taro.navigateTo({ url: routes.aiExplanation({ aid: scope.assessmentId, t: scope.testeeId, gid: state.generationId, kind: tone === 'personality' ? 'personality' : undefined }) })}>{label}</ActionButton>
    </> : <>
      <Text className="ai-explanation__heading">{copy.title}</Text>
      <Text className="ai-explanation__caption">{copy.description}</Text>
      {copy.action && <ActionButton variant="ghost" onClick={refresh}>刷新状态</ActionButton>}
    </>}
  </SurfaceCard>;
}
