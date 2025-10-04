const globalData = {
  token: ''
};

const setGlobalData = (k, v) => {
  globalData[k] = v;
};

const getGlobalData = (k) => {
  return globalData[k]
};

const clearGlobalData = (k) => { 
  setGlobalData(k, undefined);
}

export {
  setGlobalData,
  getGlobalData,
  clearGlobalData
};
