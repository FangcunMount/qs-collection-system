import Taro from "@tarojs/taro";

export const checkUpdateVersion = () => {
  if (Taro.canIUse("getUpdateManager")) {
    const updateManager = Taro.getUpdateManager();

    updateManager.onCheckForUpdate((res) => {
      if (!res.hasUpdate) return;

      updateManager.onUpdateReady(() => {
        updateManager.applyUpdate();
      });

      updateManager.onUpdateFailed(() => {
        Taro.showModal({
          title: "已经有新版本喽~",
          content: "请您删除当前小程序，到微信 “发现-小程序” 页，重新搜索打开哦~",
        });
      });
    });

    return;
  }

  Taro.showModal({
    title: "温馨提示",
    content: "当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试。"
  });
};

export default {
  checkUpdateVersion,
};
