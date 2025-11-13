import React, { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text, ScrollView } from "@tarojs/components";
import { AtButton, AtLoadMore } from "taro-ui";

import "./index.less";
import { 
  subscribeTesteeStore, 
  initTesteeStore,
  refreshTesteeList 
} from "../../store/testeeStore.ts";

const ChildrenList = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 订阅 TesteeStore 状态变化
    const unsubscribe = subscribeTesteeStore((state) => {
      console.log('[ChildrenList] Store 状态更新:', state);
      setChildren(state.testeeList);
      setLoading(state.isLoading);
      
      if (!state.isLoading && !state.isInitialized) {
        setError('加载失败');
      } else {
        setError(null);
      }
    });

    // 初始化
    loadChildren();

    return () => {
      unsubscribe();
    };
  }, []);

  const loadChildren = async () => {
    console.log('[ChildrenList] loadChildren 开始执行');
    try {
      console.log('[ChildrenList] 调用 initTesteeStore');
      const result = await initTesteeStore();
      console.log('[ChildrenList] initTesteeStore 返回结果:', result);
    } catch (err) {
      console.error('[ChildrenList] 加载失败:', err);
      setError(err.message || '加载失败');
      Taro.showToast({
        title: err.message || '加载受试者列表失败',
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
      console.error('[ChildrenList] 刷新失败:', err);
      Taro.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    }
  };

  // 跳转到注册新受试者
  const handleAddChild = () => {
    Taro.navigateTo({
      url: '/pages/registerChild/index'
    });
  };

  // 查看受试者详情（未来可扩展）
  const handleViewChild = (child) => {
    // 跳转到编辑页面
    Taro.navigateTo({
      url: `/pages/registerChild/index?testeeId=${child.id}&mode=edit`
    });
  };

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
      <View className="empty-text">暂无受试者信息</View>
      <View className="empty-desc">点击下方按钮添加受试者</View>
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

  // 渲染受试者卡片
  const renderChildCard = (child) => {
    const name = child.legalName || child.name || '未命名';
    const gender = child.gender || child.sex;
    const dob = child.dob || child.birthday;
    const relation = child.relation;
    const id = child.id || child.childid;
    
    console.log('[ChildrenList] 渲染卡片:', { id, name, gender, dob });

    return (
      <View 
        key={id} 
        className="child-card"
        onClick={() => handleViewChild(child)}
      >
        <View className="child-card-header">
          <View className="child-avatar">
            {gender === 1 || gender === '1' ? '👦' : gender === 2 || gender === '2' ? '👧' : '👤'}
          </View>
          <View className="child-info">
            <View className="child-name">{name}</View>
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
        
        <View className="child-card-body">
          {dob && (
            <View className="info-row">
              <Text className="info-label">出生日期</Text>
              <Text className="info-value">{dob}</Text>
            </View>
          )}
          {child.idType && child.idType !== 'none' && (
            <View className="info-row">
              <Text className="info-label">证件类型</Text>
              <Text className="info-value">
                {child.idType === 'idcard' ? '身份证' : 
                 child.idType === 'passport' ? '护照' : 
                 child.idType === 'birth_cert' ? '出生证明' : child.idType}
              </Text>
            </View>
          )}
          {child.heightCm && (
            <View className="info-row">
              <Text className="info-label">身高</Text>
              <Text className="info-value">{child.heightCm} cm</Text>
            </View>
          )}
          {child.weightKg && (
            <View className="info-row">
              <Text className="info-label">体重</Text>
              <Text className="info-value">{child.weightKg} kg</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="children-list-container">
      <View className="page-header">
        <View className="header-title">受试者管理</View>
        <View className="header-desc">
          共 {children.length} 位受试者
        </View>
      </View>

      <ScrollView
        className="children-scroll"
        scrollY
        enhanced
        showScrollbar={false}
      >
        <View className="children-list">
          {loading && renderLoading()}
          {!loading && error && renderError()}
          {!loading && !error && children.length === 0 && renderEmpty()}
          {!loading && !error && children.length > 0 && children.map(renderChildCard)}
        </View>
      </ScrollView>

      <View className="page-footer">
        <AtButton 
          type="primary" 
          onClick={handleAddChild}
          className="add-button"
        >
          + 添加受试者
        </AtButton>
      </View>
    </View>
  );
};

export default ChildrenList;
