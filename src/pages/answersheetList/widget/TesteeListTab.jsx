import React, { useEffect, useState } from "react";
import { AtTabs, AtTabsPane } from "taro-ui"
import "taro-ui/dist/style/components/list.scss";
import "taro-ui/dist/style/components/tabs.scss";

const TesteeListTab = ({ testeeList, TabPanes, onSelect }) => {
  // tab 配置
  const [ tabConfig, setTabConfig ] = useState({
    current: 0,
    list: []
  });
  
  useEffect(() => {
    initTabConfig(testeeList);
  }, [testeeList]);
  
  // 初始化 tab 配置
  const initTabConfig = (testeeList) => {
    if (! testeeList ) return;

    setTabConfig({
      current: 0,
      list: testeeList.map((testee, index) => {
        return { 
          index: index,
          title: testee.name,
        }
      })
    });
  }

  // 切换 tab
  const handleChangeTab = (value) => {
    setTabConfig({
      ...tabConfig,
      current: value
    });
    if (typeof onSelect === 'function' && testeeList && testeeList[value]) {
      onSelect(testeeList[value]);
    }
  }

return (
  <AtTabs
    scroll={true}
    current={tabConfig.current}
    tabList={tabConfig.list}
    onClick={handleChangeTab.bind(this)}
  >
    {TabPanes.map((paneItem, index) => {
      return (
        <AtTabsPane current={tabConfig.current} index={index}>
          {paneItem}
        </AtTabsPane>
      )
    })}
    </AtTabs> 
  )
}

export default TesteeListTab;
