import { request } from "../servers";

export const getUserInfo = () => {
  return request("/user/info");
};

export const userHasTestee = from => {
  return request("/user/hasTestee", { from });
};

export const getUserTestList = from => {
  return request("/user/testeelist", { from });
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
