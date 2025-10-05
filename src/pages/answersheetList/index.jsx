import React, { useEffect, useState } from "react";
import { View } from "@tarojs/components";
import TesteeListTab from "./widget/TesteeListTab";
import AnswersheetListImp from "./widget/AnswersheetListImp";
import { getChildList } from "../../services/api/user";
import { paramsConcat } from "../../util";
import Taro from "@tarojs/taro";
import {
  getTesteeList as getStoredTesteeList,
  setTesteeList as storeTesteeList,
  setSelectedTesteeId,
  getSelectedTesteeId,
  subscribeUserStore
} from "../../store";

const AnswersheetList = () => {
  const [ testeeList, setTesteeList ] = useState(() => getStoredTesteeList());
  
  // 初始化受试者列表
  useEffect(() => {
    const unsubscribe = subscribeUserStore(({ testeeList }) => {
      setTesteeList(testeeList);
    });
    initTesteeList();
    return unsubscribe;
  }, []);

  // 获取受试者列表
  const initTesteeList = async () => {
    let storedList = getStoredTesteeList();
    if (!storedList.length) {
      const childListRes = await getChildList();
      const fetchedList = childListRes?.list ?? [];
      if (!fetchedList.length) {
        jumpToRegister();
        return;
      }

      const normalized = fetchedList
        .map(item => ({ id: item.id, name: item.name }))
        .filter(item => item.id);
      storeTesteeList(normalized);
      storedList = normalized;
    }

    if (!storedList.length) {
      jumpToRegister();
      return;
    }

    setTesteeList(storedList);
    if (!getSelectedTesteeId()) {
      setSelectedTesteeId(storedList[0].id);
    }
  }

  // 跳转到注册页面
  const jumpToRegister = () => {
    const params = {
      submitClose: 0,
      goUrl: '/pages/home/index',
      goParams: '{}'
    };

    Taro.redirectTo({ url: paramsConcat("/pages/register/index", params) });
  }

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
                return <AnswersheetListImp testee={testee} />
              })}
              onSelect={(testee) => testee?.id && setSelectedTesteeId(testee.id)}
            />
        }
      </View>
    </>
  );
};

export default AnswersheetList;
