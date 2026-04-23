export function oneZeroToBool(value) {
  if (value === void 0) return false;
  if (typeof value === "boolean") return value;

  let normalized = value;
  if (typeof normalized === "string") {
    normalized = Number(normalized);
  }

  return normalized === 1;
}

export function boolToOneZero(value) {
  if (value === void 0) return "0";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return value ? "1" : "0";
}

export default {
  oneZeroToBool,
  boolToOneZero,
};
