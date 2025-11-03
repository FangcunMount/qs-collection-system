import { request } from "./servers"
import config from "../../../config";

export const getPhoneByWxcode = (code) => {
  return request('/user/phonebywxcode', { wxshopid: config.wxshopid, code }, { isNeedLoading: true })
}

/**
 * @description 用户注册
 * @param {object} userInfo - 用户信息
 * @param {string} userInfo.nickname - 用户昵称
 * @param {string} userInfo.avatar - 用户头像
 * @param {Array} userInfo.contacts - 联系方式数组 [{type: "phone", value: "13800138000"}]
 */
export const postUserRegister = (userInfo) => {
  return request('/users', userInfo, { method: 'POST', isNeedLoading: true })
}

/**
 * @description 子项注册
 * @param {object} childInfo - 子项信息
 * @param {string} childInfo.name - 姓名
 * @param {string} childInfo.sex - 性别
 * @param {string} childInfo.birthday - 生日
 */
export const postChildRegister = (childInfo) => {
  return request('/children', childInfo, { method: 'POST', isNeedLoading: true })
}

/**
 * @description 用户注册登陆（旧接口，保留兼容）
 * @param {object} registerInfo: child | user
*/
export const postChildRegisterOld = (registerInfo) => {
  return request('/children/register', { registerInfo }, { method: 'POST', isNeedLoading: true })
}

/**
 * @description 获取是否有和当前信息相同的孩子
 * @param {object} child: name | sex | birthday 
 */
export default {
  getPhoneByWxcode,
  postUserRegister,
  postChildRegister,
  postChildRegisterOld
}
