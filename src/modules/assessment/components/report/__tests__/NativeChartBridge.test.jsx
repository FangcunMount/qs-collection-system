import React from 'react';
import renderer, { act } from 'react-test-renderer';
import TrendLineChart from '../TrendLineChart';
import RadarChart from '../RadarChart';
import FactorBarChart from '../FactorBarChart';
import FactorScatterChart from '../FactorScatterChart';
import BehaviorNormComparisonChart from '../BehaviorNormComparisonChart';
import * as echarts from '@/pages/assessment/components/ec-canvas/echarts';

jest.mock('@/pages/assessment/components/ec-canvas/echarts', () => ({ init: jest.fn(), setPlatformAPI: jest.fn() }));
jest.mock('@/modules/assessment/components/ec-canvas/echarts', () => ({ setPlatformAPI: jest.fn() }));
let tree;
const newChart = () => ({ setOption: jest.fn(), dispose: jest.fn(), getZr: () => ({ handler: { dispatch: jest.fn(), processGesture: jest.fn() } }) });
afterEach(() => { if (tree) act(() => tree.unmount()); tree = undefined; jest.clearAllMocks(); });

test.each([TrendLineChart, RadarChart, FactorBarChart, FactorScatterChart, BehaviorNormComparisonChart])('%p initializes through the native event after ec properties have been serialized', (Chart) => {
  const chart = newChart(); echarts.init.mockReturnValue(chart);
  act(() => { tree = renderer.create(<Chart />); });
  const native = tree.root.findByType('ec-canvas');
  expect(JSON.parse(JSON.stringify(native.props.ec))).toEqual({});
  expect(echarts.init).not.toHaveBeenCalled();
  const canvas = { setChart: jest.fn() };
  act(() => native.props.onInit({ detail: { canvas, width: 320, height: 180, dpr: 2 } }));
  expect(echarts.init).toHaveBeenCalledWith(canvas, null, { width: 320, height: 180, devicePixelRatio: 2 });
  expect(canvas.setChart).toHaveBeenCalledWith(chart);
  expect(chart.setOption).toHaveBeenCalled();
  act(() => tree.unmount()); tree = undefined;
  expect(chart.dispose).toHaveBeenCalledTimes(1);
});

test('late native init uses current data, replacing a canvas releases the old chart, and unmounted init is ignored', () => {
  const first = newChart(), second = newChart(); echarts.init.mockReturnValueOnce(first).mockReturnValueOnce(second);
  act(() => { tree = renderer.create(<TrendLineChart points={[{ label: 'A', value: 1 }]} />); });
  const onInit = tree.root.findByType('ec-canvas').props.onInit;
  act(() => tree.update(<TrendLineChart points={[{ label: 'B', value: 0 }]} />));
  const detail = { canvas: { setChart: jest.fn() }, width: 320, height: 180, canvasDpr: 1 };
  act(() => onInit({ detail }));
  expect(first.setOption.mock.calls[0][0].series[0].data).toEqual([0]);
  act(() => onInit({ detail }));
  expect(first.dispose).toHaveBeenCalledTimes(1);
  act(() => tree.unmount()); tree = undefined;
  onInit({ detail });
  expect(echarts.init).toHaveBeenCalledTimes(2);
  expect(second.dispose).toHaveBeenCalledTimes(1);
});

test.each(['pages', 'modules'])('%s native component retains the event-created chart for touch forwarding', (folder) => {
  const savedComponent = global.Component, savedWx = global.wx;
  let definition;
  global.Component = value => { definition = value; };
  global.wx = { getSystemInfoSync: () => ({ pixelRatio: 2 }), createSelectorQuery: () => {
    const query = { in: () => query, select: () => query, fields: () => query,
      exec: callback => callback([{ node: { getContext: () => ({}) }, width: 320, height: 180 }]) };
    return query;
  } };
  try {
    require(`@/${folder}/assessment/components/ec-canvas/ec-canvas`);
    const dispatch = jest.fn(), processGesture = jest.fn();
    const chart = { ...newChart(), getZr: () => ({ handler: { dispatch, processGesture } }) };
    echarts.init.mockReturnValue(chart);
    act(() => { tree = renderer.create(<TrendLineChart points={[{ label: 'A', value: 1 }]} />); });
    const host = { data: { ec: {}, canvasId: 'native-chart' }, triggerEvent: (name, detail) => {
      expect(name).toBe('init');
      tree.root.findByType('ec-canvas').props.onInit({ detail });
    } };
    act(() => definition.methods.initByNewWay.call(host));
    expect(host.chart).toBe(chart);
    definition.methods.touchStart.call(host, { touches: [{ x: 12, y: 14 }] });
    expect(dispatch).toHaveBeenCalledWith('mousedown', expect.objectContaining({ zrX: 12, zrY: 14 }));
    expect(processGesture).toHaveBeenCalled();
  } finally { global.Component = savedComponent; global.wx = savedWx; }
});

test.each(['pages', 'modules'])('%s chooses the canvas before querying it and waits for the render callback', folder => {
  const savedComponent = global.Component, savedWx = global.wx;
  let definition;
  global.Component = value => { definition = value; };
  global.wx = { getSystemInfoSync: () => ({ SDKVersion: '2.24.7' }) };
  try {
    const path = `@/${folder}/assessment/components/ec-canvas/ec-canvas`;
    jest.isolateModules(() => require(path));
    expect(definition.data.isUseNewCanvas).toBeNull();
    let rendered;
    const host = { data: { forceUseOldCanvas: false }, setData: jest.fn((data, callback) => { rendered = callback; }),
      initByNewWay: jest.fn(), initByOldWay: jest.fn() };
    definition.methods.init.call(host);
    expect(host.setData).toHaveBeenCalledWith({ isUseNewCanvas: true }, expect.any(Function));
    expect(host.initByNewWay).not.toHaveBeenCalled();
    rendered();
    expect(host.initByNewWay).toHaveBeenCalledTimes(1);
    expect(host.initByOldWay).not.toHaveBeenCalled();
  } finally { global.Component = savedComponent; global.wx = savedWx; }
});
