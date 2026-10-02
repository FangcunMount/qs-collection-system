import React from 'react';
import { Text, View } from '@tarojs/components';
import SurfaceCard from '@/shared/ui/SurfaceCard';
import { mbtiBasisNames, mbtiThemeNames } from '@/services/api/mbtiThreeTopicOutput';
import type { MBTIThreeTopicOutput } from '@/services/api/mbtiThreeTopicOutput';

export default function MBTIThreeTopicContent({ content }: { content: MBTIThreeTopicOutput }) {
  return <View className="ai-explanation__stack">
    <Text className="ai-explanation__caption">AI 生成内容 · 结合本次标准报告阅读</Text>
    <Text className="ai-explanation__caption">通用参考与探索问题用于自我核对，不是本次测得的个人行为、职业能力或关系结论。</Text>
    <Text className="ai-explanation__title">整体理解</Text>
    <Text className="ai-explanation__label">本次测评事实</Text>
    <Text className="ai-explanation__body" selectable>{content.summary.content}</Text>
    {content.sections.map((section) => <View key={section.topic} className="ai-explanation__stack">
      <Text className="ai-explanation__title">{mbtiThemeNames[section.topic]}</Text>
      {section.insights.map((item, i) => <SurfaceCard key={i} className="ai-explanation__stack">
        <Text className="ai-explanation__label">{mbtiBasisNames[item.basis]}</Text>
        <Text className="ai-explanation__heading">{item.title}</Text>
        <Text className="ai-explanation__body" selectable>{item.content}</Text>
      </SurfaceCard>)}
      <Text className="ai-explanation__heading">自我核对问题</Text>
      {section.reflection_questions.map((item, i) => <SurfaceCard key={i} className="ai-explanation__stack">
        <Text className="ai-explanation__label">探索与自我核对</Text>
        <Text className="ai-explanation__body" selectable>{item.question}</Text>
      </SurfaceCard>)}
      <Text className="ai-explanation__heading">可以尝试的行动</Text>
      {section.actions.map((item, i) => <SurfaceCard key={i} className="ai-explanation__stack">
        <Text className="ai-explanation__label">探索与自我核对</Text>
        <Text className="ai-explanation__heading">{item.title}</Text>
        <Text className="ai-explanation__body" selectable>{item.goal}</Text>
        {item.steps.map((step, j) => <Text key={j} className="ai-explanation__body" selectable>{j + 1}. {step}</Text>)}
      </SurfaceCard>)}
    </View>)}
    <View className="ai-explanation__stack ai-explanation__boundary">
      <Text className="ai-explanation__heading">使用边界</Text>
      {content.limitations.map((item, i) => <Text key={i} className="ai-explanation__body" selectable>{item}</Text>)}
    </View>
  </View>;
}
