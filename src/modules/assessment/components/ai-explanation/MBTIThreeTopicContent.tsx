import React, { useState } from 'react';
import { Button, Text, View } from '@tarojs/components';
import SurfaceCard from '@/shared/ui/SurfaceCard';
import { mbtiBasisNames, mbtiThemeNames } from '@/services/api/mbtiThreeTopicOutput';
import { resolveMBTIReferences } from '@/services/api/mbtiReferences';
import type { MBTIReferenceSelection } from '@/services/api/mbtiReferences';
import type { MBTITheme, MBTIThemeEvidence, MBTIThreeTopicOutput } from '@/services/api/mbtiThreeTopicOutput';

function ReferenceDetail({ item, topic, references }: { item: MBTIThemeEvidence; topic: MBTITheme; references?: MBTIReferenceSelection }) {
  const [expanded, setExpanded] = useState(false);
  if (!references || item.reference_refs.length === 0) return null;
  const entries = resolveMBTIReferences(references, item, topic);
  return <View className="ai-explanation__detail">
    <Button className="ai-explanation__detail-toggle" onClick={() => setExpanded(v => !v)}>
      <Text>{expanded ? '收起参考依据' : '查看参考依据'}</Text><Text>{expanded ? '−' : '+'}</Text>
    </Button>
    {expanded && <View className="ai-explanation__stack ai-explanation__detail-content">
      {entries ? entries.map(entry => <View key={entry.entry_id} className="ai-explanation__stack">
        <Text className="ai-explanation__body" selectable>{entry.content}</Text>
        <Text className="ai-explanation__caption" selectable>适用边界：{entry.usage_boundary}</Text>
        {entry.source_ids.map(id => {
          const source = references.sources.find(s => s.source_id === id);
          return source && <View key={id} className="ai-explanation__stack">
            <Text className="ai-explanation__label">{source.title}</Text>
            <Text className="ai-explanation__caption" selectable>{source.url}</Text>
            <Text className="ai-explanation__caption" selectable>支持范围：{source.support_scope}</Text>
            <Text className="ai-explanation__caption">资料核对日期：{source.accessed_on}</Text>
          </View>;
        })}
      </View>) : <Text className="ai-explanation__caption">原始参考正文暂不可核对，没有使用最新资料补齐。</Text>}
    </View>}
  </View>;
}

export default function MBTIThreeTopicContent({ content, references }: { content: MBTIThreeTopicOutput; references?: MBTIReferenceSelection }) {
  return <View className="ai-explanation__stack">
    <Text className="ai-explanation__caption">AI 生成内容 · 结合本次标准报告阅读</Text>
    <Text className="ai-explanation__caption">通用参考与探索问题用于自我核对，不是本次测得的个人行为、职业能力或关系结论。</Text>
    {!references && <Text className="ai-explanation__caption">当前记录未保留完整参考正文与来源，无法进一步核对；没有使用最新资料补齐。</Text>}
    <Text className="ai-explanation__title">整体理解</Text>
    <Text className="ai-explanation__label">本次测评事实</Text>
    <Text className="ai-explanation__body" selectable>{content.summary.content}</Text>
    {content.sections.map((section) => <View key={section.topic} className="ai-explanation__stack">
      <Text className="ai-explanation__title">{mbtiThemeNames[section.topic]}</Text>
      {section.insights.map((item, i) => <SurfaceCard key={i} className="ai-explanation__stack">
        <Text className="ai-explanation__label">{mbtiBasisNames[item.basis]}</Text>
        <Text className="ai-explanation__heading">{item.title}</Text>
        <Text className="ai-explanation__body" selectable>{item.content}</Text>
        <ReferenceDetail item={item} topic={section.topic} references={references} />
      </SurfaceCard>)}
      <Text className="ai-explanation__heading">自我核对问题</Text>
      {section.reflection_questions.map((item, i) => <SurfaceCard key={i} className="ai-explanation__stack">
        <Text className="ai-explanation__label">探索与自我核对</Text>
        <Text className="ai-explanation__body" selectable>{item.question}</Text>
        <ReferenceDetail item={item} topic={section.topic} references={references} />
      </SurfaceCard>)}
      <Text className="ai-explanation__heading">可以尝试的行动</Text>
      {section.actions.map((item, i) => <SurfaceCard key={i} className="ai-explanation__stack">
        <Text className="ai-explanation__label">探索与自我核对</Text>
        <Text className="ai-explanation__heading">{item.title}</Text>
        <Text className="ai-explanation__body" selectable>{item.goal}</Text>
        {item.steps.map((step, j) => <Text key={j} className="ai-explanation__body" selectable>{j + 1}. {step}</Text>)}
        <ReferenceDetail item={item} topic={section.topic} references={references} />
      </SurfaceCard>)}
    </View>)}
    <View className="ai-explanation__stack ai-explanation__boundary">
      <Text className="ai-explanation__heading">使用边界</Text>
      {content.limitations.map((item, i) => <Text key={i} className="ai-explanation__body" selectable>{item}</Text>)}
    </View>
  </View>;
}
