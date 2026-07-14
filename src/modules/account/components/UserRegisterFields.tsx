import React from "react";
import { Input } from "@tarojs/components";

import ActionButton from "@/shared/ui/ActionButton";
import FormField from "@/shared/ui/FormField";
import type { UserRegistrationDraft } from "../lib/accountRegistration";

interface UserRegisterFieldsProps {
  userInfo: UserRegistrationDraft;
  error?: string;
  onChange: (key: keyof UserRegistrationDraft, value: string) => void;
  onUseWechatProfile: () => void;
}

const UserRegisterFields = ({ userInfo, error = "", onChange, onUseWechatProfile }: UserRegisterFieldsProps) => (
  <>
    <FormField
      label="微信资料"
      hint="昵称需要你主动确认后才能回填，头像不在注册阶段获取。"
    >
      <ActionButton variant="secondary" tone="medical" block onClick={onUseWechatProfile}>
        使用微信昵称
      </ActionButton>
    </FormField>
    <FormField
      label="用户昵称"
      required
      error={error}
      hint="可直接填写，也可以使用微信昵称回填。"
    >
      <Input
        className="form-control"
        type="nickname"
        placeholder="请输入昵称"
        value={userInfo.nickname}
        onInput={(event) => onChange("nickname", event.detail.value)}
      />
    </FormField>
  </>
);

export default UserRegisterFields;
