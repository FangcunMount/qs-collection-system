export interface TesteeFormDraft {
  legalName: string;
  gender: number | null;
  dob: string;
  relation: string;
}

export const createInitialTesteeForm = (): TesteeFormDraft => ({
  legalName: "",
  gender: null,
  dob: "",
  relation: "parent",
});

export const validateTesteeForm = (draft: TesteeFormDraft, requireRelation = true): string => {
  if (!draft.legalName.trim()) return "请填写档案的姓名";
  if (draft.gender === null) return "请选择档案的性别";
  if (!draft.dob) return "请选择档案的出生日期";
  if (requireRelation && !draft.relation) return "请选择关系";
  return "";
};

export const buildTesteeRegistrationPayload = (draft: TesteeFormDraft) => ({
  name: draft.legalName.trim(),
  birthday: draft.dob,
  gender: draft.gender === null ? undefined : draft.gender,
  relation: draft.relation,
  source: "online_form",
  tags: [] as string[],
  isKeyFocus: false,
});

export const formatTesteeGender = (gender: unknown): string => {
  if (gender === 1 || gender === "1") return "男";
  if (gender === 2 || gender === "2") return "女";
  if (gender === undefined || gender === null || gender === "") return "";
  return "未知";
};

export const formatTesteeRelation = (relation: unknown): string => {
  const labels: Record<string, string> = {
    parent: "父母", guardian: "监护人", self: "本人", grandparent: "祖父母", other: "其他",
  };
  const key = relation == null ? "" : String(relation);
  return labels[key] || key || "-";
};

export const formatTesteeIdType = (idType: unknown): string => {
  const labels: Record<string, string> = { idcard: "身份证", passport: "护照", birth_cert: "出生证明", none: "无证件" };
  const key = idType == null ? "" : String(idType);
  return labels[key] || key || "-";
};

export const calculateTesteeAge = (dob: unknown, now = new Date()): string => {
  if (!dob) return "-";
  const birthDate = new Date(String(dob));
  if (Number.isNaN(birthDate.getTime())) return "-";
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? `${age}岁` : "-";
};
