import { refreshSession, clearSession } from '../sessionManager';
import { getAccessToken, setToken } from '@/shared/stores/session';
import * as auth from '@/services/api/auth';
jest.mock('@/services/api/auth', () => ({ refreshToken: jest.fn() }));
let logs;
beforeEach(() => { logs = ['log','info','warn','error'].map(level => jest.spyOn(console, level).mockImplementation(() => {})); clearSession(); });
afterEach(() => logs.forEach(log => log.mockRestore()));
const token = access_token => ({ access_token, refresh_token: 'test-refresh', expires_in: 3600 });
test('late refresh after logout cannot revive old tokens or clear a new in-flight refresh', async () => {
  const finishes = [];
  auth.refreshToken.mockImplementation(() => new Promise(resolve => finishes.push(resolve)));
  setToken(token('old-token')); const old = refreshSession(); const rejected = expect(old).rejects.toMatchObject({ reason: 'session_changed' });
  clearSession(); setToken(token('new-token')); const next = refreshSession();
  finishes[0]({ ok: true, accessToken: 'late-old-token' }); await rejected;
  expect(getAccessToken()).toBe('new-token'); expect(refreshSession()).toBe(next); expect(auth.refreshToken).toHaveBeenCalledTimes(2);
  finishes[1]({ ok: true, accessToken: 'fresh-new-token', refreshToken: 'next-refresh' }); await next;
  expect(getAccessToken()).toBe('fresh-new-token');
});
