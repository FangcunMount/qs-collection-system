import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { View, Text, Picker, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { AtButton } from "taro-ui";

import "./index.less";
import { findTesteeById, updateTestee } from "../../store/testeeStore.ts";
import { patchChildInfo } from "../../services/api/user";

/**
 * 受试者信息编辑组件
 * 可编辑字段：legalName, gender, dob, heightCm, weightKg
 * 只读字段：idType, idNo, relation 等
 */
const TesteeEditor = ({ testeeId, onSuccess, onCancel }) => {
  const [testee, setTestee] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 可编辑的字段
  const [editableData, setEditableData] = useState({
    legalName: "",
    gender: null,
    dob: "",
    heightCm: null,
    weightKg: ""
  });

  // 加载受试者数据
  useEffect(() => {
    if (testeeId) {
      const data = findTesteeById(testeeId);
      console.log('[TesteeEditor] 加载受试者数据:', data);
      
      if (data) {
        setTestee(data);
        setEditableData({
          legalName: data.legalName || "",
          gender: data.gender ?? null,
          dob: data.dob || "",
          heightCm: data.heightCm ?? null,
          weightKg: data.weightKg || ""
        });
      } else {
        Taro.showToast({
          title: '未找到受试者信息',
          icon: 'none'
        });
        onCancel?.();
      }
    }
  }, [testeeId, onCancel]);

  // 更新可编辑字段
  const handleChange = (field, value) => {
    setEditableData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 选择日期
  const handleDateChange = (e) => {
    handleChange('dob', e.detail.value);
  };

  // 验证表单
  const validateForm = () => {
    if (!editableData.legalName?.trim()) {
      Taro.showToast({ title: "请填写姓名", icon: "none" });
      return false;
    }

    if (editableData.gender === null) {
      Taro.showToast({ title: "请选择性别", icon: "none" });
      return false;
    }

    if (!editableData.dob) {
      Taro.showToast({ title: "请选择出生日期", icon: "none" });
      return false;
    }

    return true;
  };

  // 保存修改
  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('[TesteeEditor] 保存修改:', editableData);
      
      // 调用 API 更新
      const payload = {
        legalName: editableData.legalName,
        gender: editableData.gender,
        dob: editableData.dob
      };

      // 添加可选字段
      if (editableData.heightCm !== null && editableData.heightCm !== '') {
        payload.heightCm = Number(editableData.heightCm);
      }
      if (editableData.weightKg) {
        payload.weightKg = String(editableData.weightKg);
      }

      await patchChildInfo(testeeId, payload);
      
      // 更新本地 store
      const updatedTestee = {
        ...testee,
        legalName: editableData.legalName,
        gender: editableData.gender,
        dob: editableData.dob,
        heightCm: payload.heightCm ?? testee.heightCm,
        weightKg: editableData.weightKg || testee.weightKg
      };
      
      updateTestee(testeeId, updatedTestee);
      
      Taro.showToast({
        title: '保存成功',
        icon: 'success'
      });

      setTimeout(() => {
        onSuccess?.();
      }, 1500);
      
    } catch (error) {
      console.error('[TesteeEditor] 保存失败:', error);
      Taro.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!testee) {
    return (
      <View className="testee-editor-container">
        <View className="loading-text">加载中...</View>
      </View>
    );
  }

  // 格式化证件类型
  const formatIdType = (idType) => {
    const typeMap = {
      'idcard': '身份证',
      'passport': '护照',
      'birth_cert': '出生证明',
      'none': '无证件'
    };
    return typeMap[idType] || idType || '-';
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

  return (
    <View className="testee-editor-container">
      <View className="editor-header">
        <View className="header-title">编辑受试者</View>
        <View className="header-subtitle">带 * 的为必填项</View>
      </View>

      <View className="editor-content">
        {/* 可编辑区域 */}
        <View className="section editable-section">
          <View className="section-title">基本信息</View>
          
          <View className="form-item">
            <View className="form-label required">姓名</View>
            <Input
              value={editableData.legalName}
              onInput={(e) => handleChange('legalName', e.detail.value)}
              className="input-field"
              placeholder="请输入姓名"
            />
          </View>

          <View className="form-item">
            <View className="form-label required">性别</View>
            <View className="gender-selector">
              <View 
                className={`gender-option ${editableData.gender === 1 ? 'active' : ''}`}
                onClick={() => handleChange('gender', 1)}
              >
                <Text>男</Text>
              </View>
              <View 
                className={`gender-option ${editableData.gender === 2 ? 'active' : ''}`}
                onClick={() => handleChange('gender', 2)}
              >
                <Text>女</Text>
              </View>
            </View>
          </View>

          <View className="form-item">
            <View className="form-label required">出生日期</View>
            <Picker
              mode="date"
              value={editableData.dob}
              onChange={handleDateChange}
            >
              <View className="picker-value">
                {editableData.dob || '请选择出生日期'}
              </View>
            </Picker>
          </View>

          <View className="form-item">
            <View className="form-label">身高（cm）</View>
            <Input
              type="number"
              value={editableData.heightCm !== null ? String(editableData.heightCm) : ''}
              onInput={(e) => handleChange('heightCm', e.detail.value ? Number(e.detail.value) : null)}
              className="input-field"
              placeholder="请输入身高"
            />
          </View>

          <View className="form-item">
            <View className="form-label">体重（kg）</View>
            <Input
              type="digit"
              value={editableData.weightKg}
              onInput={(e) => handleChange('weightKg', e.detail.value)}
              className="input-field"
              placeholder="请输入体重"
            />
          </View>
        </View>

        {/* 分隔线 */}
        <View className="section-divider" />

        {/* 只读信息区域 */}
        <View className="section readonly-section">
          <View className="section-title">其他信息</View>
          
          {testee.idType && testee.idType !== 'none' && (
            <View className="info-row">
              <View className="info-label">证件类型</View>
              <View className="info-value">{formatIdType(testee.idType)}</View>
            </View>
          )}

          {testee.idNo && (
            <View className="info-row">
              <View className="info-label">证件号码</View>
              <View className="info-value">{testee.idNo}</View>
            </View>
          )}

          {testee.idMasked && (
            <View className="info-row">
              <View className="info-label">脱敏证件号</View>
              <View className="info-value">{testee.idMasked}</View>
            </View>
          )}

          {testee.relation && (
            <View className="info-row">
              <View className="info-label">关系</View>
              <View className="info-value">{formatRelation(testee.relation)}</View>
            </View>
          )}

          <View className="info-row">
            <View className="info-label">受试者ID</View>
            <View className="info-value">{testee.id}</View>
          </View>

          {testee.createdAt && (
            <View className="info-row">
              <View className="info-label">创建时间</View>
              <View className="info-value">{testee.createdAt}</View>
            </View>
          )}

          {testee.updatedAt && (
            <View className="info-row">
              <View className="info-label">更新时间</View>
              <View className="info-value">{testee.updatedAt}</View>
            </View>
          )}
        </View>
      </View>

      {/* 底部操作按钮 */}
      <View className="editor-footer">
        <AtButton
          type="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          取消
        </AtButton>
        <AtButton
          type="primary"
          onClick={handleSave}
          loading={loading}
        >
          {loading ? '保存中...' : '保存修改'}
        </AtButton>
      </View>
    </View>
  );
};

TesteeEditor.propTypes = {
  testeeId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func
};

TesteeEditor.defaultProps = {
  onSuccess: () => {},
  onCancel: () => {}
};

export default TesteeEditor;
