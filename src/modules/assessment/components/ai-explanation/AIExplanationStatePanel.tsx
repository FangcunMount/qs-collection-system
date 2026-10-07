import React, { useState } from 'react';
import { Image, Text, View } from '@tarojs/components';
import SurfaceCard from '@/shared/ui/SurfaceCard';
import ActionButton from '@/shared/ui/ActionButton';
import type { AIState } from '../../services/aiExplanationController';
import type { PersonalityReportViewModel } from '../../types';
import { aiStateCopy } from '../../viewModels/aiExplanation';
import AIExplanationIllustration from './AIExplanationIllustration';

// Commands stay with the page/controller; this panel only presents the journey.
export default function AIExplanationStatePanel({ state, tone, report, onAction, onReturn }: {
  state: AIState; tone: 'medical' | 'personality'; report: PersonalityReportViewModel | null;
  onAction: () => void; onReturn: () => void;
}) {
  const [failedImage, setFailedImage] = useState('');
  const copy = aiStateCopy(state);
  const ready = state.view === 'ready';
  const submitting = state.view === 'submitting';
  const waiting = state.view === 'waiting';
  const active = waiting || submitting;
  const topics = tone === 'personality'
    ? ['性格特征与自我理解', '职业发展探索', '恋爱婚姻中的沟通与相处']
    : ['维度之间的联系', '可以尝试的小步骤'];
  const imageUrl = report?.hero.imageUrl || '';
  const showCharacter = ready && imageUrl && imageUrl !== failedImage;
  return <View className={`ai-explanation__state ai-explanation__stack ${active ? 'ai-explanation__state--waiting' : ''}`}>
    <View className="ai-explanation__state-header">
      <View className="ai-explanation__state-intro">
        <Text className="ai-explanation__label">{tone === 'personality' ? 'Qlume · 人格探索' : 'Qlume · AI 补充解读'}</Text>
        <Text className="ai-explanation__title">{ready && tone === 'personality' ? '从三个主题继续探索' : copy.title}</Text>
      </View>
      {showCharacter ? <Image className="ai-explanation__state-character" src={imageUrl} mode="aspectFit" onError={() => setFailedImage(imageUrl)} />
        : ready && <AIExplanationIllustration size="entry" />}
    </View>
    {active && <AIExplanationIllustration size="hero" />}
    <Text className="ai-explanation__body">{ready && tone === 'personality'
      ? '结合本次标准报告，从性格理解、职业探索与关系沟通三个主题继续了解自己。' : copy.description}</Text>
    {(ready || active) && <SurfaceCard tone="neutral" className="ai-explanation__context">
      <Text className="ai-explanation__label">基于本次标准报告</Text>
      <Text className="ai-explanation__heading">{report ? `${report.outcome.code} · ${report.modelTitle}` : '关联本次测评'}</Text>
      {report?.testeeName && <Text className="ai-explanation__caption">{report.testeeName}</Text>}
      {!report && <Text className="ai-explanation__caption">只使用本次测评相关信息，不合并历史测评。</Text>}
    </SurfaceCard>}
    {ready && <SurfaceCard tone="neutral" className="ai-explanation__scope-card">
      <Text className="ai-explanation__heading">你将看到</Text>
      <View className="ai-explanation__topics">{topics.map((topic, index) => <View key={topic} className={`ai-explanation__topic ai-explanation__topic--${index}`}>
        <Text className="ai-explanation__topic-number">{String(index + 1).padStart(2, '0')}</Text><Text className="ai-explanation__body">{topic}</Text>
      </View>)}</View>
      <Text className="ai-explanation__caption">{tone === 'personality'
        ? '区分测评事实、通用参考与自我核对。不用于岗位适配或伴侣匹配定论。'
        : 'AI 内容不替代标准报告与专业判断。'}</Text>
    </SurfaceCard>}
    {ready && <Text className="ai-explanation__privacy-note">只使用本次测评的结构化结果，不读取原始答案或历史测评。</Text>}
    {active && <View className="ai-explanation__waiting-cue">
      <View className="ai-explanation__dots" aria-hidden="true"><View /><View /><View /></View>
      <Text className="ai-explanation__heading">可以先阅读标准报告</Text>
      <Text className="ai-explanation__caption">离开页面不会取消已接收的请求。</Text>
      {waiting && !state.refreshError && <Text className="ai-explanation__caption">停留在页面时自动核对状态</Text>}
    </View>}
    {state.view === 'failed' && <View className="ai-explanation__state-note"><Text className="ai-explanation__caption">标准报告仍可正常查看。刷新只核对已有请求，不会重新生成。</Text></View>}
    {state.view === 'unconfirmed' && <View className="ai-explanation__state-note"><Text className="ai-explanation__caption">保留本次请求信息，继续核对同一次请求。</Text></View>}
    <View className="ai-explanation__state-actions">
      {submitting && <ActionButton tone={tone} block disabled loading>正在提交请求</ActionButton>}
      {copy.action && <ActionButton tone={tone} block onClick={onAction}>{copy.action}</ActionButton>}
      <ActionButton tone={tone} variant="secondary" block onClick={onReturn}>返回标准报告</ActionButton>
      {waiting && <ActionButton tone={tone} variant="ghost" block onClick={onAction}>刷新状态</ActionButton>}
    </View>
  </View>;
}
