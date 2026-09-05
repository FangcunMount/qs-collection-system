import React, { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import PageShell from '@/shared/ui/PageShell';
import SurfaceCard from '@/shared/ui/SurfaceCard';
import ActionButton from '@/shared/ui/ActionButton';
import { routes } from '@/shared/config/routes';
import { useAIExplanation } from '../hooks/useAIExplanation';
import { aiStateCopy } from '../viewModels/aiExplanation';
import AIExplanationIllustration from '../components/ai-explanation/AIExplanationIllustration';
import AIExplanationContent from '../components/ai-explanation/AIExplanationContent';
import AIExplanationSourceNotice from '../components/ai-explanation/AIExplanationSourceNotice';
import '../components/ai-explanation/index.less';

export default function AIExplanationPage() {
  const params = Taro.useRouter().params;
  const scope = { assessmentId: params.aid || '', testeeId: params.t || '' };
  const { state, visible, start, refresh, prepare } = useAIExplanation(scope, { generationId: params.gid });
  // Static is the accessible default on mini-program runtimes without reliable OS motion preferences.
  const [motion, setMotion] = useState(false);
  const copy = aiStateCopy(state);
  const output = state.output;
  const returnToReport = () => {
    if (Taro.getCurrentPages().length > 1) { void Taro.navigateBack({ delta: 1 }); return; }
    void Taro.redirectTo({ url: scope.assessmentId && scope.testeeId ? routes.assessmentReport({ aid: scope.assessmentId, t: scope.testeeId }) : routes.assessmentRecords({}) });
  };
  const generated = state.view === 'generated' && output?.content;
  const waiting = state.view === 'waiting' || state.view === 'submitting';
  return <PageShell tone="medical" className={`ai-explanation ${motion && visible ? 'ai-explanation--motion' : ''}`}>
    <View className="ai-explanation__page ai-explanation__stack">
      {output?.source_state && (generated || (state.view === 'waiting' && output.source_state !== 'current')) &&
        <AIExplanationSourceNotice state={output.source_state} />}
      {generated ? <View className={`ai-explanation__stack ${state.animateCompletion ? 'ai-explanation__complete' : ''}`}>
        <View className="ai-explanation__row ai-explanation__row--leading">
          <AIExplanationIllustration size="small" /><Text className="ai-explanation__heading">补充解读已生成</Text>
        </View>
        <AIExplanationContent content={generated} />
        {output?.source_state !== 'current' && <ActionButton variant="ghost" onClick={refresh}>刷新状态</ActionButton>}
      </View> : <SurfaceCard tone={state.view === 'ready' ? 'medical' : 'neutral'} className={`ai-explanation__stack ${waiting ? 'ai-explanation__wait' : ''}`}>
        {(state.view === 'ready' || waiting) && <AIExplanationIllustration />}
        <Text className="ai-explanation__title">{copy.title}</Text>
        <Text className="ai-explanation__body">{copy.description}</Text>
        {state.view === 'ready' && <>
          <Text className="ai-explanation__body">只使用本次测评的结构化结果，不读取原始答案或历史测评。</Text>
          <Text className="ai-explanation__caption">AI 内容仅作补充参考，不替代标准报告。生成需要一些时间，期间可以离开页面。</Text>
        </>}
        {waiting && <View className="ai-explanation__dots" aria-hidden="true"><View /><View /><View /></View>}
        {copy.action && <ActionButton block onClick={() => state.view === 'ready' ? void start() : state.view === 'unconfirmed' ? prepare() : refresh()}>{copy.action}</ActionButton>}
      </SurfaceCard>}
      {(waiting || state.view === 'ready') && <ActionButton variant="ghost" onClick={() => setMotion(value => !value)}>{motion ? '减少动画' : '开启轻量动画'}</ActionButton>}
      <ActionButton variant="secondary" block onClick={returnToReport}>返回标准报告</ActionButton>
    </View>
  </PageShell>;
}
