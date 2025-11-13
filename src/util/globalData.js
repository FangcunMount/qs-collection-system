const globalData = {
  token: ''
};

const setGlobalData = (k, v) => {
  console.log(`[GlobalData] 设置全局数据: ${k} =`, v);
  globalData[k] = v;
};

const getGlobalData = (k) => {
  console.log(`[GlobalData] 获取全局数据: ${k} =`, globalData[k]);
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
