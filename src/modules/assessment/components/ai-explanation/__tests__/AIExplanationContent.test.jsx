import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AIExplanationContent from '../AIExplanationContent';
import AIExplanationSourceNotice from '../AIExplanationSourceNotice';
import { generated } from '../../../../../../scripts/test/fixtures/aiExplanation';
import threeTopics from '../../../../../../scripts/test/fixtures/mbtiThreeTopicOutput.json';
import { parseWorkflowResult } from '../../../../../services/api/aiExplanationApi';

jest.mock('../../../../../services/servers', () => ({ request: jest.fn() }));

test('keeps actions and cautions visible, progressively reveals rationale without fabricated evidence drilldown', () => {
  const content = { ...generated.content, summary: '<script>private()</script>' };
  const tree = renderer.create(<AIExplanationContent content={content} />);
  const text = JSON.stringify(tree.toJSON());
  expect(text).toContain('<script>private()</script>');
  expect(text).toContain(content.suggestions[0].caution);
  expect(text).not.toContain(content.suggestions[0].rationale);
  expect(text).not.toContain(content.integrated_insights[0].why_it_matters);
  expect(text).toContain(content.suggestions[0].actions[0]);
  expect(text).toContain(content.limitations[0]);
  expect(text).not.toContain('dimension:a'); expect(text).not.toContain('dangerouslySetInnerHTML');
  const toggles = tree.root.findAllByType('taro-button');
  act(() => toggles[0].props.onClick());
  act(() => toggles[1].props.onClick());
  const expanded = JSON.stringify(tree.toJSON());
  expect(expanded).toContain(content.integrated_insights[0].why_it_matters);
  expect(expanded).toContain(content.suggestions[0].rationale);
  expect(expanded).not.toContain('dimension:a');
  act(() => toggles[1].props.onClick());
  expect(JSON.stringify(tree.toJSON())).not.toContain(content.suggestions[0].rationale);
  expect(JSON.stringify(tree.toJSON())).toContain(content.suggestions[0].caution);
  tree.unmount();
});
test.each(['current','stale','unavailable','unknown'])('source state %s has a visible textual explanation', state => {
  const tree = renderer.create(<AIExplanationSourceNotice state={state} />);
  expect(JSON.stringify(tree.toJSON())).toMatch(/本次测评|标准报告已更新|无法核实|无法确认/); tree.unmount();
});
test('renders three MBTI topics with questions, actions and explicit basis labels', () => {
  const view = renderer.create(<AIExplanationContent content={threeTopics} />);
  const text = JSON.stringify(view.toJSON());
  for (const label of ['性格特征与自我理解', '职业发展探索', '恋爱婚姻中的沟通与相处',
    '本次测评事实', '通用参考', '探索与自我核对', '自我核对问题', '可以尝试的行动']) {
    expect(text).toContain(label);
  }
  expect(text).toContain(threeTopics.summary.content);
  expect(text).toContain(threeTopics.sections[0].reflection_questions[0].question);
  expect(text).toContain(threeTopics.sections[0].actions[0].steps[0]);
  expect(text).toContain(threeTopics.limitations[0]);
  expect(text).not.toContain('维度之间的联系');
  expect(text).not.toContain('reference:');
});

test('reveals original reference text and source only when the reader opens its reference detail', () => {
  const artifact = require('../../../../../../scripts/test/fixtures/mbtiThreeTopicArtifact.json');
  const content = JSON.parse(artifact.content_json), references = JSON.parse(artifact.reference_material_json);
  const ref = references.entries.find(e => e.entry_id === 'personality.ei.i');
  const source = references.sources.find(s => s.source_id === ref.source_ids[0]);
  const view = renderer.create(<AIExplanationContent content={content} references={references} />);
  expect(JSON.stringify(view.toJSON())).not.toContain(ref.content);
  act(() => view.root.findAllByType('taro-button')[0].props.onClick());
  const text = JSON.stringify(view.toJSON());
  expect(text).toContain(ref.content); expect(text).toContain(ref.usage_boundary);
  expect(text).toContain(source.title); expect(text).toContain(source.url);
  expect(text).not.toContain('reference:personality');
  view.unmount();
});

test('renders a validated exploration result with all three themes and original reference detail', () => {
  const artifact = require('../../../../../../scripts/test/fixtures/mbtiThreeTopicArtifact.json');
  const references = JSON.parse(artifact.reference_material_json);
  Object.assign(references, { model_code: 'MBTI_FC_93', model_version: 'v55-report-202608-v1' });
  const id = '00000000-0000-4000-8000-000000000001';
  const result = parseWorkflowResult({ request_id: id, status: 'completed', version: 5,
    artifact_id: artifact.id, report_id: '99', source_version: 'report-v1:101',
    content: JSON.parse(artifact.content_json), reference_material: references,
    reference_material_fingerprint: artifact.reference_material_fingerprint }, id);
  const view = renderer.create(<AIExplanationContent content={result.content} references={result.reference_material} />);
  const text = JSON.stringify(view.toJSON());
  for (const label of ['性格特征与自我理解', '职业发展探索', '恋爱婚姻中的沟通与相处']) expect(text).toContain(label);
  act(() => view.root.findAllByType('taro-button')[0].props.onClick());
  expect(JSON.stringify(view.toJSON())).toContain(references.entries.find(e => e.entry_id === 'personality.ei.i').content);
  view.unmount();
});
