/**
 * 注册相关 API
 * 
 * 迁移说明：
 * - postUserRegister() 使用 IAM authn API: /authn/signups/wechat-miniprogram
 * - 推荐使用新的 registerService.ts 进行统一注册
 */

import { request } from '../servers';
import config from '../../config';

function toWechatMiniProgramSignupPayload(userInfo = {}) {
  const nickname = userInfo.nickname || userInfo.nickName || userInfo.name || '';
  const avatar = userInfo.avatar || userInfo.avatarUrl || '';
  const code = userInfo.jsCode || userInfo.code;

  return {
    name: userInfo.name || userInfo.legalName || nickname || '微信用户',
    phone: userInfo.phone,
    email: userInfo.email,
    appId: userInfo.appId || userInfo.app_id || config.appId,
    jsCode: code,
    nickname: nickname || undefined,
    avatar: avatar || undefined,
    meta: userInfo.meta || userInfo.profile || {
      ...userInfo,
      nickname,
      avatar
    }
  };
}

/**
 * 微信用户注册（注册账户）
 * 使用 IAM authn API
 */
export const postUserRegister = (userInfo) => {
  return request('/authn/signups/wechat-miniprogram', toWechatMiniProgramSignupPayload(userInfo), {
    host: config.iamHost,
    method: 'POST',
    isNeedLoading: true,
    needToken: false
  });
};

export default {
  postUserRegister
};
