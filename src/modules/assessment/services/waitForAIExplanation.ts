/** Scheduling policy only. Neither elapsed time nor animation determines success. */
export const AI_WAIT_LIMIT_MS = 5 * 60 * 1000;
export const AI_LONG_WAIT_MS = 2 * 60 * 1000;
export const AI_NETWORK_RETRY_LIMIT = 3;
export const isAIWaiting = (status?: string) => status === 'pending' || status === 'generating';
export const aiPollDelay = (attempt: number, random: () => number = Math.random) =>
  Math.round((attempt < 2 ? 2000 : attempt < 5 ? 5000 : 10000) * (0.9 + random() * 0.2));
