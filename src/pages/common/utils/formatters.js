/**
 * 通用工具函数
 */

/**
 * 格式化性别
 */
export const formatGender = (gender) => {
  if (gender === 1 || gender === "1") return "男";
  if (gender === 2 || gender === "2") return "女";
  if (gender === undefined || gender === null) return "";
  return "未知";
};

/**
 * 格式化关系
 */
export const formatRelation = (relation) => {
  const relationMap = {
    parent: "父母",
    guardian: "监护人",
    self: "本人",
    teacher: "老师",
    other: "其他"
  };
  return relationMap[relation] || relation || "";
};

/**
 * 格式化日期
 */
export const formatDate = (dateString, format = "YYYY-MM-DD") => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return format
    .replace("YYYY", year)
    .replace("MM", month)
    .replace("DD", day);
};

/**
 * 计算年龄
 */
export const calculateAge = (birthday) => {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * 截断文本
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

/**
 * 防抖函数
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * 节流函数
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
