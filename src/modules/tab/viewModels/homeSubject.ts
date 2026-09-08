import type { Testee } from "@/store/testeeStore";

export type HomeAvatarKey = "adult-male" | "adult-female" | "child-male" | "child-female" | "neutral";

// This split selects artwork only; individual assessment eligibility is unchanged.
export function resolveHomeSubject(testee: Testee | null, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(testee?.dob || "");
  let age: number | null = null;
  if (match) {
    const [, year, month, day] = match.map(Number);
    const birth = new Date(year, month - 1, day);
    if (birth.getFullYear() === year && birth.getMonth() === month - 1 && birth.getDate() === day && birth <= now) {
      age = now.getFullYear() - year;
      if (now.getMonth() < month - 1 || (now.getMonth() === month - 1 && now.getDate() < day)) age -= 1;
    }
  }
  const isChild = age !== null && age < 18;
  const gender = testee?.gender === 1 ? "male" : testee?.gender === 2 ? "female" : null;
  const avatarKey: HomeAvatarKey = age !== null && gender ? `${isChild ? "child" : "adult"}-${gender}` : "neutral";
  return {
    avatarKey,
    isChild,
    age,
    name: testee?.legalName || (testee ? "未命名成员" : "选择一位受试者"),
    meta: testee ? [testee.relation === "self" ? "本人" : "家庭成员", age === null ? "年龄待完善" : `${age}岁`].join(" · ") : "为自己或家人开始了解",
    title: !testee ? "每一次了解，从这里开始" : age === null ? "今天，想了解哪一方面？" : isChild ? "一起，读懂孩子的日常" : "今天，想怎样了解自己？",
    subtitle: isChild ? "从日常表现，了解成长中的需要" : "从你关心的事开始",
    prompt: !testee ? "先选择一位受试者" : isChild ? "最近有哪些新发现？" : "先选一件关心的事",
  };
}
