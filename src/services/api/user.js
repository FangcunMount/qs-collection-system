import { request } from "../servers";

import config from '../../config';

export const getUserInfo = () => {
  return request("/me", {}, {
      host: config.iamHost,
      isNeedLoading: true,
      needToken: true
    });
};

export const userHasTestee = from => {
  const payload = from ? { from } : {};
  return request("/user/hasTestee", payload);
};

export const getUserTestList = from => {
  const payload = from ? { from } : {};
  return request("/user/testeelist", payload);
};

export const getChildList = () => {
  return request("/me/children", {}, {
    host: config.iamHost,
    isNeedLoading: true,
    needToken: true
  });
};

export default {
  getUserInfo,
  userHasTestee,
  getUserTestList,
  getChildList
};
