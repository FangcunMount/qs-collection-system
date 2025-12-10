/**
 * 受试者列表 Hook
 * 统一管理受试者相关的状态和操作
 */
import { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import {
  getTesteeList as getStoredTesteeList,
  setSelectedTesteeId,
  getSelectedTesteeId,
  subscribeTesteeStore
} from "../../../store";
import { initTesteeStore } from "../../../store/testeeStore.ts";
import { paramsConcat } from "../../../util";

export const useTesteeList = (options = {}) => {
  const { autoInit = true, redirectToRegisterIfEmpty = false } = options;

  const [testeeList, setTesteeList] = useState(() => getStoredTesteeList());
  const [selectedTesteeId, setSelectedTestee] = useState(() => getSelectedTesteeId());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeTesteeStore(({ testeeList: newTesteeList }) => {
      setTesteeList(newTesteeList);
    });

    if (autoInit) {
      initTesteeList();
    }

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initTesteeList = async () => {
    try {
      setLoading(true);
      setError(null);

      let storedList = getStoredTesteeList();
      if (!storedList.length) {
        await initTesteeStore();
        storedList = getStoredTesteeList();
      }

      if (!storedList.length && redirectToRegisterIfEmpty) {
        jumpToRegister();
        return;
      }

      setTesteeList(storedList);

      // 如果没有选中的受试者，自动选中第一个
      if (!getSelectedTesteeId() && storedList.length > 0) {
        setSelectedTesteeId(storedList[0].id);
        setSelectedTestee(storedList[0].id);
      }
    } catch (err) {
      setError(err);
      console.error("[useTesteeList] 初始化失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const jumpToRegister = () => {
    const params = {
      submitClose: 0,
      goUrl: "/pages/home/index/index",
      goParams: "{}"
    };
    Taro.redirectTo({ url: paramsConcat("/pages/user/register/index", params) });
  };

  const selectTestee = (testeeId) => {
    setSelectedTesteeId(testeeId);
    setSelectedTestee(testeeId);
  };

  const refreshList = async () => {
    await initTesteeList();
  };

  return {
    testeeList,
    selectedTesteeId,
    loading,
    error,
    selectTestee,
    refreshList,
    initTesteeList
  };
};
