function getType(type) {
  return function checkType(value) {
    return Object.prototype.toString.call(value).slice(8, -1) === type;
  };
}

export const isArray = getType("Array");
export const isObject = getType("Object");
export const isString = getType("String");
export const isNumber = getType("Number");
export const isNull = getType("Null");
export const isUndefined = getType("Undefined");

export function isEmpty(value) {
  if (isNull(value) || isUndefined(value)) {
    return true;
  }

  let normalized = value;
  if (isNumber(normalized)) {
    normalized = String(normalized);
  }

  return normalized.length < 1;
}

export default {
  isArray,
  isObject,
  isString,
  isNumber,
  isNull,
  isUndefined,
  isEmpty,
};
