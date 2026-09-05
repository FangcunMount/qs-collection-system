import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AIExplanationContent from '../AIExplanationContent';
import AIExplanationSourceNotice from '../AIExplanationSourceNotice';
import { generated } from '../../../../../../scripts/test/fixtures/aiExplanation';

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
