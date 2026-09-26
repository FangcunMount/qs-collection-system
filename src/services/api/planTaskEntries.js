import config from '@/config';
import { request } from '@/services/servers';

export function resolvePlanTaskEntry(taskId, token) {
  return request(
    `/plan-task-entries/${encodeURIComponent(taskId)}/${encodeURIComponent(token)}`,
    {},
    { host: config.collectionHost, needToken: true, logPolicy: 'metadata_only' }
  );
}
