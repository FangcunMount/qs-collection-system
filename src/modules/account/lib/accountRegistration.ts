export interface UserRegistrationDraft {
  nickname: string;
  avatar: string;
}

export const createInitialUserRegistration = (): UserRegistrationDraft => ({ nickname: "", avatar: "" });

export const validateUserRegistration = (draft: UserRegistrationDraft): string => (
  draft.nickname.trim() ? "" : "请输入昵称"
);

export const buildUserRegistrationPayload = (draft: UserRegistrationDraft) => ({
  name: draft.nickname.trim(),
  nickname: draft.nickname.trim(),
  avatar: draft.avatar || "",
});
