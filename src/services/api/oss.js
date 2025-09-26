import Taro from "@tarojs/taro";

export function getOSSSignature(dirName) {
  return new Promise((resolve, reject) => {
    Taro.request({
      url: "https://api.fangcunyisheng.com/oss/getSignature",
      data: {
        dir: dirName
      },
      success: res => {
        if (res.data.errno === "-1") {
          reject(res.data.errmsg);
        }

        resolve(res.data.data);
      },
      fail: err => {
        reject(err);
      }
    });
  });
}

export function saveUploadFile(data) {
  return new Promise((resolve, reject) => {
    Taro.request({
      url: "https://api.fangcunyisheng.com/oss/uploadafterjson",
      data: {
        ...data,
        type: data.type === "image" ? "picture" : data.type
      },
      method: "POST",
      success: res => {
        if (res.data.errno === "-1") {
          reject(res.data.errmsg);
        }

        resolve(res.data.data);
      },
      fail: err => {
        reject(err);
      }
    });
  });
}

export default {
  getOSSSignature,
  saveUploadFile
};
