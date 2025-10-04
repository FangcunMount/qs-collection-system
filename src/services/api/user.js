import { request } from "../servers";

export const getUserInfo = () => {
  return request("/user/info");
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
  return request("/user/childlist");
}

export default {
  getUserInfo,
  userHasTestee,
  getUserTestList,
  getChildList
};
