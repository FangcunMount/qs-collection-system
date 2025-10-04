import React, { useEffect, useState } from "react";
import { View } from "@tarojs/components";
import TesteeListTab from "./widget/TesteeListTab";
import AnswersheetListImp from "./widget/AnswersheetListImp";
import { getChildList } from "../../services/api/user";
import { paramsConcat } from "../../util";
import Taro from "@tarojs/taro";

const AnswersheetList = () => {

  const [ testeeList, setTesteeList ] = useState([]);
  
  // 初始化受试者列表
  useEffect(() => {
    initTesteeList();
  }, []);

  // 获取受试者列表
  const initTesteeList = async () => {
    const childListRes = await getChildList();
    if (!childListRes || !childListRes.list || childListRes.list.length === 0) {
      jumpToRegister();
      return;
    }
    
    const testeeList = childListRes.list.map((item) => {
      return {
        id: item.id,
        name: item.name,
        type: 'Child'
      }
    });

    setTesteeList(testeeList);
  }

  // 跳转到注册页面
  const jumpToRegister = () => {
    const params = {
      submitClose: 0,
      goUrl: '/pages/home/index',
      goParams: '{}',
      role: 'child',
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
            />
        }
      </View>
    </>
  );
};

export default AnswersheetList;
