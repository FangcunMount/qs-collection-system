import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { clearPrivateSessionState } from '@/shared/stores/sessionPrivacy';
import { loadMBTIReportSource } from '../../services/loadMBTIReportSource';
import { useMBTIReportSource } from '../useMBTIReportSource';
import type { AIOutput, AIScope } from '@/services/api/aiExplanationApi';

jest.mock('../../services/loadMBTIReportSource', () => ({ loadMBTIReportSource: jest.fn() }));
const load = loadMBTIReportSource as jest.Mock;
const scope = { assessmentId: '101', testeeId: '201' };
const output: AIOutput = { status: 'generated', source_report_id: '99', source_state: 'current', artifact_id: 'artifact1' };
let current: ReturnType<typeof useMBTIReportSource>;
const Probe = ({ enabled = true, selected = output, selectedScope = scope }: { enabled?: boolean; selected?: AIOutput; selectedScope?: AIScope }) => {
  current = useMBTIReportSource(selectedScope, selected, enabled); return null;
};
const tick = async () => { await act(async () => { await Promise.resolve(); }); };

test('hides the source immediately when the output becomes stale', async () => {
  load.mockResolvedValue({ testeeName: 'current person' });
  let view: renderer.ReactTestRenderer;
  act(() => { view = renderer.create(<Probe />); }); await tick();
  expect(current.report?.testeeName).toBe('current person');
  act(() => view.update(<Probe selected={{ ...output, source_state: 'stale' }} />));
  expect(current.report).toBeNull(); expect(load).toHaveBeenCalledTimes(1);
  act(() => view.unmount());
});
test('session clearing discards old data and does not reload an old output under the new session', async () => {
  load.mockResolvedValue({ testeeName: 'old account' });
  let view: renderer.ReactTestRenderer;
  act(() => { view = renderer.create(<Probe />); }); await tick();
  act(() => clearPrivateSessionState()); await tick();
  expect(current.report).toBeNull(); expect(load).toHaveBeenCalledTimes(1);
  act(() => view.update(<Probe selected={{ ...output }} />)); await tick();
  expect(load).toHaveBeenCalledTimes(2);
  act(() => view.unmount());
});
test('a late response after hiding cannot appear when the page is shown again', async () => {
  let settle!: (value: unknown) => void;
  load.mockImplementationOnce(() => new Promise(resolve => { settle = resolve; }));
  let view: renderer.ReactTestRenderer;
  act(() => { view = renderer.create(<Probe />); });
  const lifetime = load.mock.calls[0][3];
  act(() => view.update(<Probe enabled={false} />));
  expect(lifetime.isActive()).toBe(false);
  await act(async () => { settle({ testeeName: 'hidden response' }); });
  expect(current.report).toBeNull();
  load.mockImplementationOnce(() => new Promise(() => {}));
  act(() => view.update(<Probe />));
  expect(current.report).toBeNull(); expect(current.loading).toBe(true);
  act(() => view.unmount());
});
test('scope changes cannot expose the old person while the next report loads', async () => {
  load.mockResolvedValueOnce({ testeeName: 'old person' });
  let view: renderer.ReactTestRenderer;
  act(() => { view = renderer.create(<Probe />); }); await tick();
  load.mockImplementationOnce(() => new Promise(() => {}));
  act(() => view.update(<Probe selectedScope={{ assessmentId: '102', testeeId: '202' }} />));
  expect(current.report).toBeNull(); expect(current.loading).toBe(true);
  act(() => view.unmount());
});
