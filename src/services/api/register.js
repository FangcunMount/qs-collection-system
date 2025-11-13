import { request } from '../servers';
import config from '../../config';

export const getPhoneByWxcode = (code) => {
  return request('/user/phonebywxcode', { 
    wxshopid: config.wxshopid, 
    code 
  }, {
    host: config.iamHost,
    isNeedLoading: true,
    needToken: false
  });
};

export const postUserRegister = (userInfo) => {
  return request('/accounts/wechat/register', userInfo, { 
    host: config.iamHost,
    method: 'POST',
    isNeedLoading: true,
    needToken: false
  });
};

export const postChildRegister = (childInfo) => {
  return request('/children/register', childInfo, { 
    host: config.iamHost,
    method: 'POST',
    isNeedLoading: true,
    needToken: true
  });
};

export const postChildRegisterOld = (registerInfo) => {
  return request('/children/register', { registerInfo }, { 
    host: config.iamHost,
    method: 'POST',
    isNeedLoading: true,
    needToken: false
  });
};

export default {
  getPhoneByWxcode,
  postUserRegister,
  postChildRegister,
  postChildRegisterOld
};
