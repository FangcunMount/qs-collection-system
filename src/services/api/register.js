/**
 * 注册相关 API
 * 
 * 迁移说明：
 * - postUserRegister() 使用 IAM authn API: /authn/accounts/wechat/register
 * - 推荐使用新的 registerService.ts 进行统一注册
 */

import { request } from '../servers';
import config from '../../config';

/**
 * 微信用户注册（注册账户）
 * 使用 IAM authn API
 */
export const postUserRegister = (userInfo) => {
  return request('/authn/accounts/wechat/register', userInfo, { 
    host: config.iamHost,
    method: 'POST',
    isNeedLoading: true,
    needToken: false
  });
};

export default {
  postUserRegister
};
