import React, { useEffect, useState, useCallback } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import AssessmentRecordListContainer from "../components/records/AssessmentRecordListContainer";
import BottomMenu from "@/shared/ui/BottomMenu";
import { ROUTES, routes } from "@/shared/config/routes";
import {
  findTesteeById,
  getSelectedTesteeId,
  getTesteeList as getStoredTesteeList,
  refreshTesteeList,
  setSelectedTesteeId,
  subscribeTesteeStore,
} from "@/shared/stores/testees";
import "./AssessmentRecordsPage.less";

const AssessmentRecordCenterPage = () => {
  const statusTabs = [
    { key: '', label: '全部' },
    { key: 'pending', label: '待解读' },
    { key: 'done', label: '已出报告' },
    { key: 'failed', label: '失败' }
  ];
  const [testeeList, setTesteeList] = useState(() => getStoredTesteeList());
  const [selectedTesteeId, setSelectedTesteeIdState] = useState(() => getSelectedTesteeId() || '');
  const [selectedTestee, setSelectedTestee] = useState(() => {
    const id = getSelectedTesteeId();
    return id ? findTesteeById(id) : null;
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [showTesteeSheet, setShowTesteeSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [scaleCapsuleInfo, setScaleCapsuleInfo] = useState(null);
  
  // 跳转到注册页面
  const jumpToRegister = useCallback(() => {
    const params = {
      submitClose: 0,
      goUrl: ROUTES.assessmentRecords,
      goParams: '{}'
    };

    Taro.redirectTo({ url: routes.testeeCreate(params) });
  }, []);

  // 初始化档案列表
  const initTesteeList = useCallback(async () => {
    try {
      // 重新初始化 testee store
      await refreshTesteeList();
      
      let storedList = getStoredTesteeList();
      
      if (!storedList.length) {
        jumpToRegister();
        return;
      }

      setTesteeList(storedList);
      
      // 根据档案数量决定是否自动选择
      const currentSelectedId = getSelectedTesteeId();
      if (storedList.length === 1) {
        // 只有一个档案，自动选择
        const singleTesteeId = storedList[0].id;
        setSelectedTesteeId(singleTesteeId);
        setSelectedTestee(storedList[0]);
      } else {
        // 多个档案，检查当前选中的是否有效
        const exists = currentSelectedId && storedList.some(item => item.id === currentSelectedId);
        if (exists) {
          // 当前选中的有效，使用它
          const testee = findTesteeById(currentSelectedId);
          setSelectedTestee(testee);
        } else {
          // 当前选中的无效，默认选择第一个档案
          const firstTesteeId = storedList[0].id;
          setSelectedTesteeId(firstTesteeId);
          setSelectedTestee(storedList[0]);
        }
      }
    } catch (error) {
      console.error('初始化档案列表失败:', error);
      Taro.showToast({ title: '加载档案列表失败', icon: 'none' });
    }
  }, [jumpToRegister]);
  
  // 订阅 testee store 变化
  useEffect(() => {
    const unsubscribe = subscribeTesteeStore(({ testeeList: newTesteeList, selectedTesteeId: newSelectedId }) => {
      setTesteeList(newTesteeList);
      setSelectedTesteeIdState(newSelectedId);
      
      // 更新选中的档案对象
      if (newSelectedId) {
        const testee = findTesteeById(newSelectedId);
        setSelectedTestee(testee);
      } else {
        setSelectedTestee(null);
      }
    });
    
    initTesteeList();
    return unsubscribe;
  }, [initTesteeList]);

  // 处理档案选择
  const handleTesteeChange = (testeeId) => {
    if (!testeeId) return;
    
    setSelectedTesteeId(testeeId);
    const testee = findTesteeById(testeeId);
    setSelectedTestee(testee);
  };

  return (
    <>
      <View className="assessment-record-page">
        {/* 筛选条 - 一行胶囊 */}
        {selectedTestee && (
          <View className="filter-bar">
            <View className="filter-bar-left">
              {testeeList.length > 1 && (
                <View 
                  className="filter-capsule filter-capsule-testee"
                  onClick={() => setShowTesteeSheet(true)}
                >
                  <Text className="filter-capsule-label">受试者：</Text>
                  <Text className="filter-capsule-value">
                    {selectedTestee.legalName || selectedTestee.name || '未命名'}
                  </Text>
                  <Text className="filter-capsule-arrow">▾</Text>
                </View>
              )}
              {scaleCapsuleInfo && scaleCapsuleInfo.scaleList.length > 1 && (
                <View 
                  className="filter-capsule filter-capsule-scale"
                  onClick={() => scaleCapsuleInfo.onOpenScaleSheet()}
                >
                  <Text className="filter-capsule-label">量表：</Text>
                  <Text className="filter-capsule-value">
                    {scaleCapsuleInfo.selectedScale?.name || '全部量表'}
                  </Text>
                  <Text className="filter-capsule-arrow">▾</Text>
                </View>
              )}
            </View>
            <View 
              className="filter-icon-btn"
              onClick={() => setShowFilterSheet(true)}
            >
              <AtIcon value="filter" size="20" color="#666666" />
            </View>
          </View>
        )}

      {/* 答卷列表 */}
        {selectedTestee && (
          <>
            <View className="record-status-tabs">
              {statusTabs.map(tab => (
                <View
                  key={tab.key || 'all'}
                  className={`record-status-tab ${statusFilter === tab.key ? 'active' : ''}`}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  <Text className="record-status-tab__text">{tab.label}</Text>
                </View>
              ))}
            </View>

            <AssessmentRecordListContainer 
              testee={selectedTestee}
              statusFilter={statusFilter}
              showFilterBar={true}
              showTesteeSheet={showTesteeSheet}
              showFilterSheet={showFilterSheet}
              testeeList={testeeList}
              selectedTesteeId={selectedTesteeId}
              onSelectTestee={(testeeId) => {
                handleTesteeChange(testeeId);
                setShowTesteeSheet(false);
              }}
              onCloseTesteeSheet={() => setShowTesteeSheet(false)}
              onCloseFilterSheet={() => setShowFilterSheet(false)}
              onScaleCapsuleInfo={setScaleCapsuleInfo}
            />
          </>
        )}
      </View>

      <BottomMenu activeKey="记录" />
    </>
  );
};

export default AssessmentRecordCenterPage;
