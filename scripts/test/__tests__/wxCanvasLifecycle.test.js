import RuntimeCanvas from '../../../src/pages/assessment/components/ec-canvas/wx-canvas';
import ModuleCanvas from '../../../src/modules/assessment/components/ec-canvas/wx-canvas';
import * as echarts from '../../../src/pages/assessment/components/ec-canvas/echarts';

test.each([['runtime', RuntimeCanvas], ['module', ModuleCanvas]])('%s canvas supports real ECharts disposal with DOM event handling', (_, Canvas) => {
  const previous = { node: echarts.env.node, wxa: echarts.env.wxa };
  // The simulator can use ECharts' DOM event proxy even though input is forwarded
  // by the native ec-canvas component. Exercise the actual listener cleanup path.
  echarts.env.node = false;
  echarts.env.wxa = false;
  let chart;
  try {
    const context = { measureText: () => ({ width: 0 }), clearRect: jest.fn() };
    const canvas = new Canvas(context, 'lifecycle', true, { width: 300, height: 180 });
    chart = echarts.init(canvas, null, { width: 300, height: 180, devicePixelRatio: 1 });
    expect(() => chart.dispose()).not.toThrow();
    expect(chart.isDisposed()).toBe(true);
  } finally {
    Object.assign(echarts.env, previous);
  }
});
