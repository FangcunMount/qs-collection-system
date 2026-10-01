import config from '@/config';
import { request } from '@/services/servers';

export function resolvePlanTaskEntry(taskId) {
  return request(
    `/plan-task-entries/${encodeURIComponent(taskId)}`,
    {},
    { host: config.collectionHost, needToken: true, logPolicy: 'metadata_only' }
  );
}

export function listPlanTasks(testeeId) {
  return request('/plan-tasks', {}, {
    host: config.collectionHost, needToken: true,
    params: { testee_id: testeeId }, logPolicy: 'metadata_only',
  });
}
