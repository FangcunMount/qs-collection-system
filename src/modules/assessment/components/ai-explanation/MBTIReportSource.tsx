import React, { useState } from 'react';
import { Button, Text, View } from '@tarojs/components';
import ActionButton from '@/shared/ui/ActionButton';
import PersonalityReportHero from '../report/PersonalityReportHero';
import PersonalityDimensionScales from '../report/PersonalityDimensionScales';
import type { PersonalityReportViewModel } from '../../types';

export default function MBTIReportSource({ report, loading, onReturn }: {
  report: PersonalityReportViewModel | null; loading: boolean; onReturn: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!report) return <View className="mbti-ai-source mbti-ai-source--unavailable">
    <Text className="ai-explanation__caption">{loading ? '正在读取关联标准报告…' : '暂时无法核对关联标准报告，以下保留本次深度解读结果的事实摘要。'}</Text>
  </View>;
  return <View className="mbti-ai-source">
    <PersonalityReportHero variant="ai" modelExtra={report.hero.modelExtra} modelTitle={report.modelTitle}
      imageUrl={report.hero.imageUrl} testeeName={report.testeeName} />
    <View className="mbti-ai-source__rulers">
      <View className="mbti-ai-source__heading">
        <Text className="ai-explanation__heading">关联标准报告 · 四维标尺</Text>
        <ActionButton tone="personality" variant="ghost" onClick={onReturn}>标准报告 ›</ActionButton>
      </View>
      {report.dimensions.length > 0 ? <View className={expanded ? '' : 'mbti-ai-source__scales--compact'}>
        <PersonalityDimensionScales dimensions={report.dimensions} outcomeCode={report.outcome.code} />
      </View> : <Text className="ai-explanation__caption">关联报告未提供维度数据。</Text>}
      {report.dimensions.length > 0 && <Button className="ai-explanation__detail-toggle" onClick={() => setExpanded(value => !value)}>
        <Text>{expanded ? '收起原始报告说明' : '查看原始分与报告说明'}</Text><Text>{expanded ? '−' : '+'}</Text>
      </Button>}
      <Text className="ai-explanation__caption">标尺数据来自关联标准报告，深度解读正文不推断偏好强度。</Text>
    </View>
  </View>;
}
