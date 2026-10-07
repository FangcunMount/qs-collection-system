import React, { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import PageShell from '@/shared/ui/PageShell';
import ActionButton from '@/shared/ui/ActionButton';
import { routes } from '@/shared/config/routes';
import { useAIExplanation } from '../hooks/useAIExplanation';
import AIExplanationIllustration from '../components/ai-explanation/AIExplanationIllustration';
import AIExplanationContent from '../components/ai-explanation/AIExplanationContent';
import AIExplanationSourceNotice from '../components/ai-explanation/AIExplanationSourceNotice';
import AIExplanationStatePanel from '../components/ai-explanation/AIExplanationStatePanel';
import MBTIReportSource from '../components/ai-explanation/MBTIReportSource';
import PersonalityReportBrand from '../components/report/PersonalityReportBrand';
import { useMBTIReportSource } from '../hooks/useMBTIReportSource';
import type { MBTITheme } from '@/services/api/mbtiThreeTopicOutput';
import '../components/ai-explanation/index.less';
import '../components/ai-explanation/mbti-report.less';
import '../components/ai-explanation/presentation.less';

export default function AIExplanationPage() {
  const params = Taro.useRouter().params;
  const tone = params.kind === 'personality' ? 'personality' : 'medical';
  const scope = { assessmentId: params.aid || '', testeeId: params.t || '' };
  const { state, visible, start, refresh, prepare } = useAIExplanation(scope, { requestId: params.gid });
  // Static is the accessible default on mini-program runtimes without reliable OS motion preferences.
  const [motion, setMotion] = useState(false);
  const output = state.output;
  const returnToReport = () => {
    if (Taro.getCurrentPages().length > 1) { void Taro.navigateBack({ delta: 1 }); return; }
    void Taro.redirectTo({ url: scope.assessmentId && scope.testeeId ? (tone === 'personality' ? routes.personalityReport : routes.assessmentReport)({ aid: scope.assessmentId, t: scope.testeeId }) : routes.assessmentRecords({}) });
  };
  const generated = state.view === 'generated' && output?.content;
  const mbti = tone === 'personality' && !!generated && generated.schema_version === 'ai-explanation-output/v2';
  const source = useMBTIReportSource(scope, output, visible && tone === 'personality' &&
    (mbti || state.view === 'ready' || state.view === 'waiting' || state.view === 'submitting'));
  const [scrollTarget, setScrollTarget] = useState('');
  const selectTopic = (topic: MBTITheme) => {
    setScrollTarget('');
    Taro.nextTick(() => setScrollTarget(`mbti-topic-${topic}`));
  };
  const waiting = state.view === 'waiting' || state.view === 'submitting';
  return <PageShell tone={tone} scrollIntoView={scrollTarget} className={`ai-explanation ai-explanation--${tone} ${mbti ? 'mbti-ai-report' : ''} ${motion && visible ? 'ai-explanation--motion' : ''}`}>
    <View className="ai-explanation__page ai-explanation__stack">
      {output?.source_state && (!mbti || output.source_state !== 'current') && (generated || (state.view === 'waiting' && output.source_state !== 'current')) &&
        <AIExplanationSourceNotice state={output.source_state} />}
      {generated ? <View className={`ai-explanation__stack ${state.animateCompletion ? 'ai-explanation__complete' : ''}`}>
        <Text className="ai-explanation__completion-status">已生成</Text>
        {mbti ? <>
          <PersonalityReportBrand />
          <MBTIReportSource key={output?.artifact_id} report={source.report} loading={source.loading} onReturn={returnToReport} />
        </> : <View className="ai-explanation__reading-header ai-explanation__row">
          <View><Text className="ai-explanation__label">本次测评 · 深度解读</Text><Text className="ai-explanation__title">深度解读已生成</Text></View>
          <AIExplanationIllustration size="small" />
        </View>}
        <AIExplanationContent content={generated} references={output?.reference_material} onTopicSelect={mbti ? selectTopic : undefined} />
        {output?.source_state !== 'current' && <ActionButton variant="ghost" onClick={refresh}>刷新状态</ActionButton>}
      </View> : <AIExplanationStatePanel state={state} tone={tone} report={source.report} onReturn={returnToReport}
        onAction={() => state.view === 'ready' ? void start() : state.view === 'unconfirmed' ? prepare() : refresh()} />}
      {(waiting || state.view === 'ready') && <ActionButton className="ai-explanation__motion-toggle" variant="ghost" onClick={() => setMotion(value => !value)}>{motion ? '减少动画' : '开启轻量动画'}</ActionButton>}
      {generated && <ActionButton tone={tone} className={mbti ? 'mbti-report-action' : ''} variant={mbti ? 'primary' : 'secondary'} block onClick={returnToReport}>{mbti ? '返回关联标准报告' : '返回标准报告'}</ActionButton>}
    </View>
  </PageShell>;
}
