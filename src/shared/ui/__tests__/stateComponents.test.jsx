import React from 'react';
import renderer from 'react-test-renderer';

import { ActionButton, Empty, Loading } from '@/shared/ui';
import RiskTag from '@/shared/ui/RiskTag';
import StatusTag from '@/shared/ui/StatusTag';

const collectText = (node) => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  const children = Array.isArray(node.children) ? node.children : [];
  return children.map(collectText).join('');
};

describe('shared state components', () => {
  test('StatusTag renders the configured state and falls back to normal', () => {
    const failed = renderer.create(<StatusTag status="failed" />).toJSON();
    const fallback = renderer.create(<StatusTag status="unknown" />).toJSON();

    expect(failed.props.className).toContain('status-tag-failed');
    expect(collectText(failed)).toContain('解读失败');
    expect(fallback.props.className).toContain('status-tag-normal');
    expect(collectText(fallback)).toContain('结果正常');
  });

  test('RiskTag normalizes case and preserves custom classes', () => {
    const tree = renderer.create(<RiskTag riskLevel="HIGH" className="report-risk" />).toJSON();

    expect(tree.props.className).toContain('risk-high');
    expect(tree.props.className).toContain('report-risk');
    expect(collectText(tree)).toContain('高风险');
  });

  test('Empty composes with a Qlume action', () => {
    const onClick = jest.fn();
    const component = renderer.create(
      <Empty description="暂无报告">
        <ActionButton onClick={onClick}>重新加载</ActionButton>
      </Empty>
    );

    const action = component.root.findByType('taro-button');
    action.props.onClick();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(collectText(component.toJSON())).toContain('暂无报告重新加载');
  });

  test('Loading forwards visual state props', () => {
    const tree = renderer.create(
      <Loading size={32} className="inline-loading">正在同步</Loading>
    ).toJSON();

    expect(tree.props.className).toContain('inline-loading');
    expect(tree.props).toMatchObject({ direction: 'horizontal', size: 32 });
    expect(collectText(tree)).toContain('正在同步');
  });
});
