import React, { useEffect, useState } from "react";
import { Button, Input, Picker, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";

import { findTesteeById, updateTestee as updateTesteeStore } from "@/shared/stores/testees";
import PageShell from "@/shared/ui/PageShell";
import StatePanel from "@/shared/ui/StatePanel";
import ActionButton from "@/shared/ui/ActionButton";
import BottomActionBar from "@/shared/ui/BottomActionBar";
import FormField from "@/shared/ui/FormField";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { updateTestee as updateTesteeApi } from "@/services/api/testees";
import type { Testee } from "@/store/testeeStore";
import { formatTesteeIdType, formatTesteeRelation, validateTesteeForm, type TesteeFormDraft } from "../../lib/testeeForm";
import "./index.less";

interface TesteeEditorProps {
  testeeId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TesteeEditor = ({ testeeId = "", onSuccess, onCancel }: TesteeEditorProps) => {
  const [testee, setTestee] = useState<Testee | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [editableData, setEditableData] = useState<TesteeFormDraft>({ legalName: "", gender: null, dob: "", relation: "" });

  useEffect(() => {
    if (!testeeId) return;
    const data = findTesteeById(testeeId) as Testee | null;
    if (!data) {
      Taro.showToast({ title: "未找到档案信息", icon: "none" });
      onCancel?.();
      return;
    }
    setTestee(data);
    setEditableData({ legalName: data.legalName || "", gender: data.gender ?? null, dob: data.dob || "", relation: data.relation || "" });
  }, [onCancel, testeeId]);

  const change = <K extends keyof TesteeFormDraft>(key: K, value: TesteeFormDraft[K]) => {
    setEditableData((current) => ({ ...current, [key]: value }));
    setValidationError("");
  };

  const handleSave = async () => {
    const message = validateTesteeForm(editableData, false);
    setValidationError(message);
    if (message) {
      Taro.showToast({ title: message.replace("档案的", ""), icon: "none" });
      return;
    }
    if (!testee) return;
    setLoading(true);
    try {
      const response = await updateTesteeApi(testeeId, {
        name: editableData.legalName.trim(), gender: editableData.gender, birthday: editableData.dob,
      } as never) as unknown;
      const wrapper = response && typeof response === "object" ? response as Record<string, any> : {};
      const updated = wrapper.data || wrapper;
      const updatedTestee: Testee = {
        ...testee,
        id: String(updated.id || testeeId),
        legalName: updated.name || editableData.legalName.trim(),
        gender: updated.gender ?? editableData.gender ?? undefined,
        dob: updated.birthday || editableData.dob,
        updatedAt: updated.updated_at || updated.updatedAt || testee.updatedAt,
      };
      updateTesteeStore(testeeId, updatedTestee);
      Taro.showToast({ title: "保存成功", icon: "success" });
      setTimeout(() => onSuccess?.(), 1500);
    } catch (error: unknown) {
      Taro.showToast({ title: error instanceof Error ? error.message : "保存失败", icon: "none" });
    } finally {
      setLoading(false);
    }
  };

  if (!testee) {
    return (
      <PageShell tone="medical" scroll={false} contentClassName="testee-editor-state">
        <StatePanel state="loading" tone="medical" title="正在加载档案" />
      </PageShell>
    );
  }

  const fixedAction = (
    <BottomActionBar className="testee-editor-actions">
      <ActionButton variant="secondary" tone="medical" block onClick={() => onCancel?.()}>取消</ActionButton>
      <ActionButton tone="medical" block loading={loading} onClick={() => void handleSave()}>保存</ActionButton>
    </BottomActionBar>
  );

  return (
    <PageShell tone="medical" fixedAction={fixedAction} contentClassName="testee-editor-container">
      <View className="editor-header">
        <Text className="editor-title">编辑档案</Text>
        <Text className="editor-subtitle">带 * 的为必填项</Text>
      </View>
      <SurfaceCard className="editor-section">
        <Text className="editor-section__title">基本信息</Text>
        <FormField label="姓名" required error={validationError.includes("姓名") ? validationError : ""}>
          <Input className="form-control" value={editableData.legalName} placeholder="请输入姓名" onInput={(event) => change("legalName", event.detail.value)} />
        </FormField>
        <FormField label="性别" required error={validationError.includes("性别") ? validationError : ""}>
          <View className="editor-gender-selector">
            {[1, 2].map((gender) => (
              <Button key={gender} className={`editor-gender-option ${editableData.gender === gender ? "editor-gender-option--selected" : ""}`} onClick={() => change("gender", gender)}>
                {gender === 1 ? "男" : "女"}
              </Button>
            ))}
          </View>
        </FormField>
        <FormField label="出生日期" required error={validationError.includes("出生日期") ? validationError : ""}>
          <Picker mode="date" value={editableData.dob} onChange={(event) => change("dob", event.detail.value)}>
            <View className="form-control form-control--picker"><Text>{editableData.dob || "请选择出生日期"}</Text><Text>›</Text></View>
          </Picker>
        </FormField>
      </SurfaceCard>
      <SurfaceCard className="editor-section">
        <Text className="editor-section__title">只读信息</Text>
        <View className="readonly-item"><Text>证件类型</Text><Text>{formatTesteeIdType(testee.idType)}</Text></View>
        <View className="readonly-item"><Text>证件号码</Text><Text>{testee.idNo || "-"}</Text></View>
        <View className="readonly-item"><Text>关系</Text><Text>{formatTesteeRelation(testee.relation)}</Text></View>
      </SurfaceCard>
    </PageShell>
  );
};

export default TesteeEditor;
