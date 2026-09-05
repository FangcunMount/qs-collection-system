import Taro from '@tarojs/taro';
import { logout } from '@/services/api/auth';
import { clearSession } from '@/services/auth/sessionManager';
import { getAccessToken, getRefreshToken } from '@/shared/stores/session';
import { clearAssessmentEntryContext } from '@/shared/stores/assessmentEntry';
import { clearSubmissionContext } from '@/modules/assessment/services/submissionContextStore';

// Clear local identity immediately, even offline. The remote result must never
// clear a newer login that started while revocation was in flight.
export async function logoutAccount(): Promise<{ remoteRevoked: boolean }> {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  clearSession('manual_logout');
  clearAssessmentEntryContext();
  clearSubmissionContext();
  try {
    Taro.getStorageInfoSync().keys
      .filter((key) => key === 'userInfo' || key.startsWith('plan_task_subscribe_status:'))
      .forEach((key) => Taro.removeStorageSync(key));
  } catch (_) { /* Account stores and private AI state were already cleared. */ }
  if (!accessToken && !refreshToken) return { remoteRevoked: true };
  try {
    const result = await logout(accessToken || '', refreshToken || '');
    return { remoteRevoked: Boolean(result.ok) };
  } catch (_) {
    return { remoteRevoked: false };
  }
}
