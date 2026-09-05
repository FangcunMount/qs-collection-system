import React from 'react';
import renderer from 'react-test-renderer';
import AIExplanationContent from '../AIExplanationContent';
import AIExplanationSourceNotice from '../AIExplanationSourceNotice';
import { generated } from '../../../../../../scripts/test/fixtures/aiExplanation';

test('renders summary, rationale, cautions and limitations as ordinary text, without evidence drilldown', () => {
  const content = { ...generated.content, summary: '<script>private()</script>' };
  const tree = renderer.create(<AIExplanationContent content={content} />);
  const text = JSON.stringify(tree.toJSON());
  expect(text).toContain('<script>private()</script>');
  expect(text).toContain(content.suggestions[0].caution);
  expect(text).toContain(content.suggestions[0].rationale);
  expect(text).toContain(content.limitations[0]);
  expect(text).not.toContain('dimension:a'); expect(text).not.toContain('dangerouslySetInnerHTML');
  tree.unmount();
});
test.each(['current','stale','unavailable','unknown'])('source state %s has a visible textual explanation', state => {
  const tree = renderer.create(<AIExplanationSourceNotice state={state} />);
  expect(JSON.stringify(tree.toJSON())).toMatch(/本次测评|标准报告已更新|无法核实|无法确认/); tree.unmount();
});
