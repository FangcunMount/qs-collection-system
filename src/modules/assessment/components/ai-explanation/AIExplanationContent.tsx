import React, { useState } from 'react';
import { Button, Text, View } from '@tarojs/components';
import SurfaceCard from '@/shared/ui/SurfaceCard';
import type { AIContent } from '@/services/api/aiExplanationApi';

function ExplanationDetail({ label, children }: { label: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return <View className="ai-explanation__detail">
    <Button className="ai-explanation__detail-toggle" hoverClass="ai-explanation__detail-toggle--pressed" onClick={() => setExpanded((value) => !value)}>
      <Text>{expanded ? `收起${label}` : `查看${label}`}</Text><Text>{expanded ? '−' : '+'}</Text>
    </Button>
    {expanded && <View className="ai-explanation__stack ai-explanation__detail-content">{children}</View>}
  </View>;
}

export default function AIExplanationContent({ content }: { content: AIContent }) {
  return <View className="ai-explanation__stack">
    <View className="ai-explanation__stack">
      <Text className="ai-explanation__caption">AI 生成内容 · 仅作补充参考，不替代标准报告</Text>
      <Text className="ai-explanation__title">整体理解</Text>
      <Text className="ai-explanation__body" selectable>{content.summary}</Text>
    </View>
    {content.integrated_insights.length > 0 && <Text className="ai-explanation__title">维度之间的联系</Text>}
    {content.integrated_insights.map((insight, i) => <SurfaceCard key={i} className="ai-explanation__stack">
      <Text className="ai-explanation__heading">{insight.title}</Text>
      <Text className="ai-explanation__body" selectable>{insight.content}</Text>
      <ExplanationDetail label="补充说明">
        <Text className="ai-explanation__body" selectable>{insight.why_it_matters}</Text>
        {insight.evidence_refs.length > 0 && <Text className="ai-explanation__caption">依据本次测评事实</Text>}
      </ExplanationDetail>
    </SurfaceCard>)}
    {content.suggestions.length > 0 && <Text className="ai-explanation__title">可以尝试的小步骤</Text>}
    {content.suggestions.map((suggestion, i) => <SurfaceCard key={i} className="ai-explanation__stack">
      <Text className="ai-explanation__label">{suggestion.origin === 'standard_derived' ? '标准建议延伸' : '日常尝试'}</Text>
      <Text className="ai-explanation__heading">{suggestion.title}</Text>
      <Text className="ai-explanation__body" selectable>{suggestion.goal}</Text>
      {suggestion.actions.map((action, j) => <Text key={j} className="ai-explanation__body" selectable>• {action}</Text>)}
      {suggestion.caution && <Text className="ai-explanation__caution" selectable>{suggestion.caution}</Text>}
      <ExplanationDetail label="建议说明">
        <Text className="ai-explanation__body" selectable>{suggestion.rationale}</Text>
        {suggestion.evidence_refs.length > 0 && <Text className="ai-explanation__caption">依据本次测评事实</Text>}
      </ExplanationDetail>
    </SurfaceCard>)}
    <View className="ai-explanation__stack ai-explanation__boundary">
      <Text className="ai-explanation__heading">使用边界</Text>
      {content.limitations.map((limitation, i) => <Text className="ai-explanation__body" key={i} selectable>{limitation}</Text>)}
    </View>
  </View>;
}
