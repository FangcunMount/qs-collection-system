import { request } from "./servers"
import config from "../../../config";

export const getPhoneByWxcode = (code) => {
  return request('/user/phonebywxcode', { wxshopid: config.wxshopid, code }, { isNeedLoading: true })
}

/**
 * @description 用户注册登陆
 * @param {object} registerInfo: child | user
*/
export const postChildRegister = (registerInfo) => {
  return request('/child/register', { registerInfo }, { method: 'POST', isNeedLoading: true })
}

/**
 * @description 获取是否有和当前信息相同的孩子
 * @param {object} child: name | sex | birthday 
 */
export default {
  getPhoneByWxcode,
  postChildRegister
}
