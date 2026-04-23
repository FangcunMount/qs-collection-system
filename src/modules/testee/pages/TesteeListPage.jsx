import React, { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text, ScrollView } from "@tarojs/components";
import { AtButton, AtLoadMore } from "taro-ui";

import { routes } from "@/shared/config/routes";
import "./TesteeListPage.less";
import { buildAssessmentScanTargetUrl, isScanCancelError } from "@/shared/lib/entryScan";
import { 
  getSelectedTesteeId,
  initTesteeStore,
  refreshTesteeList,
  setSelectedTesteeId,
  subscribeTesteeStore, 
} from "@/shared/stores/testees";
import { getTesteeCareContext } from "@/services/api/testees";

const TesteeListPage = () => {
  const [testees, setTestees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(() => getSelectedTesteeId());
  const [careContextMap, setCareContextMap] = useState({});

  useEffect(() => {
    // 订阅 TesteeStore 状态变化
    const unsubscribe = subscribeTesteeStore((state) => {
      console.log('[TesteeList] Store 状态更新:', state);
      setTestees(state.testeeList);
      setLoading(state.isLoading);
      setSelectedId(state.selectedTesteeId);
      
      if (!state.isLoading && !state.isInitialized) {
        setError('加载失败');
      } else {
        setError(null);
      }
    });

    // 初始化
    loadTestees();

    return () => {
      unsubscribe();
    };
  }, []);

  const loadTestees = async () => {
    try {
      await initTesteeStore();
    } catch (err) {
      console.error('[TesteeList] 加载失败:', err);
      setError(err.message || '加载失败');
      Taro.showToast({
        title: err.message || '加载档案列表失败',
        icon: 'none'
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshTesteeList();
      Taro.showToast({
        title: '刷新成功',
        icon: 'success'
      });
    } catch (err) {
      console.error('[TesteeList] 刷新失败:', err);
      Taro.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    }
  };

  // 跳转到注册新档案
  const handleAddTestee = () => {
    Taro.navigateTo({ url: routes.testeeCreate() });
  };

  const handleRescan = async () => {
    try {
      const result = await Taro.scanCode({
        onlyFromCamera: false,
        scanType: ["qrCode"]
      });
      const targetUrl = buildAssessmentScanTargetUrl(result);
      if (!targetUrl) {
        Taro.showToast({
          title: "未识别到可用测评入口",
          icon: "none"
        });
        return;
      }
      Taro.navigateTo({ url: targetUrl });
    } catch (error) {
      if (isScanCancelError(error)) {
        return;
      }
      console.error("[TesteeList] 重新扫码失败:", error);
      Taro.showToast({
        title: "扫码失败，请重试",
        icon: "none"
      });
    }
  };

  // 查看档案详情（未来可扩展）
  const handleViewTestee = (testee) => {
    Taro.navigateTo({ url: routes.testeeEdit({ testeeId: testee.id }) });
  };

  const handleSelectCurrent = (childId) => {
    setSelectedTesteeId(childId);
    Taro.showToast({
      title: '已切换当前档案',
      icon: 'success'
    });
  };

  useEffect(() => {
    const loadCareContext = async () => {
      if (!testees.length) {
        setCareContextMap({});
        return;
      }
      const pairs = await Promise.all(testees.map(async (testee) => {
        try {
          const result = await getTesteeCareContext(testee.id);
          const payload = result.data || result;
          return [testee.id, payload];
        } catch (error) {
          return [testee.id, null];
        }
      }));

      setCareContextMap(Object.fromEntries(pairs));
    };

    loadCareContext();
  }, [testees]);

  // 格式化性别
  const formatGender = (gender) => {
    if (gender === 1 || gender === '1') return '男';
    if (gender === 2 || gender === '2') return '女';
    if (gender === undefined || gender === null) return '';
    return '未知';
  };

  // 格式化关系
  const formatRelation = (relation) => {
    const relationMap = {
      'parent': '父母',
      'guardian': '监护人',
      'self': '本人'
    };
    return relationMap[relation] || relation || '-';
  };

  // 计算年龄
  const calculateAge = (dob) => {
    if (!dob) return '-';
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age >= 0 ? `${age}岁` : '-';
    } catch {
      return '-';
    }
  };

  // 渲染空状态
  const renderEmpty = () => (
    <View className="empty-container">
      <View className="empty-icon">👶</View>
      <View className="empty-text">暂无档案信息</View>
      <View className="empty-desc">点击下方按钮添加档案</View>
      <AtButton
        size="small"
        type="secondary"
        onClick={handleRescan}
        className="empty-scan-button"
      >
        重新扫码
      </AtButton>
    </View>
  );

  // 渲染加载状态
  const renderLoading = () => (
    <View className="loading-container">
      <AtLoadMore status="loading" loadingText="加载中..." />
    </View>
  );

  // 渲染错误状态
  const renderError = () => (
    <View className="error-container">
      <View className="error-icon">⚠️</View>
      <View className="error-text">{error}</View>
      <AtButton 
        type="primary" 
        size="small" 
        onClick={handleRefresh}
        className="retry-button"
      >
        重试
      </AtButton>
    </View>
  );

  // 渲染档案卡片
  const renderTesteeCard = (testee) => {
    const name = testee.legalName || testee.name || '未命名';
    const gender = testee.gender || testee.sex;
    const dob = testee.dob || testee.birthday;
    const relation = testee.relation;
    const id = testee.id;
    const careContext = careContextMap[id];

    console.log('[TesteeList] 渲染卡片:', { id, name, gender, dob });

    return (
      <View 
        key={id} 
        className="testee-card"
        onClick={() => handleViewTestee(testee)}
      >
        <View className="testee-card-header">
          <View className="child-avatar">
            {gender === 1 || gender === '1' ? '👦' : gender === 2 || gender === '2' ? '👧' : '👤'}
          </View>
          <View className="child-info">
            <View className="child-name-row">
              <View className="child-name">{name}</View>
              {selectedId === id && (
                <View className="current-badge">
                  <Text className="current-badge__text">当前档案</Text>
                </View>
              )}
            </View>
            <View className="child-meta">
              {gender && (
                <>
                  <Text className="meta-item">{formatGender(gender)}</Text>
                  <Text className="meta-divider">·</Text>
                </>
              )}
              <Text className="meta-item">{calculateAge(dob)}</Text>
              {relation && (
                <>
                  <Text className="meta-divider">·</Text>
                  <Text className="meta-item">{formatRelation(relation)}</Text>
                </>
              )}
            </View>
          </View>
          <View className="child-arrow">›</View>
        </View>
        
        <View className="testee-card-body">
          {dob && (
            <View className="info-row">
              <Text className="info-label">出生日期</Text>
              <Text className="info-value">{dob}</Text>
            </View>
          )}
          {testee.idType && testee.idType !== 'none' && (
            <View className="info-row">
              <Text className="info-label">证件类型</Text>
              <Text className="info-value">
                {testee.idType === 'idcard' ? '身份证' : 
                 testee.idType === 'passport' ? '护照' : 
                 testee.idType === 'birth_cert' ? '出生证明' : testee.idType}
              </Text>
            </View>
          )}
          {testee.heightCm && (
            <View className="info-row">
              <Text className="info-label">身高</Text>
              <Text className="info-value">{testee.heightCm} cm</Text>
            </View>
          )}
          {testee.weightKg && (
            <View className="info-row">
              <Text className="info-label">体重</Text>
              <Text className="info-value">{testee.weightKg} kg</Text>
            </View>
          )}
          {careContext?.clinician_name && (
            <View className="info-row">
              <Text className="info-label">跟进人员</Text>
              <Text className="info-value">
                {careContext.clinician_name}
                {careContext.relation_type ? ` · ${careContext.relation_type}` : ''}
              </Text>
            </View>
          )}
          {careContext?.entry_title && (
            <View className="info-row">
              <Text className="info-label">入口来源</Text>
              <Text className="info-value">{careContext.entry_title}</Text>
            </View>
          )}
          {selectedId !== id && (
            <View className="testee-card-actions">
              <AtButton size="small" type="secondary" onClick={(e) => {
                e.stopPropagation();
                handleSelectCurrent(id);
              }}>
                设为当前档案
              </AtButton>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="testee-list-container">
      <View className="page-header">
        <View className="header-title">档案管理</View>
        <View className="header-desc">
          共 {testees.length} 份档案
        </View>
      </View>

      <ScrollView
        className="testee-scroll"
        scrollY
        enhanced
        showScrollbar={false}
      >
        <View className="testee-list">
          {loading && renderLoading()}
          {!loading && error && renderError()}
          {!loading && !error && testees.length === 0 && renderEmpty()}
          {!loading && !error && testees.length > 0 && testees.map(renderTesteeCard)}
        </View>
      </ScrollView>

      <View className="page-footer">
        <AtButton 
          type="primary" 
          onClick={handleAddTestee}
          className="add-button"
        >
          + 添加档案
        </AtButton>
      </View>
    </View>
  );
};

export default TesteeListPage;
