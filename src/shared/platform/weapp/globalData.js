const globalData = {
  token: ""
};

export const setGlobalData = (key, value) => {
  globalData[key] = value;
};

export const getGlobalData = (key) => {
  return globalData[key];
};

export const clearGlobalData = (key) => {
  setGlobalData(key, undefined);
};

export default {
  setGlobalData,
  getGlobalData,
  clearGlobalData,
};
