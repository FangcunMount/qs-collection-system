import config from '@/config';
import { request } from '@/services/servers';
import { resolvePlanTaskEntry } from '../planTaskEntries';

jest.mock('@/services/servers', () => ({ request: jest.fn() }));

test('task token lookup uses the authenticated Collection boundary', () => {
  resolvePlanTaskEntry('task-1', 'token-1');
  expect(request).toHaveBeenCalledWith(
    '/plan-task-entries/task-1/token-1',
    {},
    expect.objectContaining({ host: config.collectionHost, needToken: true }),
  );
});
