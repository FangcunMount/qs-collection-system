import React, { useEffect, useState, useCallback } from "react";
import Taro from "@tarojs/taro";
import { View } from "@tarojs/components";
import TesteeListTab from "./widget/TesteeListTab";
import AnswersheetListImp from "./widget/AnswersheetListImp";
import BottomMenu from "../../../components/bottomMenu";
import { initTesteeStore } from "../../../store/testeeStore.ts";
import { paramsConcat } from "../../../util";
import {
  getTesteeList as getStoredTesteeList,
  setSelectedTesteeId,
  getSelectedTesteeId,
  subscribeTesteeStore
} from "../../../store";

const AnswersheetList = () => {
  const [ testeeList, setTesteeList ] = useState(() => getStoredTesteeList());
  
  // 跳转到注册页面
  const jumpToRegister = useCallback(() => {
    const params = {
      submitClose: 0,
      goUrl: '/pages/home/index/index',
      goParams: '{}'
    };

    Taro.redirectTo({ url: paramsConcat("/pages/user/register/index", params) });
  }, []);

  // 获取受试者列表
  const initTesteeList = useCallback(async () => {
    let storedList = getStoredTesteeList();
    if (!storedList.length) {
      await initTesteeStore();
      storedList = getStoredTesteeList();
    }

    if (!storedList.length) {
      jumpToRegister();
      return;
    }

    setTesteeList(storedList);
    if (!getSelectedTesteeId()) {
      setSelectedTesteeId(storedList[0].id);
    }
  }, [jumpToRegister]);
  
  // 初始化受试者列表
  useEffect(() => {
    const unsubscribe = subscribeTesteeStore((store) => {
      setTesteeList(store.testeeList);
    });
    initTesteeList();
    return unsubscribe;
  }, [initTesteeList]);

  return (
    <>
      <View>
        {
          testeeList.length === 1 ? 
            <AnswersheetListImp testee={testeeList[0]} />
            :
            <TesteeListTab 
              testeeList={testeeList} 
              TabPanes={testeeList.map((testee) => {
                return <AnswersheetListImp key={testee.id} testee={testee} />
              })}
              onSelect={(testee) => testee?.id && setSelectedTesteeId(testee.id)}
            />
        }
      </View>

      <BottomMenu activeKey="记录" />
    </>
  );
};

export default AnswersheetList;
