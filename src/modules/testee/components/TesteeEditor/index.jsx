import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { View, Text, Picker, Input } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { AtButton } from "taro-ui";

import "./index.less";
import { findTesteeById, updateTestee } from "@/shared/stores/testees";
import { updateTesteeProfile } from "@/services/api/testees";

const TesteeEditor = ({ testeeId, onSuccess, onCancel }) => {
  const [testee, setTestee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editableData, setEditableData] = useState({
    legalName: "",
    gender: null,
    dob: "",
    heightCm: null,
    weightKg: ""
  });

  useEffect(() => {
    if (!testeeId) return;

    const data = findTesteeById(testeeId);
    if (!data) {
      Taro.showToast({
        title: "未找到档案信息",
        icon: "none"
      });
      onCancel?.();
      return;
    }

    setTestee(data);
    setEditableData({
      legalName: data.legalName || "",
      gender: data.gender ?? null,
      dob: data.dob || "",
      heightCm: data.heightCm ?? null,
      weightKg: data.weightKg || ""
    });
  }, [onCancel, testeeId]);

  const handleChange = (field, value) => {
    setEditableData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

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

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        legalName: editableData.legalName,
        gender: editableData.gender,
        dob: editableData.dob
      };

      if (editableData.heightCm !== null && editableData.heightCm !== "") {
        payload.heightCm = Number(editableData.heightCm);
      }
      if (editableData.weightKg) {
        payload.weightKg = String(editableData.weightKg);
      }

      await updateTesteeProfile(testeeId, payload);

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
        title: "保存成功",
        icon: "success"
      });

      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (error) {
      Taro.showToast({
        title: error.message || "保存失败",
        icon: "none"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatIdType = (idType) => {
    const typeMap = {
      idcard: "身份证",
      passport: "护照",
      birth_cert: "出生证明",
      none: "无证件"
    };
    return typeMap[idType] || idType || "-";
  };

  const formatRelation = (relation) => {
    const relationMap = {
      parent: "父母",
      guardian: "监护人",
      self: "本人"
    };
    return relationMap[relation] || relation || "-";
  };

  if (!testee) {
    return (
      <View className="testee-editor-container">
        <View className="loading-text">加载中...</View>
      </View>
    );
  }

  return (
    <View className="testee-editor-container">
      <View className="editor-header">
        <View className="header-title">编辑档案</View>
        <View className="header-subtitle">带 * 的为必填项</View>
      </View>

      <View className="editor-content">
        <View className="section editable-section">
          <View className="section-title">基本信息</View>

          <View className="form-item">
            <View className="form-label required">姓名</View>
            <Input
              value={editableData.legalName}
              onInput={(e) => handleChange("legalName", e.detail.value)}
              className="input-field"
              placeholder="请输入姓名"
            />
          </View>

          <View className="form-item">
            <View className="form-label required">性别</View>
            <View className="gender-selector">
              <View
                className={`gender-option ${editableData.gender === 1 ? "active" : ""}`}
                onClick={() => handleChange("gender", 1)}
              >
                <Text>男</Text>
              </View>
              <View
                className={`gender-option ${editableData.gender === 2 ? "active" : ""}`}
                onClick={() => handleChange("gender", 2)}
              >
                <Text>女</Text>
              </View>
            </View>
          </View>

          <View className="form-item">
            <View className="form-label required">出生日期</View>
            <Picker mode="date" value={editableData.dob} onChange={(e) => handleChange("dob", e.detail.value)}>
              <View className="picker-value">{editableData.dob || "请选择出生日期"}</View>
            </Picker>
          </View>

          <View className="form-item">
            <View className="form-label">身高（cm）</View>
            <Input
              type="number"
              value={editableData.heightCm === null ? "" : String(editableData.heightCm)}
              onInput={(e) => handleChange("heightCm", e.detail.value)}
              className="input-field"
              placeholder="请输入身高"
            />
          </View>

          <View className="form-item">
            <View className="form-label">体重（kg）</View>
            <Input
              type="digit"
              value={editableData.weightKg}
              onInput={(e) => handleChange("weightKg", e.detail.value)}
              className="input-field"
              placeholder="请输入体重"
            />
          </View>
        </View>

        <View className="section readonly-section">
          <View className="section-title">只读信息</View>

          <View className="readonly-item">
            <Text className="readonly-label">证件类型</Text>
            <Text className="readonly-value">{formatIdType(testee.idType)}</Text>
          </View>

          <View className="readonly-item">
            <Text className="readonly-label">证件号码</Text>
            <Text className="readonly-value">{testee.idNo || "-"}</Text>
          </View>

          <View className="readonly-item">
            <Text className="readonly-label">关系</Text>
            <Text className="readonly-value">{formatRelation(testee.relation)}</Text>
          </View>
        </View>
      </View>

      <View className="editor-footer">
        <AtButton className="cancel-btn" onClick={onCancel}>
          取消
        </AtButton>
        <AtButton className="save-btn" type="primary" loading={loading} onClick={handleSave}>
          保存
        </AtButton>
      </View>
    </View>
  );
};

TesteeEditor.propTypes = {
  testeeId: PropTypes.string,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func
};

TesteeEditor.defaultProps = {
  testeeId: "",
  onSuccess: null,
  onCancel: null
};

export default TesteeEditor;
