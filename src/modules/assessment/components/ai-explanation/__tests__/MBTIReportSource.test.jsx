import React from 'react';
import renderer, { act } from 'react-test-renderer';
import MBTIReportSource from '../MBTIReportSource';

const dimensions = [['EI', '外向 / 内向', 'E', 44], ['SN', '感觉 / 直觉', 'N', 40], ['TF', '思考 / 情感', 'F', 30], ['JP', '判断 / 知觉', 'P', 40]];
const report = { tone: 'personality', modelTitle: '16人格测评（探索版）', modelCode: 'MBTI_FC_93', testeeName: '示例', testeeId: '201', createdAt: '',
  outcome: { code: 'ENFP', title: '竞选者', summary: '', rarityLabel: '', percentile: null },
  hero: { conclusion: '', imageUrl: 'https://example.com/ENFP/portrait.png', modelExtra: { type_code: 'ENFP', type_name: '竞选者', tagline: '不应混入本次测评事实' } },
  dimensions: dimensions.map(([code, title, preference, strength]) => ({ factor_code: String(code), title: String(title), preference: String(preference), strength: Number(strength),
    description: `原始说明-${code}`, score: 11, max_score: null, left_pole: '', right_pole: '', suggestion: '', risk_level: '' })),
  suggestions: [], sections: [], hasContent: true };

test('renders all four original bipolar rulers and original character without rewriting AI facts', () => {
  const view = renderer.create(<MBTIReportSource report={report} loading={false} onReturn={() => {}} />);
  const text = JSON.stringify(view.toJSON());
  expect(view.root.findByType('taro-image').props.src).toBe(report.hero.imageUrl);
  for (const direction of ['偏向 E · 72%', '偏向 N · 70%', '偏向 F · 65%', '偏向 P · 70%']) expect(text).toContain(direction);
  const markers = view.root.findAll(node => node.type === 'taro-view' && node.props.className === 'pr-dimension-scale__marker');
  expect(markers.map(node => node.props.style.left)).toEqual(['28%', '70%', '65%', '70%']);
  expect(text).toContain('感觉'); expect(text).toContain('知觉');
  expect(text).not.toContain('不应混入本次测评事实');
  act(() => view.root.findAllByType('taro-button').find(button => button.props.className === 'ai-explanation__detail-toggle').props.onClick());
  expect(JSON.stringify(view.toJSON())).toContain('收起原始报告说明');
  expect(JSON.stringify(view.toJSON())).not.toContain('mbti-ai-source__scales--compact');
  for (const [code] of dimensions) expect(JSON.stringify(view.toJSON())).toContain(`原始说明-${code}`);
  view.unmount();
});
test('missing source does not fabricate a character or dimension values', () => {
  const view = renderer.create(<MBTIReportSource report={null} loading={false} onReturn={() => {}} />);
  expect(view.root.findAllByType('taro-image')).toHaveLength(0);
  expect(JSON.stringify(view.toJSON())).not.toContain('72%');
  expect(JSON.stringify(view.toJSON())).toContain('暂时无法核对关联标准报告');
  view.unmount();
});
