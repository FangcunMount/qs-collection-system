/* eslint-env node */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  console.error(`[iam-contracts] ${message}`);
  process.exitCode = 1;
}

function assertContains(source, pattern, message) {
  if (!pattern.test(source)) {
    fail(message);
  }
}

function assertNotContains(source, pattern, message) {
  if (pattern.test(source)) {
    fail(message);
  }
}

const authnApi = read('src/services/api/iamAuthnApi.js');
const registerApi = read('src/services/api/register.js');
const identityApi = read('src/services/api/iamIdentityApi.js');

assertContains(authnApi, /request\(['"]\/authn\/login['"]/, 'wechat login must use /authn/login');
assertContains(authnApi, /auth_method:\s*['"]wechat['"]/, 'wechat login must send auth_method=wechat');
assertContains(authnApi, /method_payload:\s*{/, 'wechat login must send method_payload');
assertContains(authnApi, /app_id:\s*resolvedAppId/, 'wechat login payload must include app_id');
assertContains(authnApi, /\bcode\b/, 'wechat login payload must include code');
assertContains(authnApi, /\/authn\/refresh_token/, 'token refresh route must stay on /authn/refresh_token');
assertContains(authnApi, /\/authn\/logout/, 'logout route must stay on /authn/logout');
assertContains(authnApi, /\/authn\/verify/, 'verify route must stay on /authn/verify');
assertContains(authnApi, /\/authn\/signups\/wechat-miniprogram/, 'wechat signup route must stay on /authn/signups/wechat-miniprogram');
assertContains(registerApi, /\/authn\/signups\/wechat-miniprogram/, 'register API must use IAM wechat-miniprogram signup');

assertContains(identityApi, /include_revoked/, 'ProfileLink list must send include_revoked when filtering revoked links');
assertNotContains(identityApi, /params\.active\s*=/, 'ProfileLink list must not send legacy active query param');
assertNotContains(authnApi, /\/auth\/login/, 'legacy /auth/login must not be used');
assertNotContains(registerApi, /\/auth\/login/, 'legacy /auth/login must not be used in register API');

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('[iam-contracts] IAM REST contracts are aligned with V2 expectations');
