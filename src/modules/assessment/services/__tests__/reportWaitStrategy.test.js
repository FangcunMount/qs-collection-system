import { createReportWaitStrategy } from '../reportWaitStrategy';

describe('report wait strategy routing', () => {
  test('uses the behavior HTTP facade and websocket discriminator for ability assessments', () => {
    const strategy = createReportWaitStrategy('ability');
    expect(strategy.kind).toBe('ability');
    expect(strategy.eventKind).toBe('behavior');
    expect(strategy.pollReportStatus).toEqual(expect.any(Function));
  });

  test('keeps medical and personality websocket discriminators unchanged', () => {
    expect(createReportWaitStrategy('medical').eventKind).toBe('medical');
    expect(createReportWaitStrategy('personality').eventKind).toBe('personality');
  });
});
