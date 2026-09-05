import React from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import ActionButton from '@/shared/ui/ActionButton';
import SurfaceCard from '@/shared/ui/SurfaceCard';
import { routes } from '@/shared/config/routes';
import type { AIScope } from '@/services/api/aiExplanationApi';
import { useAIExplanation } from '../../hooks/useAIExplanation';
import AIExplanationIllustration from './AIExplanationIllustration';
import './index.less';

export default function AIExplanationEntryCard(scope: AIScope) {
  const { state, refresh } = useAIExplanation(scope, { poll: false });
  if (['authRequired','invalid','forbidden'].includes(state.view)) return null;
  if (state.output?.status === 'not_applicable') return null;
  const navigable = ['ready','waiting','generated','failed'].includes(state.view);
  const label = state.view === 'generated' ? '查看 AI 解读' : state.view === 'waiting' ? '解读正在生成 · 查看进度' :
    state.view === 'failed' ? '本次解读未完成 · 查看状态' : '请求 AI 解读';
  return <SurfaceCard tone="medical" className="ai-explanation ai-explanation__entry ai-explanation__stack">
    <View className="ai-explanation__row">
      <View><Text className="ai-explanation__label">可选补充</Text><Text className="ai-explanation__title">AI 补充解读</Text></View>
      <AIExplanationIllustration size="entry" />
    </View>
    {state.view === 'checking' ? <Text className="ai-explanation__caption">正在查询可用状态…</Text> : navigable ? <>
      <Text className="ai-explanation__body">基于本次测评结果，帮助理解维度之间的关系，并提供日常建议。</Text>
      <Text className="ai-explanation__caption">仅作补充参考，不替代标准报告。</Text>
      <ActionButton block onClick={() => Taro.navigateTo({ url: routes.aiExplanation({ aid: scope.assessmentId, t: scope.testeeId, gid: state.generationId }) })}>{label}</ActionButton>
    </> : <>
      <Text className="ai-explanation__caption">AI 解读暂时不可用，标准报告可继续阅读。</Text>
      <ActionButton variant="ghost" onClick={refresh}>刷新状态</ActionButton>
    </>}
  </SurfaceCard>;
}
